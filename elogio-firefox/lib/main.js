'use strict';
var Elogio = require('./common-chrome-lib.js').Elogio;

new Elogio(['config', 'bridge', 'utils', 'elogioServer'], function (modules) {
    // FF modules
    var buttons = require('sdk/ui/button/action'),
        pageMod = require("sdk/page-mod"),
        self = require('sdk/self'),
        tabs = require('sdk/tabs'),
        prefs = require("sdk/simple-prefs").prefs,
        Sidebar = require("sdk/ui/sidebar").Sidebar;

    // Elogio Modules
    var bridge = modules.getModule('bridge'),
        elogioServer = modules.getModule('elogioServer'),
        config = modules.getModule('config');

    var elogioSidebar,
        appState = new Elogio.ApplicationStateController(),
        pluginState = {
            isEnabled: true
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

    function notifyPluginState(destination) {
        if (pluginState.isEnabled) {
            destination.emit(bridge.events.pluginActivated);
        } else {
            destination.emit(bridge.events.pluginStopped);
        }
    }

    function loadApplicationPreferences(changedPropertyName) {
        var tabsState = appState.getAllTabState(), i, tabWorker;
        config.ui.imageDecorator.iconUrl = self.data.url('img/settings-icon.png');
        config.ui.highlightRecognizedImages = prefs.highlightRecognizedImages;
        bridge.emit(bridge.events.configUpdated, config);
        // TODO: Notify all content tab workers about changes
        for (i =0; i < tabsState.length; i += 1) {
            tabWorker = tabsState[i].getWorker();
            if (tabWorker) {
                tabWorker.emit(bridge.events.configUpdated, config);
            }
        }
    }

    // Create sidebar
    elogioSidebar = Sidebar({
        id: 'elogio-firefox-plugin',
        title: 'Elog.io Image Catalog',
        url: self.data.url("html/panel.html"),
        onAttach: function (worker) {
            bridge.registerClient(worker.port);
            // Update config with settings from the Preferences module
            loadApplicationPreferences();
            // ... and subscribe for upcoming changes
            prefs.on('', loadApplicationPreferences);
        }
    });

    pageMod.PageMod({
        include: "*",
        contentScriptFile: [self.data.url("js/common-lib.js"), self.data.url("js/content-script.js")],
        contentScriptWhen: "ready",
        attachTo: 'top',
        onAttach: function (contentWorker) {
            var currentTab = contentWorker.tab;
            appState.getTabState(currentTab.id).attachWorker(contentWorker);
            var lookupImageObjStorage = [];
            contentWorker.port.emit(bridge.events.configUpdated, config);
            contentWorker.port.on(bridge.events.pageProcessingFinished, function () {
                //if page processing finished we need to check if all lookup objects were sent to Elog.io server
                if (lookupImageObjStorage.length > 0) {
                    lookupQuery(lookupImageObjStorage, contentWorker);
                    lookupImageObjStorage = [];
                }
            });
            contentWorker.port.on(bridge.events.newImageFound, function (imageObject) {
                appState.getTabState(currentTab.id).putImageToStorage(imageObject);
                if (currentTab === tabs.activeTab) {
                    //if image was found then we need to check if lookup storage is ready for query
                    if (lookupImageObjStorage.length >= config.global.apiServer.requestPerImages) {
                        lookupQuery(lookupImageObjStorage, contentWorker);
                        lookupImageObjStorage = [];
                    }
                    lookupImageObjStorage.push(imageObject);
                    bridge.emit(bridge.events.newImageFound, imageObject);
                }
            });
            // When user click on the elogio icon near the image
            contentWorker.port.on(bridge.events.onImageAction, function (imageObject) {
                if (currentTab === tabs.activeTab) {
                    bridge.emit(bridge.events.onImageAction, imageObject);
                }
            });
            // When user clicks on the image from the panel - proxy event to the content script
            bridge.on(bridge.events.onImageAction, function (imageObj) {
                if (currentTab === tabs.activeTab) {
                    contentWorker.port.emit(bridge.events.onImageAction, imageObj);
                }
            });
            // Proxy startPageProcessing signal to content script
            bridge.on(bridge.events.startPageProcessing, function () {
                appState.getTabState(tabs.activeTab.id).clearImageStorage();
                lookupImageObjStorage = [];//cleanup and initialize uri storage before start
                if (currentTab === tabs.activeTab) {
                    contentWorker.port.emit(bridge.events.startPageProcessing);
                }
            });
            // When plugin is turned on we need to update state and notify content script
            bridge.on(bridge.events.pluginActivated, function () {
                if (!pluginState.isEnabled) {
                    pluginState.isEnabled = true;
                    contentWorker.port.emit(bridge.events.startPageProcessing);
                    notifyPluginState(bridge);
                }
            });
            // When plugin is turned off we need to update state and notify content script
            bridge.on(bridge.events.pluginStopped, function () {
                var tabStates, i;
                if (pluginState.isEnabled) {
                    pluginState.isEnabled = false;
                    // Cleanup local storage
                    tabStates = appState.getAllTabState();
                    for (i = 0; i < tabStates.length; i += 1) {
                        tabStates[i].clearImageStorage();
                    }
                    notifyPluginState(contentWorker.port);
                    notifyPluginState(bridge);
                }
            });
            // When panel requires image details from server - perform request and notify panel on result
            bridge.on(bridge.events.imageDetailsRequired, function (imageObj) {
                elogioServer.annotationsQuery(imageObj.lookup.href,
                    function (annotationsJson) {
                        console.log(annotationsJson);
                        var imageObjFromStorage = appState.getTabState(currentTab.id)
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
            // Notify panel about current plugin state
            notifyPluginState(bridge);
            // Notify content script about current plugin state
            notifyPluginState(contentWorker.port);
        }
    });

    tabs.on('close', function (tab) {
        appState.dropTabState(tab.id);
    });

    tabs.on('activate', function (tab) {
        var images = appState.getTabState(tab.id).getImagesFromStorage();
        bridge.emit(bridge.events.tabSwitched, images);
    });

    // Create UI Button
    buttons.ActionButton({
        id: "elogio-button",
        label: "Elog.io",
        icon: self.data.url("img/icon-72.png"),
        onClick: function () {
            elogioSidebar.show();
        }
    });
});