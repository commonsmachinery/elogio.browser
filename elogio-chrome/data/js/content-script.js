new Elogio(
    ['config', 'utils', 'dom', 'imageDecorator', 'locator', 'bridge', 'sidebarHelper', 'messaging'],
    function (modules) {
        'use strict';
        var
            bridge = modules.getModule('bridge'),
            messaging = modules.getModule('messaging'),
            dom = modules.getModule('dom'),
            imageDecorator = modules.getModule('imageDecorator'),
            config = modules.getModule('config'),
            locator = modules.getModule('locator'),
            events = bridge.events,
            panelUrl = chrome.extension.getURL('html/template.html'),
            observer,
            portToPanel,
            isPluginEnabled = true;
        config.ui.imageDecorator.iconUrl = chrome.extension.getURL('img/settings-icon.png');
        /*
         =======================
         PRIVATE MEMBERS
         =======================
         */
        var portToPlugin = chrome.runtime.connect({name: "content"});

        /**
         * Emit from panel
         * @param event
         */
        function listenerForPanel(event) {
            var request = event.data;
            if (isPluginEnabled || request.eventName === events.pluginActivated) {
                messaging.emit(request.eventName, request.data, request.from);
            }

        }

        /**
         * Listener for panel
         */
        if (window.addEventListener) {
            window.addEventListener("message", listenerForPanel, false);
        } else {
            window.attachEvent("onmessage", listenerForPanel);
        }

        /**
         * doorbell injection
         */
        var s = document.createElement('script');
        s.src = chrome.extension.getURL('data/js/doorbell-injection.js');
        (document.head || document.documentElement).appendChild(s);
        /**
         * end of doorbell injection
         */
        //callback when scan page is finished
        var finish = function () {
            portToPlugin.postMessage({eventName: events.pageProcessingFinished});
        };

        function scanForImages(nodes) {
            nodes = nodes || null;
            locator.findImages(document, nodes, function (imageObj) {
                portToPanel.contentWindow.postMessage({eventName: events.newImageFound, data: imageObj}, panelUrl);
                portToPlugin.postMessage({eventName: events.newImageFound, data: imageObj});
            }, function () {
                //on error
            }, function () {
                //on finished
                finish();
            });
        }

        function setPreferences(changedSettings) {
            config.global.locator.deepScan = changedSettings.global.locator.deepScan;
            config.ui.highlightRecognizedImages = changedSettings.ui.highlightRecognizedImages;
        }

        function undecorate() {
            var elements = dom.getElementsByAttribute(config.ui.decoratedItemAttribute, document);
            var i, n;
            for (i = 0, n = elements.length; i < n; i++) {
                imageDecorator.undecorate(elements[i], document);
            }
            // secondary remove uuid from all elements which we marks
            var elementsWithUUID = dom.getElementsByAttribute(config.ui.dataAttributeName, document);
            for (i = 0, n = elementsWithUUID.length; i < n; i++) {
                if (elementsWithUUID[i].hasAttribute(config.ui.dataAttributeName)) {
                    elementsWithUUID[i].removeAttribute(config.ui.dataAttributeName);
                }
            }
            if (observer) {
                observer.disconnect();
            }
        }

        /*
         =======================
         PANEL LISTENERS
         =======================
         */
        messaging.on(events.imageDetailsRequired, function (imageObj) {
            portToPlugin.postMessage({eventName: events.imageDetailsRequired, data: imageObj});
        }, 'panel');

        messaging.on(events.onImageAction, function (imageObj) {
            var elem = dom.getElementByUUID(imageObj.uuid, document);
            if (elem) {
                elem.scrollIntoView();
            }
        }, 'panel');
        messaging.on(events.hashRequired, function (imageObj) {
            blockhash(imageObj.uri, 16, 2, function (error, hash) {
                imageObj.error = error;
                imageObj.hash = hash;
                portToPlugin.postMessage({eventName: events.hashCalculated, data: imageObj});
            });
        }, 'panel');
        messaging.on(events.copyToClipBoard, function (copyElement) {
            portToPlugin.postMessage({eventName: events.copyToClipBoard, data: copyElement});
        }, 'panel');

        /**
         * Fires when query lookup is ready and we need to get annotations for image
         */
        messaging.on(events.imageDetailsRequired, function (imageObj) {
            portToPlugin.postMessage({eventName: events.imageDetailsRequired, data: imageObj});
        });
        messaging.on(events.startPageProcessing, function () {
            scanForImages();
        }, 'panel');

        /*
         =======================
         EXTENSION LISTENERS
         =======================
         */

        messaging.on(events.imageDetailsReceived, function (imageObj) {
            portToPanel.contentWindow.postMessage({eventName: events.imageDetailsReceived, data: imageObj}, panelUrl);
        });
        /**
         * Fires when we get info for image or error
         */
        messaging.on(events.newImageFound, function (imageObj) {
            //if we get lookup then decorate
            if (imageObj.lookup) {
                var element = dom.getElementByUUID(imageObj.uuid, document);
                if (element) {
                    imageDecorator.decorate(element, document, function (uuid) {
                        var element = dom.getElementByUUID(uuid, document);
                        var sidebar = $('#elogio-panel');
                        //if sidebar hidden then show it
                        if (sidebar.is(':hidden')) {
                            $('#elogio-button-panel').trigger('click');
                        }
                        if (element) {
                            portToPanel.contentWindow.postMessage({eventName: events.onImageAction, data: imageObj}, panelUrl);
                        }
                    });
                }
            }
            portToPanel.contentWindow.postMessage({eventName: events.newImageFound, data: imageObj}, panelUrl);
        });
        messaging.on(events.pluginStopped, function () {
            isPluginEnabled = false;
            $('#elogio-panel').remove();
            $('#elogio-button-panel').remove();
            undecorate();
        });
        messaging.on(events.pluginActivated, function (changedSettings) {
            isPluginEnabled = true;
            if ($) {
                $('#elogio-button-panel').show();
            }
            setPreferences(changedSettings);
            portToPlugin.postMessage({eventName: events.startPageProcessing});
        });

        messaging.on(events.ready, function (data) {
            observer.observe(document.body, { attributes: true, childList: true, subtree: true });
            var template = $($.parseHTML(data.stringTemplate, document, true)),
                button = $(document.createElement('button')),
                body = $('body');
            setPreferences(data.config);
            if (config.ui.highlightRecognizedImages) {
                body.addClass('elogio-highlight');
            } else {
                body.removeClass('elogio-highlight');
            }
            button.addClass('elogio-button');
            button.text('Open');
            button.attr('href', "#elogio-panel");
            button.attr('id', 'elogio-button-panel');
            template.attr('src', panelUrl);
            body.append(template);
            body.append(button);
            button.elogioSidebar({side: 'right', duration: 300, clickClose: true});
            //attach port to panel
            portToPanel = document.getElementById('elogio-panel');
        });
        portToPlugin.onMessage.addListener(function (request) {
            if (isPluginEnabled || request.eventName === events.pluginActivated) {
                messaging.emit(request.eventName, request.data, request.from);
            }
        });
        portToPlugin.postMessage({eventName: 'registration'});


        /*
         =======================
         DOM OBSERVER
         =======================
         */
        observer = new MutationObserver(function (mutations) {
            var nodesToBeProcessed = [];
            mutations.forEach(function (mutation) {
                var i, j, newNodes = mutation.addedNodes;
                /**
                 * we need to filter nodes which added to DOM
                 */
                for (i = 0; i < newNodes.length; i += 1) {
                    if (newNodes[i].nodeType === Node.ELEMENT_NODE) {
                        nodesToBeProcessed[nodesToBeProcessed.length] = newNodes[i];//add itself
                        var children = locator.findNodes(newNodes[i]);//and add all filtered children of this node
                        //add all children to store, which needs to be processed
                        for (j = 0; j < children.length; j++) {
                            nodesToBeProcessed[nodesToBeProcessed.length] = children[j];
                        }
                    }
                }

                // remove images from storage and panel once they disappear from DOM
                for (i = 0; i < mutation.removedNodes.length; i += 1) {
                    if (mutation.removedNodes[i].nodeType === Node.ELEMENT_NODE) {
                        // if node is removed element
                        var uuid = mutation.removedNodes[i].getAttribute(config.ui.dataAttributeName),
                            elements;
                        if (uuid) {
                            portToPlugin.postMessage({eventName: bridge.events.onImageRemoved, data: uuid});
                            portToPanel.contentWindow.postMessage({eventName: bridge.events.onImageRemoved, data: uuid}, panelUrl);
                        }
                        // check if node has another removed elements
                        elements = dom.getElementsByAttribute(config.ui.dataAttributeName, mutation.removedNodes[i]);
                        if (elements) {
                            for (j = 0; j < elements.length; j++) {
                                uuid = elements[j].getAttribute(config.ui.dataAttributeName);
                                if (uuid) {
                                    portToPlugin.postMessage({eventName: bridge.events.onImageRemoved, data: uuid});
                                    portToPanel.contentWindow.postMessage({eventName: bridge.events.onImageRemoved, data: uuid}, panelUrl);
                                }
                            }
                        }
                    }
                }
            });
            //we scan only added to DOM nodes, don't need to rescan all DOM
            scanForImages(nodesToBeProcessed);
        });
    }
);