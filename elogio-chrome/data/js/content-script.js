new Elogio(
    ['config', 'utils', 'dom', 'imageDecorator', 'locator', 'bridge', 'sidebarModule'],
    function (modules) {
        'use strict';
        var locator = modules.getModule('locator'),
            bridge = modules.getModule('bridge'),
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
                //it means what jquery loaded
                case 'jquery':
                    port.postMessage({eventName: 'sidebar'});
                    break;
                //it means what all scripts are loaded and we can start page processing
                case 'ready':
                    //also at here we can get template from 'request'
                    var template = $.parseHTML(request.template),
                        button = document.createElement('a'),
                        body = $('body'), sidebar;
                    $(button).addClass('elogio-button');
                    $(button).attr('href', "#elogio-panel");
                    $(button).text('open');
                    body.append(template);
                    body.append($(button));
                    sidebar = $('#elogio-panel');
                    $(button).elogioSidebar({side: 'right', duration: 300, clickClose: true});
                    sidebarModule.startPageProcessing(document, null, sidebar);
                    break;
            }
        });
        port.postMessage('registration');
        //initialize jquery
        if (!window.jQuery || !window.$) {
            port.postMessage({eventName: 'jquery'});//jquery required
        } else {
            port.postMessage({eventName: 'sidebar'});
        }
    }
);