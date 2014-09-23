'use strict';
var Elogio = require('./common-chrome-lib.js').Elogio;

new Elogio(['config', 'bridge', 'utils', 'elogioServer'], function (modules) {
    // FF modules
    var buttons = require('sdk/ui/button/action'),
        pageMod = require("sdk/page-mod"),
        self = require('sdk/self'),
        tabs = require('sdk/tabs'),
        simplePrefs = require("sdk/simple-prefs"),
        Sidebar = require("sdk/ui/sidebar").Sidebar;

    // Elogio Modules
    var bridge = modules.getModule('bridge'),
        elogioServer = modules.getModule('elogioServer'),
        config = modules.getModule('config');

    var elogioSidebar, sidebarIsHidden = true,
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
            function () {
                //TODO: Implement on error handler!
            }
        );
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
        // Proxy startPageProcessing signal to content script
        bridge.on(bridge.events.startPageProcessing, function () {
            var tabState = appState.getTabState(tabs.activeTab.id),
                contentWorker = tabState.getWorker();
            tabState.clearImageStorage();
            tabState.clearLookupImageStorage();
            if (contentWorker) {
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
                    }
                }
                if (contentWorker) {
                    notifyPluginState(contentWorker.port);
                }
                notifyPluginState(bridge);
            }
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
                        bridge.emit(bridge.events.imageDetailsReceived, imageObjFromStorage);
                    } else {
                        console.log("Can't find image in storage: " + imageObj.uuid);
                    }
                },
                function () {
                    // TODO: Implement on error handler!
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

    function loadApplicationPreferences(changedPropertyName) {
        var tabsState = appState.getAllTabState(), i, tabContentWorker;
        config.ui.imageDecorator.iconUrl = self.data.url('img/settings-icon.png');
        config.ui.highlightRecognizedImages = simplePrefs.prefs.highlightRecognizedImages;
        bridge.emit(bridge.events.configUpdated, config);
        // TODO: Notify all content tab workers about changes
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
                var images = appState.getTabState(tabs.activeTab.id).getImagesFromStorage();
                if (images.length) {
                    bridge.emit(bridge.events.tabSwitched, images);
                } else {
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
            tabState.attachWorker(contentWorker);

            contentWorker.port.on(bridge.events.pageProcessingFinished, function () {
                //if page processing finished we need to check if all lookup objects were sent to Elog.io server
                if (tabState.getImagesFromLookupStorage().length > 0) {
                    lookupQuery(tabState.getImagesFromLookupStorage(), contentWorker);
                    appState.getTabState(contentWorker.tab.id).clearLookupImageStorage();
                }
            });
            //if some image was removed from DOM then we need to delete it at here too and send to panel onImageRemoved
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
                    //if image was found then we need to check if lookup storage is ready for query
                    if (tabState.getImagesFromLookupStorage().length >= config.global.apiServer.imagesPerRequest) {
                        lookupQuery(tabState.getImagesFromLookupStorage(), contentWorker);
                        tabState.clearLookupImageStorage();
                    }
                    tabState.putImageToLookupStorage(imageObject);
                    bridge.emit(bridge.events.newImageFound, imageObject);
                }
            });
            // When user click on the elogio icon near the image
            contentWorker.port.on(bridge.events.onImageAction, function (imageObject) {
                if (currentTab === tabs.activeTab) {
                    elogioSidebar.show();
                    sidebarIsHidden = false;
                    bridge.emit(bridge.events.onImageAction, imageObject);
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
            var images = appState.getTabState(tab.id).getImagesFromStorage();
            bridge.emit(bridge.events.tabSwitched, images);
        }
    });

    // Create UI Button
    buttons.ActionButton({
        id: "elogio-button",
        label: "Elog.io",
        icon: self.data.url("img/icon-72.png"),
        onClick: function () {
            toggleSidebar();
        }
    });
});