new Elogio(
    ['config', 'utils', 'dom', 'imageDecorator', 'locator', 'bridge', 'sidebarModule', 'messaging'],
    function (modules) {
        'use strict';
        var locator = modules.getModule('locator'),
            bridge = modules.getModule('bridge'),
            messaging = modules.getModule('messaging'),
            sidebarModule = modules.getModule('sidebarModule'),
            dom = modules.getModule('dom'),
            imageDecorator = modules.getModule('imageDecorator'),
            config = modules.getModule('config'),
            events = bridge.events;

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

        messaging.on(events.jqueryRequired, function () {
            port.postMessage({eventName: events.sidebarRequired});
        });
        messaging.on(events.pluginStopped, function () {
            undecorate();
        });
        messaging.on(events.startPageProcessing, function () {
            //is needed before startPageProcessing because it means what popup was closed and is active now
            undecorate();
            scanForImages();
        });
        messaging.on(events.ready, function (request) {
            var template = $.parseHTML(request.template),
                button = document.createElement('img'),
                body = $('body'), sidebar;
            $(button).addClass('elogio-button');
            $(button).attr('href', "#elogio-panel");
            var imgURL = chrome.extension.getURL("img/icon_48.png");
            body.append(template);
            body.append($(button));
            $(button).attr('src', imgURL);
            sidebar = $('#elogio-panel');
            $(button).elogioSidebar({side: 'right', duration: 300, clickClose: true});
            sidebarModule.startPageProcessing(document, null, sidebar, port);
        });
        var port = chrome.runtime.connect({name: "content"});
        port.onMessage.addListener(function (request) {
            messaging.emit(request.eventName, request);
        });
        port.postMessage({eventName: 'registration'});
        //initialize jquery
        if (!window.jQuery || !window.$) {
            port.postMessage({eventName: events.jqueryRequired});//jquery required
        } else {
            port.postMessage({eventName: events.sidebarRequired});
        }
    }
);