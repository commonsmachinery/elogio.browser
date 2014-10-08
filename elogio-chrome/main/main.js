/**
 * Created by TEMA on 03.10.2014.
 */
(function () {
    'use strict';
    new Elogio(['config', 'bridge', 'utils'], function (modules) {
        var bridge = modules.getModule('bridge'),
            events = bridge.events, popupWorker;

        var appState = new Elogio.ApplicationStateController(), currentTabId,
            pluginState = {
                isEnabled: false
            };
        //init current tab when browser or extension started
        chrome.tabs.query({active: true}, function (tab) {
            currentTabId = tab[0].id;
            appState.getTabState(currentTabId);
        });
        //when tab switched
        chrome.tabs.onActivated.addListener(function (activeInfo) {
            currentTabId = activeInfo.tabId;
            var tabState = appState.getTabState(currentTabId);
            if (pluginState.isEnabled) {
                var images = tabState.getImagesFromStorage();
                if (popupWorker) {
                    popupWorker.postMessage({eventName: events.tabSwitched, images: images});
                }
            } else {
                var contentWorker = tabState.getWorker();
                if (contentWorker) {
                    contentWorker.postMessage({eventName: events.pluginStopped});
                }
            }
        });
        function setPort(port) {
            var tabState = appState.getTabState(currentTabId);
            tabState.attachWorker(port);
        }

        /**
         * Fires when content or popup script connected to background js
         * port is needed for messaging with content and popup
         */
        chrome.runtime.onConnect.addListener(function (port) {
            setPort(port);
            var tabState = appState.getTabState(currentTabId),
                contentWorker = tabState.getWorker();
            //we need to set listeners only if we get a new port
            contentWorker.onMessage.addListener(function (request) {
                //handler for content script
                switch (request.eventName) {
                    //if content script was found image
                    case events.newImageFound:
                        var tabState = appState.getTabState(currentTabId);
                        // Maybe we already have image with this URL in storage?
                        if (tabState.findImageInStorageByUrl(request.image.uri)) {
                            return;
                        }
                        tabState.putImageToStorage(request.image);
                        break;
                    //init jquery if required
                    case 'jquery':
                        chrome.tabs.executeScript(currentTabId, {file: "data/deps/jquery/jquery.js"});
                        chrome.tabs.executeScript(currentTabId, {file: "data/js/side-panel.js"});
                        chrome.tabs.executeScript(currentTabId, {file: "data/js/sidebar.js"});
                        break;
                }
            });
        });
    });
})();