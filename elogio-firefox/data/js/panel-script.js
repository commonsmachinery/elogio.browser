$(document).ready(function () {
    'use strict';
    new Elogio(['config', 'utils', 'dom', 'imageDecorator', 'locator', 'messaging', 'bridge', 'sidebarHelper'], function (modules) {
        var bridge = modules.getModule('bridge'), config = modules.getModule('config'), sidebarHelper = modules.getModule('sidebarHelper');
        var panelController = (function () {
            var object = {
                feedbackButton: $('#elogio-feedback'),
                imageListView: $("#elogio-imageListView"),
                helpButton: $('#elogio-help'),
                aboutButton: $('#elogio-about'),
                messageBox: $('#elogio-messageText'),
                locale: null
            };
            var template = {
                imageItem: $("#elogio-image-template").html(),
                clipboardItem: $("#elogio-clipboard-template").html(),
                canvasTemplate: $('#elogio-canvas-template').html(),
                multipleMatch: $('#elogio-multiple-template').html(),
                singleMatch: $('#elogio-single-template').html(),
                detailsTemplate: $('#elogio-image-details-template').html()
            };
            var
                self = {},
                isPluginEnabled = true;

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
                        sidebarHelper.openImage(imageCardToOpen);
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
                    sidebarHelper.openImage(imageObj.uuid, true);
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
                //at first we need to setup locale
                bridge.on(bridge.events.l10nSetupLocale, function (locale) {
                    object.locale = locale;
                });

                // Subscribe for events
                bridge.on(bridge.events.newImageFound, function (imageObj) {
                    sidebarHelper.addOrUpdateImageCard(object.imageListView, imageObj, template, object.locale);
                    self.displayMessages();
                });

                bridge.on(bridge.events.pluginActivated, function () {
                    isPluginEnabled = true;
                });

                //from main.js we get a message which mean: we need to get details of image, because hash lookup was received
                bridge.on(bridge.events.imageDetailsRequired, function (imageObj) {
                    //and send it back
                    bridge.emit(bridge.events.imageDetailsRequired, imageObj);
                });

                bridge.on(bridge.events.pluginStopped, function () {
                    isPluginEnabled = false;
                    self.displayMessages();
                });

                bridge.on(bridge.events.tabSwitched, function (data) {
                    if (isPluginEnabled) {//if plugin disabled we don't need load any images
                        self.loadImages(data.images, data.imageCardToOpen);
                        self.displayMessages();
                    }
                });

                //if image disappear from page then we need to remove it at here too
                bridge.on(bridge.events.onImageRemoved, function (uuid) {
                    getImageCardByUUID(uuid).remove();
                });

                bridge.on(bridge.events.onImageAction, function (uuid) {
                    sidebarHelper.openImage(uuid);
                });

                bridge.on(bridge.events.imageDetailsReceived, function (imageObject) {
                    self.receivedImageDataFromServer(imageObject);
                });

                bridge.on(bridge.events.startPageProcessing, function () {
                    self.hideMessage();
                    if (object.imageListView.length) {
                        object.imageListView.empty();
                    }
                    bridge.emit(bridge.events.startPageProcessing);
                });

                object.imageListView.on('click', '.image-card .elogio-report-work', function () {
                    var imageCard = $(this).closest('.image-card'),
                        imageObj = imageCard.data(config.sidebar.imageObject);
                    bridge.emit(bridge.events.feedBackMessage, {type: 'message', data: imageObj});
                });
                object.feedbackButton.on('click', function () {
                    bridge.emit(bridge.events.feedBackMessage, {type: 'message', data: null});
                });

                //handle click on copy as html button
                object.imageListView.on('click', '.image-card .elogio-clipboard-html', function () {
                    sidebarHelper.copyAsHTML($(this).closest('.image-card'), template.clipboardItem);
                });
                //handle click on copy as json button
                object.imageListView.on('click', '.image-card .elogio-clipboard-json', function () {
                    sidebarHelper.copyAsJSON($(this).closest('.image-card'));
                });
                //handle click on image card
                object.imageListView.on('click', '.image-card .elogio-img', function () {
                    var card = $(this).closest('.image-card');
                    var imageObj = card.data(config.sidebar.imageObject);
                    bridge.emit(bridge.events.onImageAction, imageObj.uuid);
                    sidebarHelper.openImage(imageObj.uuid);
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
                        bridge.emit(bridge.events.oembedRequestRequired, imageObj);
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
                            bridge.emit(bridge.events.imageDetailsRequired, imageObj);
                        }
                    } else {
                        //do nothing, because it is last matched element
                    }
                });
            };

            return self;
        })();
        // Initialize bridge
        bridge.registerClient(addon.port);               // Default transport: link chrome
        //bridge.registerClient(panelController, 'panel'); // panel controller itself
        panelController.init();
    });
});
