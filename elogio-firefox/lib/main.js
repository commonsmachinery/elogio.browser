'use strict';


const { defer }  = require('sdk/core/promise');
const { all }  = require('sdk/core/promise');
var Elogio = require('./common-chrome-lib.js').Elogio;
Elogio.Q = {all: all, defer: defer};
new Elogio(['config', 'messaging', 'bridge', 'elogioRequest', 'elogioServer', 'utils', 'mainScriptHelper'], function (modules) {
    // FF modules
    Elogio._ = require('sdk/l10n').get;
    var buttons = require('sdk/ui/button/action'),
        pageMod = require("sdk/page-mod"),
        self = require('sdk/self'),
        tabs = require('sdk/tabs'),
        simplePrefs = require("sdk/simple-prefs"),
        Sidebar = require("sdk/ui/sidebar").Sidebar,
        clipboard = require("sdk/clipboard"),
        errorIndicator = self.data.url("img/error.png"),
        elogioIcon = self.data.url("img/icon-72.png"),
        elogioDisableIcon = self.data.url("img/icon-72-disabled.png"),
        contextMenu = require("sdk/context-menu");
    // Elogio Modules
    var bridge = modules.getModule('bridge'),
        mainScriptHelper = modules.getModule('mainScriptHelper'),
        config = modules.getModule('config'),
        utils = modules.getModule('utils'),
        elogioServer = modules.getModule('elogioServer');
    var elogioSidebar, sidebarIsHidden = true, scrollToImageCard = null, currentTab,
        appState = new Elogio.ApplicationStateController(),
        pluginState = {
            isEnabled: false
        };


    /*
     =======================
     PRIVATE MEMBERS
     =======================
     */
    function notifyPluginState(destination) {
        if (pluginState.isEnabled) {
            (destination || bridge).emit(bridge.events.pluginActivated);
        } else {
            (destination || bridge).emit(bridge.events.pluginStopped);
        }
    }

    function pluginStop() {
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
    }

    function pluginOn() {
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
    }

    /**
     * This method needs to register all listeners of sidebar
     * @param bridge - it's a worker.port of sidebar
     */
    function registerSidebarEventListeners() {
        bridge.on(bridge.events.onImageAction, function (uuid) {
            var tabState = appState.getTabState(tabs.activeTab.id),
                contentWorker = tabState.getWorker();
            if (contentWorker) {
                contentWorker.port.emit(bridge.events.onImageAction, uuid);
            }
        });
        bridge.on(bridge.events.feedBackMessage, function (message) {
            var tabState = appState.getTabState(tabs.activeTab.id),
                contentWorker = tabState.getWorker();
            contentWorker.port.emit(bridge.events.feedBackMessage, message);
        });
        bridge.on(bridge.events.copyToClipBoard, function (request) {
            var clipboardData = request.data;
            clipboard.set(clipboardData, request.type);
        });
        bridge.on(bridge.events.oembedRequestRequired, function (imageObj) {

            var tabState = appState.getTabState(tabs.activeTab.id),
                contentWorker = tabState.getWorker();
            mainScriptHelper.oembedLookup(imageObj, tabState, function (image) {
                indicateError(image);
            }, contentWorker);
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
            pluginOn();
        });
        // When plugin is turned off we need to update state and notify content script
        bridge.on(bridge.events.pluginStopped, function () {
            pluginStop();
            indicateError();//and if tab has errors, then we turn off indicator with errors because plugin stopped
        });
        // When panel requires image details from server - perform request and notify panel on result
        bridge.on(bridge.events.imageDetailsRequired, function (imageObj) {
            var tabState = appState.getTabState(tabs.activeTab.id);
            mainScriptHelper.annotationsQuery(imageObj, tabState, function (image) {
                indicateError(image);
            });
        });
    }

    function toggleSidebar() {
        if (!sidebarIsHidden) {
            button.icon = elogioDisableIcon;
            button.label = Elogio._('pluginStateOff');
            pluginStop();
            elogioSidebar.hide();
        } else {
            button.icon = elogioIcon;
            button.label = Elogio._('pluginStateOn');
            elogioSidebar.show();
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
                button.label = Elogio._('pluginStateOn');
            } else {
                button.icon = errorIndicator;
                button.label = Elogio._('pluginGlobalError');
            }
        }
        if (imageObj && imageObj.error && !imageObj.noData) {
            tabState.putImageToStorage(imageObj);
            button.icon = errorIndicator;
            button.label = Elogio._('pluginGlobalError');
        }
        if (imageObj && imageObj.error && !sidebarIsHidden) {
            bridge.emit(bridge.events.newImageFound, imageObj);
        }
    }


    function loadApplicationPreferences() {
        var tabsState = appState.getAllTabState(), i, tabContentWorker;
        config.ui.imageDecorator.iconUrl = self.data.url('img/settings-icon.png');
        config.ui.highlightRecognizedImages = simplePrefs.prefs.highlightRecognizedImages;
        if (simplePrefs.prefs.serverUrl) {
            config.global.apiServer.serverUrl = simplePrefs.prefs.serverUrl;
        }
        config.global.locator.deepScan = simplePrefs.prefs.deepScan;
        bridge.emit(bridge.events.configUpdated, config);
        for (i = 0; i < tabsState.length; i += 1) {
            tabContentWorker = tabsState[i].getWorker();
            if (tabContentWorker && tabContentWorker.port) {
                tabContentWorker.port.emit(bridge.events.configUpdated, config);
            }
        }
    }

    function setupLocale() {
        var locale = utils.initLocale();
        bridge.emit(bridge.events.l10nSetupLocale, locale);
    }

    function contextMenuItemClicked(uuid) {
        if (currentTab === tabs.activeTab) {
            if (sidebarIsHidden) {
                // at first we set 'scrollToImageCard', which needs for send to panel when panel will shows up
                scrollToImageCard = uuid;
                elogioSidebar.show();
            } else {
                // if panel already open then just send image to it
                if (uuid) {
                    bridge.emit(bridge.events.onImageAction, uuid);
                }
            }
        }
    }

    /**
     * CONTEXT MENU
     */
    contextMenu.Item({
        label: Elogio._('contextMenuItem_01'),
        context: [contextMenu.SelectorContext('*')],
        contentScriptFile: [self.data.url("js/context-menu.js")],
        onMessage: contextMenuItemClicked
    });


    /**
     * CREATE SIDEBAR
     */
    elogioSidebar = Sidebar({
        id: 'elogio-firefox-plugin',
        title: Elogio._('sidebarTitle'),
        url: self.data.url("html/panel.html"),
        onReady: function (worker) {
            pluginState.isEnabled = true;
            bridge.registerClient(worker.port);
            sidebarIsHidden = false;
            notifyPluginState();
            // Update config with settings from the Preferences module
            loadApplicationPreferences();
            //after registration and loading preferences we need to register all listeners of sidebar
            registerSidebarEventListeners();
            // ... and subscribe for upcoming changes
            simplePrefs.on('', loadApplicationPreferences);
            // Load content in sidebar if possible
            if (pluginState.isEnabled) {
                setupLocale();
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
            button.icon = elogioDisableIcon;
            sidebarIsHidden = true;
        }
    });
    /**
     * PAGE ON ATTACH
     */
    pageMod.PageMod({
        include: "*",
        contentStyleFile: [self.data.url("css/content.css"), self.data.url("css/contextMenu.css")],
        contentScriptFile: [self.data.url("js/common-lib.js"), self.data.url("js/content-script.js")],
        contentScriptWhen: "ready",
        attachTo: 'top',
        onAttach: function (contentWorker) {
            currentTab = contentWorker.tab;
            var
                tabState = appState.getTabState(currentTab.id);
            tabState.clearImageStorage();
            tabState.clearLookupImageStorage();
            tabState.attachWorker(contentWorker);
            //send template as string
            contentWorker.port.on(bridge.events.feedbackTemplateRequired, function () {
                elogioServer.getFeedbackTemplate(self.data.url('html/feedbackWindow.html'), function (response) {
                    contentWorker.port.emit(bridge.events.feedbackTemplateRequired, response);
                });
            });
            contentWorker.port.on(bridge.events.feedBackMessage, function (message) {
                if (message.type === 'submit') {
                    mainScriptHelper.feedbackSubmit(message.data, function (response) {
                        contentWorker.port.emit(bridge.events.feedBackMessage, {
                            type: 'response',
                            response: {status: response.status, text: response.text}
                        });
                    }, function (response) {
                        console.error('Response from doorbell.io with errors');
                        contentWorker.port.emit(bridge.events.feedBackMessage, {
                            type: 'response',
                            response: {status: response.status, text: response.text}
                        });
                    });
                } else {
                    contentWorker.port.emit(bridge.events.feedBackMessage, message);
                }
            });
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
                    mainScriptHelper.lookupQuery(tabState.getImagesFromLookupStorage(), tabState, function (image) {
                        indicateError(image);
                    }, contentWorker);
                    appState.getTabState(contentWorker.tab.id).clearLookupImageStorage();
                }
            });
            //when hash calculated then send hash lookup request
            contentWorker.port.on(bridge.events.hashCalculated, function (imageObj) {
                mainScriptHelper.hashLookupQuery(imageObj, tabState, function (image) {
                    indicateError(image);
                }, contentWorker);
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
                        mainScriptHelper.lookupQuery(tabState.getImagesFromLookupStorage(), tabState, function (image) {
                            indicateError(image);
                        }, contentWorker);
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
            contentWorker.port.on(bridge.events.onImageAction, contextMenuItemClicked);
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
        label: Elogio._('pluginStateOn'),
        icon: elogioDisableIcon,
        onClick: function () {
            toggleSidebar();
        }
    });
    //first run
    if (simplePrefs.prefs.firstRun) {
        tabs.open('http://elog.io/');
        toggleSidebar();
        simplePrefs.prefs.firstRun = false;
    }
});