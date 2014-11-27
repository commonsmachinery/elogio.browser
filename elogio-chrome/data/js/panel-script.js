$(document).ready(function () {
    'use strict';
    new Elogio(['config', 'utils', 'dom', 'imageDecorator', 'locator', 'messaging', 'bridge', 'sidebarHelper'], function (modules) {
        var bridge = modules.getModule('bridge'),
            config = modules.getModule('config'), sidebarHelper = modules.getModule('sidebarHelper');
        bridge.registerClient(null, 'messaging');
        var panelController = (function () {
            var object = {
                feedbackButton: $('#elogio-feedback'),
                helpButton: $('#elogio-help'),
                aboutButton: $('#elogio-about'),
                imageListView: $("#elogio-imageListView"),
                messageBox: $('#elogio-messageText'),
                locale: null
            };

            var sendTo = "*",
                from = document.URL;

            /**
             * Handler for content
             * @param event
             */
            function listenerForContent(event) {
                var request = event.data;
                if (isPluginEnabled || request.eventName === bridge.events.pluginActivated) {
                    bridge.emit(request.eventName, request.data, ['messaging']);
                }
            }

            if (window.addEventListener) {
                window.addEventListener("message", listenerForContent, false);
            } else {
                window.attachEvent("onmessage", listenerForContent);
            }

            var template = {
                imageItem: $("#elogio-image-template").html(),
                clipboardItem: $("#elogio-clipboard-template").html(),
                canvasTemplate: $('#elogio-canvas-template').html(),
                multipleMatch: $('#elogio-multiple-template').html(),
                singleMatch: $('#elogio-single-template').html(),
                detailsTemplate: $('#elogio-image-details-template').html()
            };
            var // eventHandlers = {},
                self = {},
                isPluginEnabled = true,
                port = window.parent;
            bridge.registerClient(port, sendTo);
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
                        sidebarHelper.addOrUpdateImageCard(object.imageListView, imageObjects[i], template, object.locale);
                    }
                    if (imageCardToOpen) {
                        sidebarHelper.openImage(imageCardToOpen.uuid, false, sendTo, from);
                    }
                }
            };

            self.receivedImageDataFromServer = function (imageObj) {
                var card = getImageCardByUUID(imageObj.uuid);
                card.data(config.sidebar.imageObject, imageObj);
                card.find('.image-not-found').hide();
                sidebarHelper.addOrUpdateImageCard(object.imageListView, imageObj, template, object.locale);
                if (!imageObj.allMatches || imageObj.currentMatchIndex === 0) {
                    card.find('.loading').hide();
                    card.find('.elogio-image-details').hide();
                    sidebarHelper.openImage(imageObj.uuid, true, sendTo, from);
                }
            };


            self.init = function () {
                // Compile mustache templates
                Mustache.parse(template.imageItem);
                Mustache.parse(template.canvasTemplate);
                Mustache.parse(template.clipboardItem);
                Mustache.parse(template.multipleMatch);
                Mustache.parse(template.singleMatch);
                Mustache.parse(template.detailsTemplate);
                bridge.on(bridge.events.l10nSetupLocale, function (locale) {
                    object.locale = locale;
                    $('#elogio-feedback').text(locale.feedbackLabel);
                    $('#elogio-help').text(locale.helpButtonLabel);
                    $('#elogio-about').text(locale.aboutButtonLabel);
                    bridge.emit(bridge.events.l10nSetupLocale, null, [sendTo], from);
                });
                // Subscribe for events
                bridge.on(bridge.events.newImageFound, function (imageObj) {
                    sidebarHelper.addOrUpdateImageCard(object.imageListView, imageObj, template, object.locale);
                    self.displayMessages();
                });


                //from main.js we get a message which mean: we need to get details of image, because hash lookup was received
                bridge.on(bridge.events.imageDetailsRequired, function (imageObj) {
                    //and send it back
                    bridge.emit(bridge.events.imageDetailsRequired, imageObj, [sendTo], from);
                });


                //if image disappear from page then we need to remove it at here too
                bridge.on(bridge.events.onImageRemoved, function (uuid) {
                    getImageCardByUUID(uuid).remove();
                });

                bridge.on(bridge.events.onImageAction, function (uuid) {
                    sidebarHelper.openImage(uuid, false, sendTo, from);
                });

                bridge.on(bridge.events.imageDetailsReceived, function (imageObject) {
                    self.receivedImageDataFromServer(imageObject);
                });

                bridge.on(bridge.events.startPageProcessing, function () {
                    self.hideMessage();
                    if (object.imageListView.length) {
                        object.imageListView.empty();
                    }
                    bridge.emit(bridge.events.startPageProcessing, null, [sendTo], from);
                });
                bridge.on(bridge.events.feedBackMessage, function (message) {
                    if (message.type === 'giveMeScreenshot') {
                        html2canvas(document.body, {
                            onrendered: function (canvas) {
                                var dataURL = canvas.toDataURL('image/jpeg');
                                bridge.emit(bridge.events.feedBackMessage, {
                                    type: 'giveMeScreenshot',
                                    data: {
                                        width: document.documentElement.clientWidth,
                                        height: document.documentElement.clientHeight,
                                        url: dataURL
                                    }
                                }, [sendTo], from);
                            },
                            useCORS: true,
                            allowTaint: false,
                            //sreenshoting only visible part
                            width: document.documentElement.clientWidth,
                            height: document.documentElement.clientHeight
                        });
                    }
                });
                object.imageListView.on('click', '.image-card .elogio-report-work', function () {
                    var imageCard = $(this).closest('.image-card'),
                        imageObj = imageCard.data(config.sidebar.imageObject);
                    bridge.emit(bridge.events.feedBackMessage, {type: 'message', data: imageObj}, [sendTo], from);
                });
                object.feedbackButton.on('click', function () {
                    bridge.emit(bridge.events.feedBackMessage, {type: 'message', data: null}, [sendTo], from);
                });

                //handle click on copy as html button
                object.imageListView.on('click', '.image-card .elogio-clipboard-html', function () {
                    sidebarHelper.copyAsHTML($(this).closest('.image-card'), template.clipboardItem, sendTo, from);
                });
                //handle click on copy as json button
                object.imageListView.on('click', '.image-card .elogio-clipboard-json', function () {
                    sidebarHelper.copyAsJSON($(this).closest('.image-card'), sendTo, from);
                });
                //handle click on image card
                object.imageListView.on('click', '.image-card .elogio-img', function () {
                    var card = $(this).closest('.image-card');
                    var imageObj = card.data(config.sidebar.imageObject);
                    bridge.emit(bridge.events.onImageAction, imageObj.uuid, [sendTo], from);
                    sidebarHelper.openImage(imageObj.uuid, false, sendTo, from);
                });
                //handle click on query button
                object.imageListView.on('click', '.image-card .query-button', function () {
                    //if query never clicked
                    var button = $(this);
                    if (!button.hasClass('disabled')) {
                        var imageCard = $(this).closest('.image-card');
                        var imageObj = imageCard.data(config.sidebar.imageObject);
                        imageCard.find('.query-loading').show();
                        button.find('.elogio-query-message').text(object.locale.querying);
                        button.addClass('disabled');
                        bridge.emit(bridge.events.oembedRequestRequired, imageObj, [sendTo], from);
                    }
                });
                object.imageListView.on('click', '.image-card .several-matches .previous', function () {
                    var imageCard = $(this).closest('.image-card');
                    var imageObj = imageCard.data(config.sidebar.imageObject);
                    if (imageObj.currentMatchIndex > 0) {
                        imageCard.find('.loading').show();
                        imageCard.find('.image-not-found').hide();
                        imageObj.currentMatchIndex--;
                        imageObj.lookup = imageObj.allMatches[imageObj.currentMatchIndex];
                        sidebarHelper.addOrUpdateImageCard(object.imageListView, imageObj, template, object.locale);
                    } else {
                        //do nothing, because it is first matched element
                    }
                });
                object.imageListView.on('click', '.image-card .several-matches .next', function () {
                    var imageCard = $(this).closest('.image-card');
                    var imageObj = imageCard.data(config.sidebar.imageObject);
                    if (imageObj.allMatches && imageObj.allMatches.length - 1 > imageObj.currentMatchIndex) {
                        imageObj.currentMatchIndex++;
                        imageObj.lookup = imageObj.allMatches[imageObj.currentMatchIndex];
                        //if next element already exist then we don't need to do query
                        if (imageObj.details.length > imageObj.currentMatchIndex) {
                            sidebarHelper.addOrUpdateImageCard(object.imageListView, imageObj, template, object.locale);
                        } else {
                            //if next element doesn't exist then query
                            bridge.emit(bridge.events.imageDetailsRequired, imageObj, [sendTo], from);
                        }
                    } else {
                        //do nothing, because it is last matched element
                    }
                });
            };
            bridge.emit(bridge.events.startPageProcessing, null, [sendTo], from);
            return self;
        })();
        panelController.init();
    });
});
