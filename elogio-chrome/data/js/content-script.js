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
            events = bridge.events,
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
                        var element = sidebarModule.getImageCardByUUID(uuid);
                        $('#elogio-panel').animate({scrollTop: element.offset().top}, 500, 'swing', function () {
                            sidebarModule.openImage(uuid);
                        });
                    });
                }
            }
            sidebarModule.addOrUpdateCard(imageObj);
        });
        messaging.on(events.pluginStopped, function () {
            isPluginEnabled = false;
            if ($) {
                var sideBar = $('#elogio-panel');
                sideBar.hide();
                sidebarModule.cleanUp();
                $('#elogio-button-panel').hide();
            }
            undecorate();
        });
        messaging.on(events.pluginActivated, function () {
            isPluginEnabled = true;
            if ($) {
                $('#elogio-button-panel').show();
            }
            port.postMessage({eventName: events.startPageProcessing});
        });
        messaging.on(events.startPageProcessing, function () {
            //is needed before startScan because it means what popup was closed and is active now
            undecorate();
            scanForImages();
        });
        messaging.on(events.ready, function (templateString) {
            var template = $.parseHTML(templateString),
                button = document.createElement('img'),
                body = $('body'), sidebar;
            $(button).addClass('elogio-button');
            $(button).attr('href', "#elogio-panel");
            $(button).attr('id', 'elogio-button-panel');
            var imgURL = chrome.extension.getURL("img/icon_48.png");
            body.append(template);
            body.append($(button));
            $(button).attr('src', imgURL);
            sidebar = $('#elogio-panel');
            $(button).elogioSidebar({side: 'right', duration: 300, clickClose: true});
            sidebarModule.startScan(document, null, sidebar, port, finish);
        });
        var port = chrome.runtime.connect({name: "content"});
        port.onMessage.addListener(function (request) {
            if (isPluginEnabled || request.eventName === events.pluginActivated) {
                messaging.emit(request.eventName, request.data);
            }
        });
        port.postMessage({eventName: 'registration'});
        //initialize jquery
        //initialize jquery
        if (!window.jQuery || !window.$) {
            port.postMessage({eventName: events.jqueryRequired});//jquery required
        } else {
            port.postMessage({eventName: events.sidebarRequired});
        }
    }
);