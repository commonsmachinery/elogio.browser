new Elogio(
    ['config', 'utils', 'dom', 'imageDecorator', 'locator', 'bridge'],
    function (modules) {
        'use strict';
        var locator = modules.getModule('locator'),
            bridge = modules.getModule('bridge'),
            dom = modules.getModule('dom'),
            imageDecorator = modules.getModule('imageDecorator'),
            config = modules.getModule('config'),
            events = bridge.events;
        //imageDecorator = modules.getModule('imageDecorator'),

        /*
         =======================
         PRIVATE MEMBERS
         =======================
         */
        function scanForImages(nodes) {
            nodes = nodes || null;
            locator.findImages(document, nodes, function (imageObj) {
                port.postMessage({eventName: events.newImageFound, image: imageObj});
            }, function () {
                //on error
            }, function () {
                //on finished
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
        }

        var port = chrome.runtime.connect({name: "content"});
        port.onMessage.addListener(function (request) {
            switch (request.eventName) {
                case events.startPageProcessing:
                    //is needed before startPageProcessing because it means what popup was closed and is active now
                    undecorate();
                    scanForImages();
                    break;
                case events.pluginStopped:
                    undecorate();
                    break;
            }
        });
        port.postMessage('registration');
        //initialize jquery
        if (!window.jQuery || !window.$) {
            port.postMessage({eventName: 'jquery'});//jquery required
        }
    }
);