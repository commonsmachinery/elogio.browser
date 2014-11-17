/**
 * Created by TEMA on 03.10.2014.
 */
(function () {
    'use strict';
    new Elogio(['config', 'messaging', 'bridge', 'utils', 'elogioRequest', 'elogioServer', 'mainScriptHelper'], function (modules) {
        Elogio._ = chrome.i18n.getMessage;
        var bridge = modules.getModule('bridge'),
            config = modules.getModule('config'),
            elogioLabel = Elogio._('pluginStateOn'),
            elogioDisabledIcon = 'img/icon_19_disabled.png',
            elogioErrorIcon = 'img/icon_19_error.png',
            mainScriptHelper = modules.getModule('mainScriptHelper'),
            elogioIcon = 'img/icon_19.png',
            events = bridge.events;


        function loadPreferences() {
            chrome.storage.sync.get('deepScan', function (data) {
                config.global.locator.deepScan = data.deepScan || config.global.locator.deepScan;
            });
            chrome.storage.sync.get('highlightRecognizedImages', function (data) {
                config.ui.highlightRecognizedImages = data.highlightRecognizedImages || config.ui.highlightRecognizedImages;
            });
            chrome.storage.sync.get('serverUrl', function (data) {
                config.global.apiServer.serverUrl = data.serverUrl || config.global.apiServer.serverUrl;
            });
            config.ui.imageDecorator.iconUrl = chrome.extension.getURL('img/settings-icon.png');
        }

        chrome.storage.onChanged.addListener(function (changes, namespace) {
            loadPreferences();
        });

        loadPreferences();
        var appState = new Elogio.ApplicationStateController(), currentTabId,
            pluginState = {
                isEnabled: true
            };

        function togglePluginState() {
            //set title is needed too when plugin switched on\off
            if (pluginState.isEnabled) {
                loadPreferences();
                chrome.browserAction.setIcon({path: elogioDisabledIcon});
                chrome.browserAction.setTitle({title: Elogio._('pluginStateOff')});
                pluginState.isEnabled = false;
                notifyPluginState();
            } else {
                loadPreferences();
                chrome.browserAction.setIcon({path: elogioIcon});
                chrome.browserAction.setTitle({title: elogioLabel});
                pluginState.isEnabled = true;
                notifyPluginState();
            }
        }

        function contextMenuItemClick() {
            //don't need to check uuid because content script checking: if uuid is null then just open sidebar, else open and scroll
            var tabState = appState.getTabState(currentTabId);
            bridge.registerClient(tabState.getWorker());
            bridge.emit(events.onImageAction);
        }

        chrome.contextMenus.create({
            'title': Elogio._('contextMenuItem_01'),
            'contexts': ['all'],
            'onclick': contextMenuItemClick
        });

        chrome.browserAction.onClicked.addListener(function () {
            togglePluginState();
        });


        /**
         * Load template and send it to content
         */
        function loadTemplate() {
            $.ajax({
                url: chrome.extension.getURL("html/panel.html"),
                dataType: "html",
                success: function (panelResponse) {
                    var tabState = appState.getTabState(currentTabId);
                    tabState.clearImageStorage();
                    tabState.clearLookupImageStorage();
                    bridge.emit(events.ready, {panelTemplate: panelResponse, config: config});
                }
            });

        }


        function indicateError(imageObj) {
            var tabState = appState.getTabState(currentTabId);
            if (!imageObj) { //indicator if has errors then draw indicator on button
                if (!tabState.hasErrors()) {
                    chrome.browserAction.setIcon({path: elogioIcon});
                    chrome.browserAction.setTitle({title: elogioLabel});
                } else {
                    chrome.browserAction.setIcon({path: elogioErrorIcon});
                    chrome.browserAction.setTitle({title: Elogio._('pluginGlobalError')});
                }
            }
            if (imageObj && imageObj.error && !imageObj.noData) {
                tabState.putImageToStorage(imageObj);
                chrome.browserAction.setIcon({path: elogioErrorIcon});
                chrome.browserAction.setTitle({title: Elogio._('pluginGlobalError')});
            }
            if (imageObj && imageObj.error) {
                bridge.emit(events.newImageFound, imageObj);
            }
        }


        /**
         * This method needs to send request to elogio server, and sends to panel imageObj with or without lookup data;
         * @param lookupImageObjStorage - it's imageObj storage for lookup request
         * @param contentWorker
         */




        //init current tab when browser or extension started
        function initTab() {
            chrome.tabs.query({active: true}, function (tab) {
                currentTabId = tab[0].id;
                var tabState = appState.getTabState(currentTabId);
                bridge.registerClient(tabState.getWorker());
                if (pluginState.isEnabled) {
                    indicateError();
                } else {
                    notifyPluginState();
                }
            });
        }

        initTab();
        function notifyPluginState() {
            var tabState = appState.getTabState(currentTabId);
            var contentWorker = tabState.getWorker();
            if (!pluginState.isEnabled && contentWorker) {
                tabState.clearImageStorage();
                tabState.clearLookupImageStorage();
                bridge.emit(events.pluginStopped);
            }
            if (pluginState.isEnabled && contentWorker) {
                bridge.emit(events.pluginActivated, config);
            }
        }

        //when tab switched
        chrome.tabs.onActivated.addListener(function (activeInfo) {
            initTab();
        });
        function setPort(port) {
            var tabState = appState.getTabState(currentTabId);
            tabState.attachWorker(port);
            bridge.registerClient(tabState.getWorker());
        }

        bridge.on(events.startPageProcessing, function () {
            if (pluginState.isEnabled) {
                loadTemplate();
            }
        });
        bridge.on(events.pageProcessingFinished, function () {
            var tabState = appState.getTabState(currentTabId);
            if (tabState.getImagesFromLookupStorage().length > 0) {
                mainScriptHelper.lookupQuery(tabState.getImagesFromLookupStorage(), tabState, function (imageObj) {
                    indicateError(imageObj);
                });
                appState.getTabState(currentTabId).clearLookupImageStorage();
            }
        });
        bridge.on(events.copyToClipBoard, function (selection) {
            var clipboardData = selection.clipboardData, data, type = selection.type, copyElement = $('<div></div>'), body = $('body');

            function exec() {
                document.execCommand('SelectAll');
                document.execCommand("Copy", false, null);
                copyElement.remove();
            }

            switch (type) {
                case 'html':
                    data = $.parseHTML(clipboardData);
                    body.append(data);
                    exec();
                    break;
                case 'text':
                    copyElement.text(clipboardData);
                    body.append(copyElement);
                    copyElement.contentEditable = true;
                    copyElement.unselectable = "off";
                    copyElement.focus();
                    exec();
                    break;
                case 'image':
                    //at here we get base64 url in clipboardData
                    break;
            }
        });
        bridge.on(events.imageDetailsRequired, function (imageObj) {
            var tabState = appState.getTabState(currentTabId);
            mainScriptHelper.annotationsQuery(imageObj, tabState, function (imageObj) {
                indicateError(imageObj);
            });
        });
        bridge.on(events.onImageRemoved, function (uuid) {
            var tabState = appState.getTabState(currentTabId);
            tabState.removeImageFromStorageByUuid(uuid);
        });
        bridge.on(events.oembedRequestRequired, function (imageObj) {
            var tabState = appState.getTabState(currentTabId);
            mainScriptHelper.oembedLookup(imageObj, tabState);
        });
        bridge.on(events.hashCalculated, function (imageObj) {
            var tabState = appState.getTabState(currentTabId);
            mainScriptHelper.hashLookupQuery(imageObj, tabState, function (imageObj) {
                indicateError(imageObj);
            });

        });
        bridge.on(events.newImageFound, function (imageObj) {
            var tabState = appState.getTabState(currentTabId);
            // Maybe we already have image with this URL in storage?
            if (tabState.findImageInStorageByUrl(imageObj.uri)) {
                return;
            }
            if (tabState.getImagesFromLookupStorage().length >= config.global.apiServer.imagesPerRequest) {
                mainScriptHelper.lookupQuery(tabState.getImagesFromLookupStorage(), tabState, function (imageObj) {
                    indicateError(imageObj);
                });
                tabState.clearLookupImageStorage();
            }
            tabState.putImageToLookupStorage(imageObj);
            tabState.putImageToStorage(imageObj);
        });

        chrome.runtime.onConnect.addListener(function (port) {
            setPort(port);
            var tabState = appState.getTabState(currentTabId),
                contentWorker = tabState.getWorker();
            //we need to set listeners only if we get a new port
            contentWorker.onMessage.addListener(function (request) {
                //clear if page was reloaded
                if (request.eventName === 'registration') {
                    initTab();
                    var tabState = appState.getTabState(currentTabId);
                    tabState.clearImageStorage();
                    tabState.clearLookupImageStorage();
                    if (pluginState.isEnabled) {
                        loadTemplate();
                    }
                }
                if (request.eventName !== 'registration' && pluginState.isEnabled) {
                    bridge.emitInside(request.eventName, request.data);
                }
            });
        });
    });
})
();