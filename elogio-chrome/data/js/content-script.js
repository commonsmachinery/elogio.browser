new Elogio(
    ['config', 'utils', 'dom', 'imageDecorator', 'locator', 'messaging', 'bridge', 'sidebarHelper'],
    function (modules) {
        'use strict';
        Elogio._ = chrome.i18n.getMessage;
        var
            bridge = modules.getModule('bridge'),
            dom = modules.getModule('dom'),
            imageDecorator = modules.getModule('imageDecorator'),
            config = modules.getModule('config'),
            locator = modules.getModule('locator'),
            utils = modules.getModule('utils'),
            events = bridge.events,
            panelUrl = chrome.extension.getURL('html/template.html'),
            observer,
            portToPanel,
            blockhash = blockhashjs.blockhash,
            activeElement = null,
            isPluginEnabled = true;
        config.ui.imageDecorator.iconUrl = chrome.extension.getURL('img/settings-icon.png');
        /*
         =======================
         PRIVATE MEMBERS
         =======================
         */
        var portToPlugin = chrome.runtime.connect({name: "content"});
        bridge.registerClient(portToPlugin);
        bridge.registerClient(null, 'messaging');
        var locale = utils.initLocale();

        /**
         * Emit from panel
         * @param event
         */
        function listenerForPanel(event) {
            var request = event.data;
            if (!request.eventName) {
                return; //if received message not for this script
            }
            if (isPluginEnabled || request.eventName === events.pluginActivated) {
                bridge.emit(request.eventName, request.data, ['messaging'], request.from);
            }

        }

        /**
         * is needed for initializing button which needs for open panel
         * @param body
         * @returns {*|jQuery|HTMLElement} - return button
         */
        function initializeButton(body) {
            var button = $(document.createElement('img'));
            button.addClass('elogio-button');
            button.attr('href', "#elogio-panel");
            button.attr('id', 'elogio-button-panel');
            button.attr('src', chrome.extension.getURL('img/icon_48.png'));
            button.addClass('elogio-button-image');
            body.append(button);
            return button;
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
            bridge.emit(events.pageProcessingFinished);
        };

        var contextMenuHandler = function (event) {
            activeElement = event.target;
        };

        /**
         * Context menu handler
         */
        $('body').on('contextmenu', contextMenuHandler);

        /**
         * Method which starts scanning page
         * @param nodes
         */
        function scanForImages(nodes) {
            nodes = nodes || null;
            locator.findImages(document, nodes, function (imageObj) {
                bridge.emit(events.newImageFound, imageObj, [panelUrl]);
                bridge.emit(events.newImageFound, imageObj);
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

        /**
         * Method which removes all changes in the DOM (data attributes, listeners etc.)
         */
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
         * Handler when on image was clicked or context menu clicked
         * @param uuid - uuid of image in the DOM
         */
        function onImageActionHandler(uuid) {
            var sidebar = $('#elogio-panel');
            //if sidebar hidden then show it
            if (sidebar.is(':hidden')) {
                $('#elogio-button-panel').trigger('click');
            }
            //if uuid exists then it's event from the pane, else it's event from content (context menu)
            var targetUUID = uuid || null;
            if (!targetUUID) {
                if (activeElement) {
                    //if click on image element then we don't need to check all children
                    var element = activeElement.getAttribute(config.ui.elogioFounded);
                    var uuidActiveElement = null;
                    if (!element) {//it may mean what image has overlaps another element
                        var children = dom.getElementsByAttribute(config.ui.elogioFounded, activeElement);
                        //need to check if user click on element which contains many images, then we don't need to scroll
                        if (children.length === 1) {
                            targetUUID = children[0].getAttribute(config.ui.dataAttributeName);
                        } else {
                            targetUUID = null;
                        }
                    } else {
                        uuidActiveElement = activeElement.getAttribute(config.ui.dataAttributeName);
                    }
                    targetUUID = uuidActiveElement || targetUUID;
                    activeElement = null;
                }
            }
            if (targetUUID) {
                bridge.emit(events.onImageAction, targetUUID, [panelUrl]);
            }
        }

        /*
         =======================
         PANEL LISTENERS
         =======================
         */
        bridge.on(events.imageDetailsRequired, function (imageObj) {
            bridge.emit(events.imageDetailsRequired, imageObj);
        }, [panelUrl]);

        bridge.on(events.onImageAction, function (uuid) {
            var elem = dom.getElementByUUID(uuid, document);
            if (elem) {
                elem.scrollIntoView();
            }
        }, [panelUrl]);
        bridge.on(events.doorbellInjection, function (data) {
            document.dispatchEvent(new CustomEvent('doorbell-injection', {detail: data}));
        }, [panelUrl]);


        bridge.on(events.oembedRequestRequired, function (imageObj) {
            bridge.emit(events.oembedRequestRequired, imageObj);
        }, [panelUrl]);

        bridge.on(events.copyToClipBoard, function (copyElement) {
            bridge.emit(events.copyToClipBoard, copyElement);
        }, [panelUrl]);


        bridge.on(events.startPageProcessing, function () {
            bridge.emit(bridge.events.l10nSetupLocale, locale, [panelUrl]);
        }, [panelUrl]);
        bridge.on(events.l10nSetupLocale, function () {
            scanForImages();
        }, [panelUrl]);

        /*
         =======================
         EXTENSION LISTENERS
         =======================
         */
        /**
         * Fires when query lookup is ready and we need to get annotations for image
         */
        bridge.on(events.imageDetailsRequired, function (imageObj) {
            bridge.emit(events.imageDetailsRequired, imageObj);
        });
        bridge.on(events.onImageAction, onImageActionHandler);
        bridge.on(events.hashRequired, function (imageObj) {
            blockhash(imageObj.uri, 16, 2, function (error, hash) {
                imageObj.error = error || null;
                imageObj.hash = hash || null;
                bridge.emit(events.hashCalculated, imageObj);
            });
        });
        bridge.on(events.imageDetailsReceived, function (imageObj) {
            bridge.emit(events.imageDetailsReceived, imageObj, [panelUrl]);
        });
        /**
         * Fires when we get info for image or error
         */
        bridge.on(events.newImageFound, function (imageObj) {
            //if we get lookup then decorate
            if (imageObj.lookup) {
                var element = dom.getElementByUUID(imageObj.uuid, document);
                if (element) {
                    imageDecorator.decorate(element, document, onImageActionHandler);
                }
            }
            bridge.emit(events.newImageFound, imageObj, [panelUrl]);
        });
        bridge.on(events.pluginStopped, function () {
            isPluginEnabled = false;
            $('#elogio-panel').remove();
            $('#elogio-button-panel').remove();
            undecorate();
        });
        bridge.on(events.pluginActivated, function (changedSettings) {
            isPluginEnabled = true;
            if ($) {
                $('#elogio-button-panel').show();
            }
            setPreferences(changedSettings);
            bridge.emit(events.startPageProcessing);
        });

        bridge.on(events.ready, function (data) {
            observer.observe(document.body, {attributes: true, childList: true, subtree: true});
            var template = $($.parseHTML(data.panelTemplate, document, true)),
                body = $('body');
            setPreferences(data.config);
            if (config.ui.highlightRecognizedImages) {
                body.addClass('elogio-highlight');
            } else {
                body.removeClass('elogio-highlight');
            }
            //injecting iFrame
            template.attr('src', panelUrl);
            body.append(template);
            initializeButton(body).elogioSidebar({side: 'right', duration: 300, clickClose: true});
            //attach port to panel
            portToPanel = document.getElementById('elogio-panel');
            bridge.registerClient(portToPanel, panelUrl);
        });
        portToPlugin.onMessage.addListener(function (request) {
            if (isPluginEnabled || request.eventName === events.pluginActivated) {
                bridge.emit(request.eventName, request.data, ['messaging'], request.from);
            }
        });
        bridge.emit(events.registration);


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
                        var uuid = mutation.removedNodes[i].getAttribute(config.ui.dataAttributeName);
                        if (uuid) {
                            bridge.emit(bridge.events.onImageRemoved, uuid);
                            bridge.emit(bridge.events.onImageRemoved, uuid, [panelUrl]);
                        }
                    }
                }
            });

            //we scan only added to DOM nodes, don't need to rescan all DOM
            scanForImages(nodesToBeProcessed);
        });
    }
)
;