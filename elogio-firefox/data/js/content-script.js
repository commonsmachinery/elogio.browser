new Elogio(
    ['config', 'utils', 'dom', 'imageDecorator', 'locator', 'bridge', 'contextMenu'],
    function (modules) {
        'use strict';
        var locator = modules.getModule('locator'),
            imageDecorator = modules.getModule('imageDecorator'),
            dom = modules.getModule('dom'),
            config = modules.getModule('config'),
            bridge = modules.getModule('bridge'),
            contextMenu = modules.getModule('contextMenu');


        /*
         =======================
         PRIVATE MEMBERS
         =======================
         */
        var observer;

        function contextMenuItemClick(uuid) {
            bridge.emit(bridge.events.onImageAction, uuid);
        }

        function scanForImages(nodes) {
            nodes = nodes || null;
            locator.findImages(document, nodes, function (imageObj) {
                contextMenu.attachContextMenu(dom.getElementByUUID(imageObj.uuid), contextMenuItemClick);
                bridge.emit(bridge.events.newImageFound, imageObj);
            }, function () {
                //on error
            }, function () {
                //on finished
                bridge.emit(bridge.events.pageProcessingFinished);
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

        // Initialize bridge
        bridge.registerClient(self.port);

        window.addEventListener('pageshow', function () {
            bridge.emit(bridge.events.pageShowEvent);
        }, false);
        bridge.on(bridge.events.ready, function (contextMenuString) {
            console.log(contextMenuString);
            var template = document.createElement('div');
            template.innerHTML = contextMenuString;
            contextMenu.init(template.firstElementChild, document);
        });
        //is needed for undecorate page if it from the cache
        bridge.on(bridge.events.pageShowEvent, function () {
            undecorate();
        });
        //calculate hash
        bridge.on(bridge.events.hashRequired, function (imageObj) {
            blockhash(imageObj.uri, 16, 2, function (error, hash) {
                imageObj.error = error;
                imageObj.hash = hash;
                bridge.emit(bridge.events.hashCalculated, imageObj);
            });
        });
        // Subscribe for events
        bridge.on(bridge.events.configUpdated, function (updatedConfig) {
            config.ui.imageDecorator.iconUrl = updatedConfig.ui.imageDecorator.iconUrl;
            config.global.locator.deepScan = updatedConfig.global.locator.deepScan;
            if (document.body) {
                if (updatedConfig.ui.highlightRecognizedImages) {
                    if (document.body.className.indexOf('elogio-highlight') < 0) {
                        document.body.className += ' elogio-highlight';
                    }
                } else {
                    document.body.className = document.body.className.replace(/\s?elogio-highlight\b/, '');
                }
            }
        });
        bridge.on(bridge.events.pluginStopped, function () {
            undecorate();
        });
        bridge.on(bridge.events.newImageFound, function (imageObj) {
            var element = dom.getElementByUUID(imageObj.uuid, document);
            if (element) {
                imageDecorator.decorate(element, document, contextMenuItemClick);
            }
        });
        bridge.on(bridge.events.onImageAction, function (uuid) {
            var elem = dom.getElementByUUID(uuid, document);
            if (elem) {
                elem.scrollIntoView();
            }
        });
        bridge.on(bridge.events.pluginActivated, function () {
            if (document.body) {
                /**
                 * careful, because we need to observe attributes too. For example: if node already exist in the DOM,
                 * and script of the page just set attribute 'url' of this node.
                 */
                observer.observe(document.body, { attributes: true, childList: true, subtree: true });
            }
        });
        bridge.on(bridge.events.startPageProcessing, scanForImages);
        // Experiment with MutationObserver
        // create an observer instance
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