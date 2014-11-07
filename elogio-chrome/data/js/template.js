$(document).ready(function () {
    'use strict';
    new Elogio(['config', 'utils', 'dom', 'imageDecorator', 'locator', 'bridge', 'sidebarHelper', 'messaging'], function (modules) {
        var bridge = modules.getModule('bridge'), messaging = modules.getModule('messaging'),
            config = modules.getModule('config'), sidebarHelper = modules.getModule('sidebarHelper');
        var panelController = (function () {
            var object = {
                feedbackButton: $('#elogio-feedback'),
                imageListView: $("#elogio-imageListView"),
                messageBox: $('#elogio-messageText'),
                locale: null
            };
            var sendTo = "*";

            /**
             * Handler for content
             * @param event
             */
            function listenerForContent(event) {
                var request = event.data;
                if (isPluginEnabled || request.eventName === bridge.events.pluginActivated) {
                    messaging.emit(request.eventName, request.data);
                }
            }

            if (window.addEventListener) {
                window.addEventListener("message", listenerForContent, false);
            } else {
                window.attachEvent("onmessage", listenerForContent);
            }

            var template = {
                imageItem: $("#elogio-image-template").html(),
                clipboardItem: $("#elogio-clipboard-template").html()
            };
            var // eventHandlers = {},
                self = {},
                isPluginEnabled = true,
                port = window.parent;

            self.displayMessages = function () {
                if (!object.imageListView.children().length) {
                    if (isPluginEnabled) {
                        self.showMessage("Refresh the page to start");
                    } else {
                        self.showMessage("Enable plugin to start");
                    }
                } else {
                    self.hideMessage();
                }
            };

            // method needs to init data in the template


            self.showMessage = function (html) {
                object.messageBox.html(html);
                object.messageBox.fadeIn('fast');
            };

            function getImageCardByUUID(uuid) {
                return $('#' + uuid);
            }

            self.hideMessage = function () {
                object.messageBox.html('');
                object.messageBox.hide();
            };


            self.loadImages = function (imageObjects, imageCardToOpen) {
                var i;
                // Clear list
                if (object.imageListView.length) {
                    object.imageListView.empty();
                }
                // Add all objects
                if (imageObjects) {
                    for (i = 0; i < imageObjects.length; i += 1) {
                        sidebarHelper.addOrUpdateImageCard(object.imageListView, imageObjects[i], template.imageItem, object.locale);
                    }
                    if (imageCardToOpen) {
                        self.openImage(imageCardToOpen.uuid);
                    }
                }
            };

            self.receivedImageDataFromServer = function (imageObj) {
                var card = getImageCardByUUID(imageObj.uuid);
                card.data(config.sidebar.imageObject, imageObj);
                sidebarHelper.addOrUpdateImageCard(object.imageListView, imageObj, template.imageItem, object.locale);
                card.find('.loading').hide();
                card.find('.elogio-image-details').hide();
                self.openImage(imageObj.uuid, true);
            };


            self.openImage = function (imageUUID, preventAnnotationsLoading) {
                var imageCard = getImageCardByUUID(imageUUID);
                $('html, body').animate({scrollTop: imageCard.offset().top}, 500);
                var imageObj = imageCard.data(config.sidebar.imageObject);
                if (imageObj.details) {
                    imageCard.find('.elogio-image-details').toggle();
                    imageCard.find('.image-found').show();
                    imageCard.find('.image-not-found').hide();
                } else if (!imageObj.lookup) {
                    var notFound = imageCard.find('.elogio-not-found');
                    if (!notFound.is(':visible')) {//if image data does not exist then we hide always query button
                        imageCard.find('.elogio-image-details').toggle();
                        imageCard.find('.image-found').hide();
                        imageCard.find('.elogio-not-found').show();
                    }
                }
                if (!preventAnnotationsLoading && !imageObj.details && imageObj.lookup) { //if details doesn't exist then send request to server
                    imageCard.find('.loading').show();//if we need annotations we wait for response
                    port.postMessage({eventName: bridge.events.imageDetailsRequired, data: imageObj, from: 'panel'}, sendTo);
                }
                imageCard.highlight();
            };
            self.init = function () {
                // Compile mustache templates
                Mustache.parse(template.imageItem);
                messaging.on(bridge.events.l10nSetupLocale, function (locale) {
                    object.locale = locale;
                    $('#elogio-feedback').text(locale.feedbackLabel);
                    port.postMessage({eventName: bridge.events.l10nSetupLocale, from: 'panel'}, sendTo);
                });
                // Subscribe for events
                messaging.on(bridge.events.newImageFound, function (imageObj) {
                    sidebarHelper.addOrUpdateImageCard(object.imageListView, imageObj, template.imageItem, object.locale);
                    self.displayMessages();
                });


                //from main.js we get a message which mean: we need to get details of image, because hash lookup was received
                messaging.on(bridge.events.imageDetailsRequired, function (imageObj) {
                    //and send it back
                    port.postMessage({eventName: bridge.events.imageDetailsRequired, data: imageObj, from: 'panel'}, sendTo);
                });


                //if image disappear from page then we need to remove it at here too
                messaging.on(bridge.events.onImageRemoved, function (uuid) {
                    getImageCardByUUID(uuid).remove();
                });

                messaging.on(bridge.events.onImageAction, function (uuid) {
                    self.openImage(uuid);
                });

                messaging.on(bridge.events.imageDetailsReceived, function (imageObject) {
                    self.receivedImageDataFromServer(imageObject);
                });

                messaging.on(bridge.events.startPageProcessing, function () {
                    self.hideMessage();
                    if (object.imageListView.length) {
                        object.imageListView.empty();
                    }
                    port.postMessage({eventName: bridge.events.startPageProcessing, from: 'panel'}, sendTo);
                });

                object.imageListView.on('click', '.image-card .elogio-report-work', function () {
                    var imageCard = $(this).closest('.image-card'),
                        imageObj = imageCard.data(config.sidebar.imageObject);
                    port.postMessage({eventName: bridge.events.doorBellInjection, from: 'panel', data: {eventName: 'report', uri: imageObj.uri}}, sendTo);
                });
                object.feedbackButton.on('click', function () {
                    port.postMessage({eventName: bridge.events.doorBellInjection, from: 'panel', data: {eventName: 'feedbackClick'}}, sendTo);
                });

                //handle click on copy as html button
                object.imageListView.on('click', '.image-card .elogio-clipboard-html', function () {
                    var imageCard = $(this).closest('.image-card'),
                        imageObj = imageCard.data(config.sidebar.imageObject), annotations,
                        copyToClipBoard;
                    annotations = new Elogio.Annotations(imageObj, config);
                    annotations.uri = imageObj.uri;
                    if (imageObj.details) {
                        sidebarHelper.initAnnotationsForCopyHandler(annotations);
                    }
                    copyToClipBoard = Mustache.render(template.clipboardItem, {'imageObj': annotations});
                    port.postMessage({eventName: bridge.events.copyToClipBoard, data: {clipboardData: copyToClipBoard, type: 'html'}, from: 'panel'}, sendTo);
                });
                //handle click on copy as json button
                object.imageListView.on('click', '.image-card .elogio-clipboard-json', function () {
                    var imageCard = $(this).closest('.image-card'),
                        imageObj = imageCard.data(config.sidebar.imageObject), annotations,
                        copyToClipBoard;
                    annotations = new Elogio.Annotations(imageObj, config);
                    annotations.uri = imageObj.uri;
                    if (imageObj.details) {
                        sidebarHelper.initAnnotationsForCopyHandler(annotations);
                    }
                    copyToClipBoard = sidebarHelper.jsonToString(annotations);
                    port.postMessage({eventName: bridge.events.copyToClipBoard, data: {clipboardData: copyToClipBoard, type: 'text'}, from: 'panel'}, sendTo);
                });
                //handle click on copy as image button
                object.imageListView.on('click', '.image-card .elogio-clipboard-img', function () {
                    var imageCard = $(this).closest('.image-card');
                    sidebarHelper.createCanvas(document, imageCard, function (url) {
                        port.postMessage({eventName: bridge.events.copyToClipBoard, data: {clipboardData: url, type: 'image'}, from: 'panel'}, sendTo);
                    });
                });
                //handle click on image card
                object.imageListView.on('click', '.image-card img', function () {
                    var card = $(this).closest('.image-card');
                    var imageObj = card.data(config.sidebar.imageObject);
                    port.postMessage({eventName: bridge.events.onImageAction, data: imageObj.uuid, from: 'panel'}, sendTo);
                    self.openImage(imageObj.uuid);
                });
                //handle click on query button
                object.imageListView.on('click', '.image-card .query-button', function () {
                    var imageCard = $(this).closest('.image-card');
                    var imageObj = imageCard.data(config.sidebar.imageObject);
                    imageCard.find('.loading').show();
                    imageCard.find('.image-not-found').hide();
                    port.postMessage({eventName: bridge.events.oembedRequestRequired, data: imageObj, from: 'panel'}, sendTo);
                });

            };
            port.postMessage({eventName: bridge.events.startPageProcessing, from: 'panel'}, sendTo);
            return self;
        })();
        panelController.init();
    });
});
