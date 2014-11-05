$(document).ready(function () {
    'use strict';
    new Elogio(['config', 'utils', 'dom', 'imageDecorator', 'locator', 'bridge', 'sidebarHelper'], function (modules) {
        var bridge = modules.getModule('bridge'), config = modules.getModule('config'), sidebarHelper = modules.getModule('sidebarHelper');
        var panelController = (function () {
            var object = {
                feedbackButton: $('#elogio-feedback'),
                imageListView: $("#elogio-imageListView"),
                messageBox: $('#elogio-messageText'),
                locale: null
            };
            var template = {
                imageItem: $("#elogio-image-template").html(),
                clipboardItem: $("#elogio-clipboard-template").html()
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


            self.startPlugin = function () {
                if (!isPluginEnabled) {
                    // Clear existing list of
                    if (object.imageListView.length) {
                        object.imageListView.empty();
                    }
                    bridge.emit(bridge.events.pluginActivated);
                }
            };

            self.stopPlugin = function () {
                if (isPluginEnabled) { //if already stopped then we don't need to stop the plugin again
                    if (object.imageListView.length) {
                        object.imageListView.empty();
                    }
                    bridge.emit(bridge.events.pluginStopped);
                }
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
                        self.openImage(imageCardToOpen);
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
                    bridge.emit(bridge.events.imageDetailsRequired, imageObj);
                }
                imageCard.highlight();
            };
            self.init = function () {
                //at first we need to setup locale
                bridge.on(bridge.events.l10nSetupLocale, function (locale) {
                    // Compile mustache templates
                    object.locale = locale;
                    Mustache.parse(template.imageItem);
                    Mustache.parse(template.canvasTemplate);
                });

                // Subscribe for events
                bridge.on(bridge.events.newImageFound, function (imageObj) {
                    sidebarHelper.addOrUpdateImageCard(object.imageListView, imageObj, template.imageItem, object.locale);
                    self.displayMessages();
                });

                bridge.on(bridge.events.pluginActivated, function () {
                    isPluginEnabled = true;
                    self.startPlugin();
                });

                //from main.js we get a message which mean: we need to get details of image, because hash lookup was received
                bridge.on(bridge.events.imageDetailsRequired, function (imageObj) {
                    //and send it back
                    bridge.emit(bridge.events.imageDetailsRequired, imageObj);
                });

                bridge.on(bridge.events.pluginStopped, function () {
                    isPluginEnabled = false;
                    self.stopPlugin();
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
                    self.openImage(uuid);
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
                    /* global doorbell */
                    doorbell.setProperty('uri', imageObj.uri);
                    doorbell.show();
                });
                object.feedbackButton.on('click', function () {
                    /* global doorbell */
                    doorbell.show();
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
                    bridge.emit(bridge.events.copyToClipBoard, {data: copyToClipBoard, type: 'html'});
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
                    bridge.emit(bridge.events.copyToClipBoard, {data: copyToClipBoard, type: 'text'});
                });
                //handle click on copy as image button
                object.imageListView.on('click', '.image-card .elogio-clipboard-img', function () {
                    var imageCard = $(this).closest('.image-card');
                    sidebarHelper.createCanvas(document, imageCard, function (url) {
                        bridge.emit(bridge.events.copyToClipBoard, {data: url, type: 'image'});
                    });
                });
                //handle click on image card
                object.imageListView.on('click', '.image-card img', function () {
                    var card = $(this).closest('.image-card');
                    var imageObj = card.data(config.sidebar.imageObject);
                    bridge.emit(bridge.events.onImageAction, imageObj.uuid);
                    self.openImage(imageObj.uuid);
                });
                //handle click on query button
                object.imageListView.on('click', '.image-card .query-button', function () {
                    var imageCard = $(this).closest('.image-card');
                    var imageObj = imageCard.data(config.sidebar.imageObject);
                    imageCard.find('.loading').show();
                    imageCard.find('.image-not-found').hide();
                    bridge.emit(bridge.events.hashRequired, imageObj);
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
