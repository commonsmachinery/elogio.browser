new Elogio(
    ['config', 'utils', 'dom', 'imageDecorator', 'locator', 'bridge', 'sidebarModule', 'messaging'],
    function (modules) {
        'use strict';
        var
            bridge = modules.getModule('bridge'),
            messaging = modules.getModule('messaging'),
            sidebarModule = modules.getModule('sidebarModule'),
            dom = modules.getModule('dom'),
            imageDecorator = modules.getModule('imageDecorator'),
            config = modules.getModule('config'),
            locator = modules.getModule('locator'),
            events = bridge.events,
            observer,
            isPluginEnabled = true;
        config.ui.imageDecorator.iconUrl = chrome.extension.getURL('img/settings-icon.png');
        /*
         =======================
         PRIVATE MEMBERS
         =======================
         */
        //callback when scan page is finished
        var finish = function () {
            port.postMessage({eventName: events.pageProcessingFinished});
        };

        function scanForImages(nodes) {
            nodes = nodes || null;
            locator.findImages(document, nodes, function (imageObj) {
                port.postMessage({eventName: events.newImageFound, data: imageObj});
            }, function () {
                //on error
            }, function () {
                //on finished
                port.postMessage({eventName: events.pageProcessingFinished});
            });
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

        /**
         * Fires when query lookup is ready and we need to get annotations for image
         */
        messaging.on(events.imageDetailsRequired, function (imageObj) {
            port.postMessage({eventName: events.imageDetailsRequired, dtat: imageObj});
        });

        messaging.on(events.jqueryRequired, function () {
            if (typeof Mustache === 'undefined') {
                port.postMessage({eventName: events.mustacheRequired});
            } else {
                port.postMessage({eventName: events.sidebarRequired});
            }
        });
        messaging.on(events.imageDetailsReceived, function (imageObj) {
            sidebarModule.receivedImageDataFromServer(imageObj);
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
                        var element = document.getElementById(uuid);
                        var sidebar = $('#elogio-panel');
                        //if sidebar hidden then show it
                        if (sidebar.is(':hidden')) {
                            $('#elogio-button-panel').trigger('click');
                        }
                        sidebar.animate({scrollTop: element.offsetTop}, 500, 'swing', function () {
                            sidebarModule.openImage(uuid);
                        });
                    });
                }
            }
            sidebarModule.addOrUpdateCard(imageObj);
        });
        messaging.on(events.pluginStopped, function () {
            isPluginEnabled = false;
            $('#elogio-panel').remove();
            sidebarModule.cleanUp();
            $('#elogio-button-panel').remove();
            undecorate();
        });
        messaging.on(events.pluginActivated, function () {
            isPluginEnabled = true;
            if ($) {
                $('#elogio-button-panel').show();
            }
            port.postMessage({eventName: events.startPageProcessing});
        });

        messaging.on(events.ready, function (data) {
            observer.observe(document.body, { attributes: true, childList: true, subtree: true });
            var template = $.parseHTML(data.stringTemplate),
                button = $(document.createElement('button')),
                body = $('body'), sidebar;
            button.addClass('elogio-button');
            button.addClass('btn-success');
            button.addClass('btn-sm');
            button.addClass('btn');
            button.text('Open');
            button.attr('href', "#elogio-panel");
            button.attr('id', 'elogio-button-panel');
            body.append(template);
            body.append(button);
            sidebar = $('#elogio-panel');
            button.elogioSidebar({side: 'right', duration: 300, clickClose: true});
            sidebarModule.startScan(document, document, null, sidebar, port, finish);
        });
        var port = chrome.runtime.connect({name: "content"});
        port.onMessage.addListener(function (request) {
            if (isPluginEnabled || request.eventName === events.pluginActivated) {
                messaging.emit(request.eventName, request.data);
            }
        });
        port.postMessage({eventName: 'registration'});
        if (!window.jQuery || !window.$) {
            port.postMessage({eventName: events.jqueryRequired});//jquery required
        } else {
            if (!Mustache) {
                port.postMessage({eventName: events.mustacheRequired});
            } else {
                port.postMessage({eventName: events.sidebarRequired});
            }
        }
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
                            bridge.emit(bridge.events.onImageRemoved, uuid);
                        }
                        // check if node has another removed elements
                        elements = dom.getElementsByAttribute(config.ui.dataAttributeName, mutation.removedNodes[i]);
                        if (elements) {
                            for (j = 0; j < elements.length; j++) {
                                uuid = elements[j].getAttribute(config.ui.dataAttributeName);
                                if (uuid) {
                                    bridge.emit(bridge.events.onImageRemoved, uuid);
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