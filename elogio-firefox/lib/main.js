'use strict';
var Elogio = require('./common-chrome-lib.js').Elogio;

new Elogio(['config', 'bridge', 'utils', 'elogioServer'], function (modules) {
    // FF modules
    var buttons = require('sdk/ui/button/action'),
        pageMod = require("sdk/page-mod"),
        self = require('sdk/self'),
        tabs = require('sdk/tabs'),
        Sidebar = require("sdk/ui/sidebar").Sidebar;

    // Elogio Modules
    var bridge = modules.getModule('bridge'),
        elogioServer = modules.getModule('elogioServer'),
        config = modules.getModule('config');

    var sidebarWorker, elogioSidebar, tabPageProcessingState = [],pageProcessingIsFinished,
        imageStorage = {},
        pluginState = {
            isEnabled: true
        };

    /*
     =======================
     PRIVATE MEMBERS
     =======================
     */


    function findImageInStorage(tabId, uuid) {
        var storage = imageStorage[tabId], i;
        if (!storage) {
            return false;
        }
        for (i = 0; i < storage.length; i += 1) {
            if (storage[i].uuid === uuid) {
                return storage[i];
            }
        }
        return false;
    }

    function notifyPluginState(destination) {
        if (pluginState.isEnabled) {
            destination.emit(bridge.events.pluginActivated);
        } else {
            destination.emit(bridge.events.pluginStopped);
        }
    }

    // Update config
    config.ui.imageDecorator.iconUrl = self.data.url('img/settings-icon.png');

    // Create sidebar
    elogioSidebar = Sidebar({
        id: 'elogio-firefox-plugin',
        title: 'Elog.io Image Catalog',
        url: self.data.url("html/panel.html"),
        onAttach: function (worker) {
            bridge.registerClient(worker.port);
            sidebarWorker = worker;
        }
    });

    pageMod.PageMod({
        include: "*",
        contentScriptFile: [self.data.url("js/common-lib.js"), self.data.url("js/content-script.js")],
        contentScriptWhen: "ready",
        attachTo: 'top',
        onAttach: function (contentWorker) {
            function lookupQuery() {
                elogioServer.lookupQuery(lookupImageObjStorage,
                    function (lookupJson) {
                        bridge.emit(bridge.events.lookupReceived, lookupJson);
                    },
                    function () {
                        //TODO: Implement on error handler!
                    }
                );
                lookupImageObjStorage = {uri:[]};//cleanup uris
            }
            var currentTab = contentWorker.tab;
            var lookupImageObjStorage = {uri:[]};
            contentWorker.port.emit(bridge.events.configUpdated, config);
            //when page processing is finished then we need remember it for current tab
            contentWorker.port.on(bridge.events.pageProcessingFinished,function(){
                tabPageProcessingState[currentTab.id]=true;
                pageProcessingIsFinished=true;
            });
            contentWorker.port.on(bridge.events.newImageFound, function (imageObject) {
                var imageStorageForTab = imageStorage[currentTab.id];
                imageStorageForTab[imageStorageForTab.length] = imageObject;
                if (currentTab === tabs.activeTab) {
                    //if image was found then we need to check if lookup storage is ready for query
                    if (lookupImageObjStorage.length >= config.global.apiServer.requestPerImages||tabPageProcessingState[currentTab.id]) {
                        lookupQuery();
                    }
                    lookupImageObjStorage.uri.push(imageObject.uri);
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
                imageStorage[tabs.activeTab.id] = [];
                lookupImageObjStorage={uri:[]};//cleanup and initialize uri storage before start
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
                if (pluginState.isEnabled) {
                    pluginState.isEnabled = false;
                    imageStorage = []; // Cleanup local storage
                    notifyPluginState(contentWorker.port);
                    notifyPluginState(bridge);
                }
            });
            // When panel requires image details from server - perform request and notify panel on result
            bridge.on(bridge.events.imageDetailsRequired, function (imageObj) {
                elogioServer.getAnnotationsForImage(imageObj.uri,
                    function (annotationsJson) {
                        var imageObjFromStorage = findImageInStorage(currentTab.id, imageObj.uuid);
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
        if (imageStorage[tab.id]) {
            delete imageStorage[tab.id];
        }
        if (tabPageProcessingState[tab.id]) {
            delete  tabPageProcessingState[tab.id];
        }
    });

    tabs.on('activate', function (tab) {
        var images = imageStorage[tabs.activeTab.id];
        // remember the state page processing of this tab
        pageProcessingIsFinished=tabPageProcessingState[tab.id]||false;
        bridge.emit(bridge.events.tabSwitched, images || []);
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