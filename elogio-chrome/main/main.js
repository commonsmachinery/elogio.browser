/**
 * Created by TEMA on 03.10.2014.
 */
(function () {
    'use strict';
    new Elogio(['config', 'bridge', 'utils', 'elogioRequest', 'elogioServer', 'messaging'], function (modules) {
        var bridge = modules.getModule('bridge'),
            config = modules.getModule('config'),
            elogioServer = modules.getModule('elogioServer'),
            messaging = modules.getModule('messaging'),
            elogioLabel = chrome.i18n.getMessage('pluginStateOn'),
            elogioDisabledIcon = 'img/icon_19_disabled.png',
            elogioErrorIcon = 'img/icon_19_error.png',
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
                chrome.browserAction.setTitle({title: chrome.i18n.getMessage('pluginStateOff')});
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
            tabState.getWorker().postMessage({eventName: events.onImageAction});
        }

        chrome.contextMenus.create({
            'title': chrome.i18n.getMessage('contextMenuItem_01'),
            'contexts': ['all'],
            'onclick': contextMenuItemClick
        });

        chrome.browserAction.onClicked.addListener(function () {
            togglePluginState();
        });
        function getTextStatusByStatusCode(statusCode) {
            switch (statusCode) {
                case 200:
                    return chrome.i18n.getMessage('requestError_01');
                case 0:
                    return chrome.i18n.getMessage('requestError_02');
                default:
                    return chrome.i18n.getMessage('requestError_03');
            }
        }

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
                    tabState.getWorker().postMessage({eventName: events.ready, data: {panelTemplate: panelResponse, config: config}});
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
                    chrome.browserAction.setTitle({title: chrome.i18n.getMessage('pluginGlobalError')});
                }
            }
            if (imageObj && imageObj.error && !imageObj.noData) {
                tabState.putImageToStorage(imageObj);
                chrome.browserAction.setIcon({path: elogioErrorIcon});
                chrome.browserAction.setTitle({title: chrome.i18n.getMessage('pluginGlobalError')});
            }
            if (imageObj && imageObj.error) {
                tabState.getWorker().postMessage({eventName: events.newImageFound, data: imageObj});
            }
        }

        /**
         * This method needs to send request to elogio server, and sends to panel imageObj with or without lookup data;
         * @param lookupImageObjStorage - it's imageObj storage for lookup request
         * @param contentWorker
         */

        function lookupQuery(lookupImageObjStorage, contentWorker) {
            var localStore = lookupImageObjStorage,
                dictionary = {uri: []},
                tabState = appState.getTabState(currentTabId);
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
                                contentWorker.postMessage({eventName: events.newImageFound, data: imageFromStorage});
                            }
                        }
                        // If it doesn't exist - assume it doesn't exist on server
                        if (!existsInResponse) {
                            imageFromStorage.lookup = false;
                            contentWorker.postMessage({eventName: events.newImageFound, data: imageFromStorage});
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


        //init current tab when browser or extension started
        function initTab() {
            chrome.tabs.query({active: true}, function (tab) {
                currentTabId = tab[0].id;
                indicateError();
            });
        }

        initTab();
        function notifyPluginState() {
            var tabState = appState.getTabState(currentTabId);
            var contentWorker = tabState.getWorker();
            if (!pluginState.isEnabled && contentWorker) {
                tabState.clearImageStorage();
                tabState.clearLookupImageStorage();
                contentWorker.postMessage({eventName: events.pluginStopped});
            }
            if (pluginState.isEnabled && contentWorker) {
                contentWorker.postMessage({eventName: events.pluginActivated, data: config});
            }
        }

        //when tab switched
        chrome.tabs.onActivated.addListener(function (activeInfo) {
            initTab();
        });
        function setPort(port) {
            var tabState = appState.getTabState(currentTabId);
            tabState.attachWorker(port);
        }

        messaging.on(events.startPageProcessing, function () {
            if (pluginState.isEnabled) {
                loadTemplate();
            }
        });
        messaging.on(events.pageProcessingFinished, function () {
            var tabState = appState.getTabState(currentTabId),
                contentWorker = tabState.getWorker();
            if (tabState.getImagesFromLookupStorage().length > 0) {
                lookupQuery(tabState.getImagesFromLookupStorage(), contentWorker);
                appState.getTabState(currentTabId).clearLookupImageStorage();
            }
        });
        messaging.on(events.copyToClipBoard, function (selection) {
            var clipboardData = selection.clipboardData, data, type = selection.type, copyElement = $('<div></div>'), body = $('body');

            function exec() {
                document.execCommand('SelectAll');
                document.execCommand("Copy", false, null);
                //copyElement.remove();
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
        messaging.on(events.imageDetailsRequired, function (imageObj) {
            var tabState = appState.getTabState(currentTabId),
                contentWorker = tabState.getWorker();
            elogioServer.annotationsQuery(imageObj.lookup.href,
                function (annotationsJson) {
                    var imageObjFromStorage = tabState
                        .findImageInStorageByUuid(imageObj.uuid);
                    if (imageObjFromStorage) {
                        imageObjFromStorage.details = annotationsJson;
                        delete imageObjFromStorage.error;//if error already exist in this image then delete it
                        indicateError();
                        contentWorker.postMessage({eventName: events.imageDetailsReceived, data: imageObjFromStorage});
                    } else {
                        console.log("Can't find image in storage: " + imageObj.uuid);
                    }
                },
                function (response) {
                    //put error to storage
                    imageObj.error = getTextStatusByStatusCode(response.status);
                    indicateError(imageObj);
                },
                config.global.apiServer.urlLookupOptions
            );
        });
        messaging.on(events.onImageRemoved, function (uuid) {
            var tabState = appState.getTabState(currentTabId);
            tabState.removeImageFromStorageByUuid(uuid);
        });
        messaging.on(events.hashCalculated, function (imageObj) {
            var tabState = appState.getTabState(currentTabId),
                imageObjFromStorage = tabState.findImageInStorageByUuid(imageObj.uuid),
                contentWorker = tabState.getWorker();
            if (!imageObj.error) {
                imageObjFromStorage.hash = imageObj.hash;
                console.log('hash is: ' + imageObj.hash + '  and src= ' + imageObj.uri);
                elogioServer.hashLookupQuery({hash: imageObjFromStorage.hash, src: imageObjFromStorage.uri, context: imageObj.domain}, function (json) {
                    if (Array.isArray(json) && json.length > 0) {
                        imageObjFromStorage.lookup = json[0];
                        delete imageObjFromStorage.error;
                        delete imageObjFromStorage.noData;
                        contentWorker.postMessage({eventName: events.newImageFound, data: imageObjFromStorage});//send message when lookup received
                        //it means, what we need details, because user click on 'query to elog.io'
                        contentWorker.postMessage({eventName: events.imageDetailsRequired, data: imageObjFromStorage});
                    } else {
                        //if we get an empty array, that's mean what no data for this image
                        imageObjFromStorage.error = chrome.i18n.getMessage('noDataForImage');
                        imageObjFromStorage.noData = true;
                        indicateError(imageObjFromStorage);
                    }
                }, function (response) {
                    console.log('text status ' + response.statusText + ' ; status code ' + response.status);
                    imageObjFromStorage.error = getTextStatusByStatusCode(response.status);
                    indicateError(imageObjFromStorage);
                });
            } else {
                //if we get error when using blockhash
                console.log('hash is: ' + imageObj.error + '  and src= ' + imageObj.uri);
                imageObjFromStorage.error = chrome.i18n.getMessage('blockhashError');
                imageObjFromStorage.blockhashError = 'yes';//we need to mark if block hash error
                indicateError(imageObjFromStorage);
            }
        });
        messaging.on(events.newImageFound, function (imageObj) {
            var tabState = appState.getTabState(currentTabId),
                contentWorker = tabState.getWorker();
            // Maybe we already have image with this URL in storage?
            if (tabState.findImageInStorageByUrl(imageObj.uri)) {
                return;
            }
            if (tabState.getImagesFromLookupStorage().length >= config.global.apiServer.imagesPerRequest) {
                lookupQuery(tabState.getImagesFromLookupStorage(), contentWorker);
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
                    messaging.emit(request.eventName, request.data);
                }
            });
        });
    });
})
();