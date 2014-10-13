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
            elogioLabel = 'elog.io plugin',
            elogioDisabledIcon = 'img/icon_19_disabled.png',
            elogioIcon = 'img/icon_19.png',
            events = bridge.events;

        function loadPreferences() {
            config.ui.imageDecorator.iconUrl = chrome.extension.getURL('img/settings-icon.png');
            config.ui.highlightRecognizedImages = true;
            config.global.locator.deepScan = true;
        }

        loadPreferences();
        var appState = new Elogio.ApplicationStateController(), currentTabId,
            pluginState = {
                isEnabled: true
            };
        chrome.browserAction.onClicked.addListener(function () {
            if (pluginState.isEnabled) {
                loadPreferences();
                chrome.browserAction.setIcon({path: elogioDisabledIcon});
                pluginState.isEnabled = false;
                //sendPluginState();
            } else {
                chrome.browserAction.setIcon({path: elogioIcon});
                pluginState.isEnabled = true;
                //sendPluginState();
            }
        });
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

        function indicateError(imageObj) {
            var tabState = appState.getTabState(currentTabId);
            if (!imageObj) { //indicator if has errors then draw indicator on button
                if (!tabState.hasErrors()) {
                    chrome.browserAction.setIcon({path: elogioIcon});
                    chrome.browserAction.setTitle({title: elogioLabel});
                } else {
                    chrome.browserAction.setIcon({path: elogioDisabledIcon});
                    chrome.browserAction.setTitle({title: 'Something is wrong... Check Elog.io sidebar for details'});
                }
            }
            if (imageObj && imageObj.error) {
                tabState.putImageToStorage(imageObj);
                chrome.browserAction.setIcon({path: elogioDisabledIcon});
                chrome.browserAction.setTitle({title: 'Something is wrong... Check Elog.io sidebar for details'});
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
        chrome.tabs.query({active: true}, function (tab) {
            currentTabId = tab[0].id;
            appState.getTabState(currentTabId);
        });
        function sendPluginState() {
            var tabState = appState.getTabState(currentTabId);
            var contentWorker = tabState.getWorker();
            if (!pluginState.isEnabled && contentWorker) {
                contentWorker.postMessage({eventName: events.pluginStopped});
            }
            if (pluginState.isEnabled && contentWorker) {
                contentWorker.postMessage({eventName: events.pluginActivated});
            }
        }

        //when tab switched
        chrome.tabs.onActivated.addListener(function (activeInfo) {
            currentTabId = activeInfo.tabId;
            sendPluginState();
        });
        function setPort(port) {
            var tabState = appState.getTabState(currentTabId);
            tabState.attachWorker(port);
        }

        messaging.on(events.startPageProcessing, function () {
            var tabState = appState.getTabState(currentTabId),
                contentWorker = tabState.getWorker();
            if (contentWorker) {
                contentWorker.postMessage({eventName: events.startPageProcessing});//send it back
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

        messaging.on(events.jqueryRequired, function (request) {
            var tabState = appState.getTabState(currentTabId);
            chrome.tabs.executeScript(currentTabId, {file: "data/deps/jquery/jquery.js"}, function () {
                //send it back because content want know when jquery is ready
                tabState.getWorker().postMessage({eventName: events.jqueryRequired});
            });
        });

        messaging.on(events.sidebarRequired, function () {
            chrome.tabs.executeScript(currentTabId, {file: "data/js/side-panel.js"}, function () {
                //if loaded then load next
                chrome.tabs.executeScript(currentTabId, {file: "data/deps/mustache/mustache.js"}, function () {
                    //all scripts are loaded then start page processing
                    $.ajax({
                        url: chrome.extension.getURL("html/template.html"),
                        dataType: "html",
                        success: function (response) {
                            var tabState = appState.getTabState(currentTabId);
                            tabState.clearImageStorage();
                            tabState.clearLookupImageStorage();
                            tabState.getWorker().postMessage({eventName: events.ready, data: response});
                        }
                    });
                });

            });
        });

        chrome.runtime.onConnect.addListener(function (port) {
            setPort(port);
            var tabState = appState.getTabState(currentTabId),
                contentWorker = tabState.getWorker();
            //we need to set listeners only if we get a new port
            contentWorker.onMessage.addListener(function (request) {
                if (request.eventName !== 'registration' && pluginState.isEnabled) {
                    messaging.emit(request.eventName, request.data);
                }
            });
        });
    });
})();