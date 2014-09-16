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
    var bridge       = modules.getModule('bridge'),
        elogioServer = modules.getModule('elogioServer'),
        config       = modules.getModule('config');

    var sidebarWorker, elogioSidebar,
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
        if (!storage) return false;
        for (i = 0; i<storage.length; i += 1) {
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
            var currentTab = contentWorker.tab;
            contentWorker.port.emit(bridge.events.configUpdated, config);
            contentWorker.port.on(bridge.events.newImageFound, function(imageObject) {
                var imageStorageForTab = imageStorage[currentTab.id];
                imageStorageForTab[imageStorageForTab.length] = imageObject;
                if (currentTab === tabs.activeTab) {
                    bridge.emit(bridge.events.newImageFound, imageObject);
                }
            });
            // When user click on the elogio icon near the image
            contentWorker.port.on(bridge.events.onImageAction, function(imageObject) {
                if (currentTab === tabs.activeTab) {
                    bridge.emit(bridge.events.onImageAction, imageObject);
                }
            });
            // When user clicks on the image from the panel - proxy event to the content script
            bridge.on(bridge.events.onImageAction,function(imageObj){
                if (currentTab === tabs.activeTab) {
                    contentWorker.port.emit(bridge.events.onImageAction,imageObj);
                }
            });
            // Proxy startPageProcessing signal to content script
            bridge.on(bridge.events.startPageProcessing, function() {
                imageStorage[tabs.activeTab.id] = [];
                if (currentTab === tabs.activeTab) {
                    contentWorker.port.emit(bridge.events.startPageProcessing);
                }
            });
            // When plugin is turned on we need to update state and notify content script
            bridge.on(bridge.events.pluginActivated, function() {
                if (!pluginState.isEnabled) {
                    pluginState.isEnabled = true;
                    notifyPluginState(contentWorker.port);
                }
            });
            // When plugin is turned off we need to update state and notify content script
            bridge.on(bridge.events.pluginStopped, function() {
                if (pluginState.isEnabled) {
                    pluginState.isEnabled = false;
                    imageStorage = []; // Clenup local storage
                    notifyPluginState(contentWorker.port);
                }
            });
            // When panel requires image details from server - perform request and notify panel on result
            bridge.on(bridge.events.imageDetailsRequired, function(imageObj) {
                elogioServer.getAnnotationsForImage(imageObj.uri,
                    function(annotationsJson) {
                        var imageObjFromStorage = findImageInStorage(currentTab.id, imageObj.uuid);
                        if (imageObjFromStorage) {
                            imageObjFromStorage.details = annotationsJson;
                            bridge.emit(bridge.events.imageDetailsReceived, imageObjFromStorage);
                        } else {
                            console.log("Can't find image in storage: " + imageObj.uuid);
                        }
                    },
                    function() {
                        // TODO: Implement on error handler!
                    }
                )
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
    });

    tabs.on('activate', function (tab) {
        var images = imageStorage[tabs.activeTab.id];
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

(function () {

    var buttons = require('sdk/ui/button/action');
    var pageMod = require("sdk/page-mod");
    var data = require('sdk/self').data;
    var tabs = require('sdk/tabs');

    var activeTab = tabs.activateTab;
    var sidebarWorker = null;
    var imageStorage = {};
    var workersObject = {};
    var isExtensionEnabled = false;
    var sidebar = require("sdk/ui/sidebar").Sidebar({
        id: 'elogio-firefox-plugin',
        title: 'Elog.io Image Catalog',
        url: require("sdk/self").data.url("html/panel.html"),
        onAttach: function (worker) {
            sidebarWorker = worker;
            isExtensionEnabled = true;
            sidebarWorker.port.on("panelLoaded", function () {
                if (isExtensionEnabled) {
                    if (activeTab) {
                        sidebarWorker.port.emit('drawItems', imageStorage[activeTab.id]);
                    }
                } else {
                    sidebarWorker.port.emit('drawItems', []);
                }
            });
            sidebarWorker.port.on('addonSwitchOn', function () {
                if (activeTab) {
                    var workersArray = workersObject[activeTab.id];
                    for (var i = 0; i < workersArray.length; i++) {
                        workersArray[i].port.emit('extensionSwitchOn');
                    }
                }
                isExtensionEnabled = true;

            });
            sidebarWorker.port.on('addonSwitchOff', function () {
                var workersArray = workersObject[activeTab.id];
                for (var i = 0; i < workersArray.length; i++) {
                    workersArray[i].port.emit('extensionSwitchOff');
                }
                isExtensionEnabled = false;
            });
            sidebarWorker.port.on('getImageFromContent', function (inputId) {
                var workersOfTab = workersObject[activeTab.id];
                for (var i = 0; i < workersOfTab.length; i++) {
                    workersOfTab[i].port.emit('scrollToImageById', inputId);
                }
            });
        }
    });
    buttons.ActionButton({
        id: "elogio-button",
        label: "Get images",
        icon: data.url("img/icon-72.png"),
        onClick: function () {
            sidebar.show();
        }
    });

    function detachWorker(worker, workerArray) {
        var index = workerArray.indexOf(worker);
        if (index !== -1) {
            workerArray.splice(index, 1);
        }
    }

    pageMod.PageMod({
        include: "*",
        contentScriptFile: [data.url("js/common-lib.js"), data.url("js/content-script.js")],
        contentScriptWhen: "ready",
        attachTo: 'top',
        onAttach: function (worker) {
            var tabId = worker.tab.id;
            if (!workersObject[tabId]) {
                workersObject[tabId] = [];
            }
            activeTab = worker.tab;
            workersObject[tabId].push(worker);
            worker.on('detach', detachWorker.bind(null, worker, workersObject[worker.tab.id]));
            function imagesReceived(imagesFromPage) {
                if (imagesFromPage) {
                    if (!imageStorage[tabId]) {
                        imageStorage[tabId] = [];
                    }
                    imageStorage[tabId].push(imagesFromPage);
                    if (sidebarWorker && tabId === activeTab.id) {
                        sidebarWorker.port.emit('drawItems', imageStorage[tabId]);
                    }
                }
            }

            function getThePicture(uniqueId) {

                if (!sidebar.isShowing) {
                    sidebar.show();
                }
                if (sidebarWorker) {
                    sidebarWorker.port.emit('showPictureById', uniqueId);
                }
            }

            function onBeforeUnloadTopPage(tabId) {
                imageStorage[tabId] = null;
                if (tabId === activeTab.id) {
                    sidebarWorker.port.emit("drawItems", null);
                }
            }

            if (isExtensionEnabled) {
                worker.port.on("gotElement", imagesReceived.bind(worker));
                worker.port.on("onBeforeUnload", onBeforeUnloadTopPage.bind(null, tabId));
                worker.port.on("getPicture", getThePicture.bind(worker));
                worker.port.emit("getElement");
            }
        }
    });
    tabs.on('activate', function (tab) {
        activeTab = tab;
        if (sidebarWorker) {
            if (isExtensionEnabled) {
                sidebarWorker.port.emit('drawItems', imageStorage[activeTab.id]);
            }
        }
    });

    tabs.on('open', function (tab) {
        imageStorage[tab.id] = null;
    });

//if tab was closed the we need to remove all workers of this tab
    tabs.on('close', function (tab) {
        if (workersObject[tab.id]) {
            workersObject[tab.id] = null;
        }
        if (imageStorage[tab.id]) {
            imageStorage[tab.id] = null;
        }
    });
});