'use strict';
var Elogio = require('./common-chrome-lib.js').Elogio;

new Elogio(['config', 'bridge', 'utils', 'elogioServer'], function (modules) {
    // FF modules
    var buttons = require('sdk/ui/button/action'),
        pageMod = require("sdk/page-mod"),
        self = require('sdk/self'),
        tabs = require('sdk/tabs'),
        simplePrefs = require("sdk/simple-prefs"),
        Sidebar = require("sdk/ui/sidebar").Sidebar,
        clipboard = require("sdk/clipboard"),
        errorIndicator = self.data.url("img/error.png"),
        elogioIcon = self.data.url("img/icon-72.png"),
        elogioLabel = "Elog.io";

    // Elogio Modules
    var bridge = modules.getModule('bridge'),
        elogioServer = modules.getModule('elogioServer'),
        config = modules.getModule('config');

    var elogioSidebar, sidebarIsHidden = true, scrollToImageCard = null,
        appState = new Elogio.ApplicationStateController(),
        pluginState = {
            isEnabled: false
        };
    /*
     =======================
     PRIVATE MEMBERS
     =======================
     */

    /**
     * This method needs to send request to elogio server, and sends to panel imageObj with or without lookup data;
     * @param lookupImageObjStorage - it's imageObj storage for lookup request
     * @param contentWorker
     */
    function lookupQuery(lookupImageObjStorage, contentWorker) {
        var localStore = lookupImageObjStorage,
            dictionary = {uri: []},
            tabState = appState.getTabState(contentWorker.tab.id);
        //create dictionary
        for (var i = 0; i < localStore.length; i++) {
            dictionary.uri.push(localStore[i].uri);
        }
        elogioServer.lookupQuery(dictionary,
            function (lookupJson) {
                for (var i = 0; i < localStore.length; i++) {
                    var existsInResponse = false,
                        imageFromStorage = tabState.findImageInStorageByUuid(localStore[i].uuid);
                    // If image doesn't exist in local storage anymore - there is no sense to process it
                    if (!imageFromStorage) {
                        continue;
                    }
                    // Find image from our query in JSON.
                    for (var j = 0; j < lookupJson.length; j++) {
                        if (imageFromStorage.uri === lookupJson[j].uri) {
                            if (existsInResponse) {// if we found first lookup json object then cancel loop
                                break;
                            }
                            existsInResponse = true;
                            // Extend data ImageObject with lookup data and save it
                            imageFromStorage.lookup = lookupJson[j];
                            bridge.emit(bridge.events.newImageFound, imageFromStorage);
                            contentWorker.port.emit(bridge.events.newImageFound, imageFromStorage);
                        }
                    }
                    // If it doesn't exist - assume it doesn't exist on server
                    if (!existsInResponse) {
                        imageFromStorage.lookup = false;
                        bridge.emit(bridge.events.newImageFound, imageFromStorage);
                    }
                }
            },
            function (response) {
                for (var i = 0; i < localStore.length; i++) {
                    var imageFromStorage = tabState.findImageInStorageByUuid(localStore[i].uuid);
                    // If image doesn't exist in local storage anymore - there is no sense to process it
                    if (!imageFromStorage) {
                        continue;
                    }
                    imageFromStorage.error = getTextStatusByStatusCode(response.status);
                    indicateError(imageFromStorage);
                }
            }
        );
    }

    function getTextStatusByStatusCode(statusCode) {
        switch (statusCode) {
            case 200:
                return config.errors.requestError;
            case 0:
                return 'Network communication error';
            default:
                return 'Internal server error';
        }
    }

    /**
     * This method needs to register all listeners of sidebar
     * @param bridge - it's a worker.port of sidebar
     */
    function registerSidebarEventListeners(bridge) {
        bridge.on(bridge.events.onImageAction, function (imageObj) {
            var tabState = appState.getTabState(tabs.activeTab.id),
                contentWorker = tabState.getWorker();
            if (contentWorker) {
                contentWorker.port.emit(bridge.events.onImageAction, imageObj);
            }
        });
        bridge.on(bridge.events.copyToClipBoard, function (textHTML) {
            clipboard.set(textHTML, 'html');
        });
        bridge.on(bridge.events.hashRequired, function (imageObj) {
            var tabState = appState.getTabState(tabs.activeTab.id),
                contentWorker = tabState.getWorker();
            if (contentWorker) {
                contentWorker.port.emit(bridge.events.hashRequired, imageObj);
            }
        });
        // Proxy startPageProcessing signal to content script
        bridge.on(bridge.events.startPageProcessing, function () {
            var tabState = appState.getTabState(tabs.activeTab.id),
                contentWorker = tabState.getWorker();
            tabState.clearImageStorage();
            tabState.clearLookupImageStorage();
            if (contentWorker) {
                indicateError();//when page processing started we turn off error indicator
                //at first we need to tell content script about state of plugin
                notifyPluginState(contentWorker.port);
                contentWorker.port.emit(bridge.events.startPageProcessing);
            }
        });
        // When plugin is turned on we need to update state and notify content script
        bridge.on(bridge.events.pluginActivated, function () {
            var tabState = appState.getTabState(tabs.activeTab.id),
                contentWorker = tabState.getWorker();
            if (!pluginState.isEnabled) {
                pluginState.isEnabled = true;
                tabState.clearImageStorage();
                tabState.clearLookupImageStorage();//cleanup and initialize uri storage before start
                notifyPluginState(bridge);
                if (contentWorker) {
                    contentWorker.port.emit(bridge.events.configUpdated, config);
                    notifyPluginState(contentWorker.port);
                    bridge.emit(bridge.events.startPageProcessing);
                }
            }
        });
        // When plugin is turned off we need to update state and notify content script
        bridge.on(bridge.events.pluginStopped, function () {
            var tabState = appState.getTabState(tabs.activeTab.id),
                contentWorker = tabState.getWorker();
            var tabStates, i;
            if (pluginState.isEnabled) {
                pluginState.isEnabled = false;
                // Cleanup local storage
                tabStates = appState.getAllTabState();
                if (tabStates) {
                    for (i = 0; i < tabStates.length; i += 1) {
                        tabStates[i].clearImageStorage();
                        tabStates[i].clearLookupImageStorage();
                    }
                }
                if (contentWorker) {
                    notifyPluginState(contentWorker.port);
                }
                notifyPluginState(bridge);
            }
            indicateError();//and if tab has errors, then we turn off indicator with errors because plugin stopped
        });
        // When panel requires image details from server - perform request and notify panel on result
        bridge.on(bridge.events.imageDetailsRequired, function (imageObj) {
            var tabState = appState.getTabState(tabs.activeTab.id);
            elogioServer.annotationsQuery(imageObj.lookup.href,
                function (annotationsJson) {
                    var imageObjFromStorage = tabState
                        .findImageInStorageByUuid(imageObj.uuid);
                    if (imageObjFromStorage) {
                        imageObjFromStorage.details = annotationsJson;
                        delete imageObjFromStorage.error;//if error already exist in this image then delete it
                        indicateError();
                        bridge.emit(bridge.events.imageDetailsReceived, imageObjFromStorage);
                    } else {
                        console.log("Can't find image in storage: " + imageObj.uuid);
                    }
                },
                function (response) {
                    //put error to storage
                    imageObj.error = getTextStatusByStatusCode(response.status);
                    indicateError(imageObj);
                }
            );
        });
    }

    function toggleSidebar() {
        if (!sidebarIsHidden) {
            elogioSidebar.hide();
        } else {
            elogioSidebar.show();
        }
    }

    function notifyPluginState(destination) {
        if (pluginState.isEnabled) {
            destination.emit(bridge.events.pluginActivated);
        } else {
            destination.emit(bridge.events.pluginStopped);
        }
    }

    /**
     * toggle icon and label of action button, also send image with error message in.
     * if this method calls without params then error indicator disappear from button
     * @param imageObj - image which contains error message
     */
    function indicateError(imageObj) {
        var tabState = appState.getTabState(tabs.activeTab.id);
        if (!imageObj) { //indicator if has errors then draw indicator on button
            if (!tabState.hasErrors()) {
                button.icon = elogioIcon;
                button.label = elogioLabel;
            } else {
                button.icon = errorIndicator;
                button.label = 'Something is wrong... Check Elog.io sidebar for details';
            }
        }
        if (imageObj && imageObj.error) {
            tabState.putImageToStorage(imageObj);
            button.icon = errorIndicator;
            button.label = 'Something is wrong... Check Elog.io sidebar for details';
            if (!sidebarIsHidden) {
                bridge.emit(bridge.events.newImageFound, imageObj);
            }
        }
    }


    function loadApplicationPreferences() {
        var tabsState = appState.getAllTabState(), i, tabContentWorker;
        config.ui.imageDecorator.iconUrl = self.data.url('img/settings-icon.png');
        config.ui.highlightRecognizedImages = simplePrefs.prefs.highlightRecognizedImages;
        config.global.locator.deepScan = simplePrefs.prefs.deepScan;
        bridge.emit(bridge.events.configUpdated, config);
        for (i = 0; i < tabsState.length; i += 1) {
            tabContentWorker = tabsState[i].getWorker();
            if (tabContentWorker && tabContentWorker.port) {
                tabContentWorker.port.emit(bridge.events.configUpdated, config);
            }
        }
    }

    // Create sidebar
    elogioSidebar = Sidebar({
        id: 'elogio-firefox-plugin',
        title: 'Elog.io Image Catalog',
        url: self.data.url("html/panel.html"),
        onReady: function (worker) {
            pluginState.isEnabled = true;
            bridge.registerClient(worker.port);
            sidebarIsHidden = false;
            // Update config with settings from the Preferences module
            loadApplicationPreferences();
            //after registration and loading preferences we need to register all listeners of sidebar
            registerSidebarEventListeners(bridge);
            // ... and subscribe for upcoming changes
            simplePrefs.on('', loadApplicationPreferences);
            notifyPluginState(bridge);
            // Load content in sidebar if possible
            if (pluginState.isEnabled) {
                var tabState = appState.getTabState(tabs.activeTab.id),
                    images = tabState.getImagesFromStorage();
                if (images.length) {
                    //if need scroll to element then we do it
                    if (scrollToImageCard) {
                        bridge.emit(bridge.events.tabSwitched, {images: images, imageCardToOpen: scrollToImageCard});
                        scrollToImageCard = null;
                    } else {
                        bridge.emit(bridge.events.tabSwitched, {images: images});
                    }
                } else {
                    //if storage doesn't contains any image
                    bridge.emit(bridge.events.startPageProcessing);
                }
            }
        },
        onDetach: function () {
            sidebarIsHidden = true;
        }
    });

    pageMod.PageMod({
        include: "*",
        contentStyleFile: [self.data.url("css/highlight.css")],
        contentScriptFile: [self.data.url("js/common-lib.js"), self.data.url("js/content-script.js")],
        contentScriptWhen: "ready",
        attachTo: 'top',
        onAttach: function (contentWorker) {
            var currentTab = contentWorker.tab,
                tabState = appState.getTabState(currentTab.id);
            tabState.clearImageStorage();
            tabState.clearLookupImageStorage();
            tabState.attachWorker(contentWorker);
            //if page from cache then we need to save it to tabState
            currentTab.on("pageshow", function (tab, isPersisted) {
                var tabState = appState.getTabState(tab.id);
                if (isPersisted) {
                    tabState.isPageHidden(true);
                } else {
                    tabState.isPageHidden(false);
                }
            });
            contentWorker.port.on(bridge.events.pageProcessingFinished, function () {
                // if page processing finished then we need to check if all lookup objects were sent to Elog.io server
                if (tabState.getImagesFromLookupStorage().length > 0) {
                    lookupQuery(tabState.getImagesFromLookupStorage(), contentWorker);
                    appState.getTabState(contentWorker.tab.id).clearLookupImageStorage();
                }
            });
            //when hash calculated then send hash lookup request
            contentWorker.port.on(bridge.events.hashCalculated, function (imageObj) {
                var imageObjFromStorage = tabState
                    .findImageInStorageByUuid(imageObj.uuid);
                if (!imageObj.error) {
                    imageObjFromStorage.hash = imageObj.hash;
                    elogioServer.hashLookupQuery(imageObjFromStorage.hash, function (json) {
                        if (Array.isArray(json) && json.length > 0) {
                            imageObjFromStorage.lookup = json[0];
                            bridge.emit(bridge.events.newImageFound, imageObjFromStorage);//send message when lookup received
                            contentWorker.port.emit(bridge.events.newImageFound, imageObjFromStorage);//and content script too (for decorate)
                            //it means, what we need details, because user click on 'query to elog.io'
                            bridge.emit(bridge.events.imageDetailsRequired, imageObjFromStorage);
                        } else {
                            //if we get an empty array, that's mean what no data for this image
                            imageObjFromStorage.error = config.errors.noDataForImage;
                            indicateError(imageObjFromStorage);
                        }
                    }, function (response) {
                        imageObjFromStorage.error = getTextStatusByStatusCode(response.status);
                        indicateError(imageObjFromStorage);
                    });
                } else {
                    //if we get error when using blockhash
                    imageObjFromStorage.error = config.errors.noDataForImage;
                    indicateError(imageObjFromStorage);
                }
            });

            // if some image was removed from DOM then we need to delete it at here too and send to panel onImageRemoved
            contentWorker.port.on(bridge.events.onImageRemoved, function (uuid) {
                var tabState = appState.getTabState(currentTab.id);
                bridge.emit(bridge.events.onImageRemoved, uuid);
                tabState.removeImageFromStorageByUuid(uuid);
            });

            contentWorker.port.on(bridge.events.newImageFound, function (imageObject) {
                var tabState = appState.getTabState(currentTab.id);
                // Maybe we already have image with this URL in storage?
                if (tabState.findImageInStorageByUrl(imageObject.uri)) {
                    return;
                }
                tabState.putImageToStorage(imageObject);
                if (currentTab === tabs.activeTab) {
                    // if image was found then we need to check if lookup storage is ready for query
                    if (tabState.getImagesFromLookupStorage().length >= config.global.apiServer.imagesPerRequest) {
                        lookupQuery(tabState.getImagesFromLookupStorage(), contentWorker);
                        tabState.clearLookupImageStorage();
                    }
                    tabState.putImageToLookupStorage(imageObject);
                    bridge.emit(bridge.events.newImageFound, imageObject);
                }
            });
            //if event from content received and current page is from cache then we need to undecorate all images and start page processing from scratch
            contentWorker.port.on(bridge.events.pageShowEvent, function () {
                var tabState = appState.getTabState(currentTab.id);
                if (tabState.isPageHidden()) {
                    tabState.attachWorker(contentWorker);//reattach worker
                    this.emit(bridge.events.pageShowEvent);//undecorate all images on the page
                    if (!sidebarIsHidden) {
                        bridge.emit(bridge.events.startPageProcessing);//start page processing from scratch
                    } else {
                        //if tab is hidden then we need send emit to content by self
                        tabState.clearImageStorage();
                        tabState.clearLookupImageStorage();
                        this.emit(bridge.events.startPageProcessing);
                    }
                }
            });
            // When user click on the elogio icon near the image
            contentWorker.port.on(bridge.events.onImageAction, function (imageObject) {
                if (currentTab === tabs.activeTab) {
                    if (sidebarIsHidden) {
                        // at first we set 'scrollToImageCard', which needs for send to panel when panel will shows up
                        scrollToImageCard = imageObject;
                        elogioSidebar.show();
                    } else {
                        // if panel already open then just send image to it
                        bridge.emit(bridge.events.onImageAction, imageObject);
                    }
                }
            });
            //this code we need to do only if plugin is active
            if (pluginState.isEnabled) {
                contentWorker.port.emit(bridge.events.configUpdated, config);
                //when content script attached to page we need to start scan the page
                bridge.emit(bridge.events.startPageProcessing);
            }
        }
    });

    tabs.on('close', function (tab) {
        appState.dropTabState(tab.id);
    });
    tabs.on('activate', function (tab) {
        if (pluginState.isEnabled) {
            var tabState = appState.getTabState(tab.id);
            var images = tabState.getImagesFromStorage();
            indicateError();//if we call without params then method just indicate: tab has errors or return initial state to button
            bridge.emit(bridge.events.tabSwitched, {images: images});
        }
    });
    // Create UI Button
    var button = buttons.ActionButton({
        id: "elogio-button",
        label: elogioLabel,
        icon: elogioIcon,
        onClick: function () {
            toggleSidebar();
        }
    });
});