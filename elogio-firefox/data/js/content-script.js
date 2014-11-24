new Elogio(
    ['config', 'utils', 'dom', 'imageDecorator', 'locator', 'messaging', 'bridge'],
    function (modules) {
        'use strict';
        var locator = modules.getModule('locator'),
            imageDecorator = modules.getModule('imageDecorator'),
            dom = modules.getModule('dom'),
            config = modules.getModule('config'),
            bridge = modules.getModule('bridge'),
            blockhash = blockhashjs.blockhash,
            feedbackImageObject;


        /*
         =======================
         PRIVATE MEMBERS
         =======================
         */
        var observer;
        // Initialize bridge
        bridge.registerClient(self.port);

        function displayFeedbackError(message) {
            var error = document.getElementById('elogio-feedback-error');
            error.innerHTML = message;
            error.style.display = 'block';
        }

        function hideFeedback(event) {
            var elem;
            if (event) {
                elem = event.target;
            } else {
                elem = document.getElementById('elogio-feedback-container');
            }
            if (elem.id === 'elogio-feedback-container') {
                document.getElementById('elogio-feedback-error').style.display = 'none';
                document.getElementById('elogio-feedback-success').style.display = 'none';
                document.getElementById('elogio-legend').style.display = 'block';
                elem.style.display = 'none';
            }
        }

        function submitFeedback() {
            var message = document.getElementById('elogio-feedback-textarea').value;
            document.getElementById('elogio-feedback-success').style.display = 'none';
            document.getElementById('elogio-feedback-error').style.display = 'none';
            if (!message || message.trim() === '') {
                displayFeedbackError('Message is required.');
                return;
            }
            var email = document.getElementById('elogio-feedback-email').value;
            if (!email) {
                displayFeedbackError('Email is required');
                return;
            }
            bridge.emit(bridge.events.feedBackMessage, {
                type: 'submit',
                data: {
                    message: message,
                    email: email,
                    imageObject: feedbackImageObject
                }
            });
            feedbackImageObject = null;
        }

        function responseReceived(response) {
            if (response.status === 201) {
                var success = document.getElementById('elogio-feedback-success');
                success.innerHTML = response.text;
                success.style.display = 'block';
            } else {
                displayFeedbackError(response.text);
            }
        }

        function scanForImages(nodes) {
            nodes = nodes || null;
            locator.findImages(document, nodes, function (imageObj) {
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


        //initialize feedback
        bridge.on(bridge.events.feedbackTemplateRequired, function (response) {
            var div = document.createElement('div');
            div.setAttribute('id', 'elogio-feedback-container');
            div.innerHTML = response;
            document.body.appendChild(div);
            //when clicked at around feedback window just hide it
            div.addEventListener('click', hideFeedback);
            var submitFeedbackButton = document.getElementById('elogio-feedback-submit-button');
            submitFeedbackButton.addEventListener('click', submitFeedback);
        });
        //show window when button clicked
        bridge.on(bridge.events.feedBackMessage, function (message) {
            if (message.type !== 'response') {
                if (message.data) {
                    feedbackImageObject = message.data;
                }
                document.getElementById('elogio-feedback-container').style.display = 'block';
            } else {
                responseReceived(message.response);
            }
        });
        bridge.emit(bridge.events.feedbackTemplateRequired);
        window.addEventListener('pageshow', function () {
            bridge.emit(bridge.events.pageShowEvent);
        }, false);

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
                imageDecorator.decorate(element, document, function (uuid) {
                    bridge.emit(bridge.events.onImageAction, uuid);
                });
            }
        });
        bridge.on(bridge.events.onImageAction, function (uuid) {
            var element = dom.getElementByUUID(uuid, document);
            if (element) {
                var position = element.getBoundingClientRect();
                //it is scroll top position
                var top = (position.top + window.pageYOffset || document.documentElement.scrollTop - document.documentElement.clientTop || document.body.clientTop);
                //it is scroll left position
                var left = (position.left + window.pageXOffset || document.documentElement.scrollLeft - document.documentElement.clientLeft || document.body.clientLeft);
                window.scrollTo(Math.round(left), Math.round(top));
            }
        });
        bridge.on(bridge.events.pluginActivated, function () {
            if (document.body) {
                /**
                 * careful, because we need to observe attributes too. For example: if node already exist in the DOM,
                 * and script of the page just set attribute 'url' of this node.
                 */
                observer.observe(document.body, {attributes: true, childList: true, subtree: true});
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
                        var uuid = mutation.removedNodes[i].getAttribute(config.ui.dataAttributeName);
                        if (uuid) {
                            bridge.emit(bridge.events.onImageRemoved, uuid);
                        }
                    }
                }
            });
            //we scan only added to DOM nodes, don't need to rescan all DOM
            scanForImages(nodesToBeProcessed);
        });
    }
);