$(document).ready(function () {
    'use strict';
    new Elogio(['config', 'utils', 'dom', 'imageDecorator', 'locator', 'bridge'], function (modules) {
        var bridge = modules.getModule('bridge'), config = modules.getModule('config');
        var panelController = (function () {
            var object = {
                onButton: $('#on'),
                offButton: $('#off'),
                imageListView: $("#imageListView"),
                messageBox: $('#messageText')
            };
            var constants = {
                imageObject: 'imageObj'
            };
            var template = {
                imageItem: $("#image-template").html(),
                clipboardItem: $("#clipboard-template").html()
            };
            var eventHandlers = {},
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
            self.on = function (eventName, callback) {
                eventHandlers[eventName] = callback;
            };
            self.emit = function (eventName, argument) {
                if (eventHandlers[eventName]) {
                    eventHandlers[eventName](argument);
                }
            };
            // method needs to init data in the template
            self.initializeDetails = function (imageObj, cardElement) {
                var annotations = new Elogio.Annotations(imageObj, config);
                if (imageObj.details) { // If we were abe to get annotations - populate details
                    if (annotations.getCreatorLabel()) {
                        cardElement.find('.elogio-owner').text('Image by ' + annotations.getCreatorLabel());
                    } else {
                        cardElement.find('.elogio-owner').hide();
                    }
                    cardElement.find('.elogio-addedAt').text('Added at: ' + annotations.getAddedAt());
                    cardElement.find('.elogio-locatorlink').attr('href', annotations.getLocatorLink());
                    if (annotations.getTitle()) {
                        cardElement.find('.elogio-annotations-title').text('title: ' + annotations.getTitle());
                    } else {
                        cardElement.find('.elogio-annotations-title').hide();
                    }
                    if (annotations.getGravatarLink()) {//if exist profile then draw gravatar
                        cardElement.find('.elogio-gravatar').attr('src', annotations.getGravatarLink());
                    } else {
                        cardElement.find('.elogio-gravatar').hide();//if no gravatar then hide
                    }
                    if (annotations.getLicenseLabel()) {
                        cardElement.find('.elogio-license').text('License: ' + annotations.getLicenseLabel());
                    } else {
                        cardElement.find('.elogio-license').hide();
                    }
                    if (annotations.getLicenseLink()) {
                        cardElement.find('.elogio-license-link').attr('href', annotations.getLicenseLink());
                    } else {
                        cardElement.find('.elogio-license-link').hide();
                    }
                } else { // Otherwise - show message
                    cardElement.find('.message-area').text('Sorry, no data available').show();
                }
            };

            self.showMessage = function (html) {
                object.messageBox.html(html);
                object.messageBox.fadeIn('fast');
            };

            self.hideMessage = function () {
                object.messageBox.html('');
                object.messageBox.hide();
            };
            self.addOrUpdateImageCard = function (imageObj) {
                // Try to find existing card and create the new one if it wasn't rendered before
                var cardElement = getImageCardByUUID(imageObj.uuid);
                if (!cardElement.length) {
                    cardElement = $(Mustache.render(template.imageItem, {'imageObj': imageObj}));
                    cardElement.data(constants.imageObject, imageObj);
                    object.imageListView.append(cardElement);
                }
                // If we didn't send lookup query before - show loading
                if (!imageObj.hasOwnProperty('lookup') && !imageObj.hasOwnProperty('error')) {
                    cardElement.find('.loading').show();
                    return; // Waiting for lookup....
                } else {
                    cardElement.find('.loading').hide();
                    cardElement.find('.message-area').hide();
                }
                // If there is lookup data available check if there is image details
                var errorArea = cardElement.find('.error-area');
                if (imageObj.lookup && imageObj.lookup.href && !imageObj.error) {
                    cardElement.data(constants.imageObject, imageObj);// save lookup data to card
                    if (imageObj.hasOwnProperty('details')) { // If annotations were loaded...
                        self.initializeDetails(imageObj, cardElement);
                        errorArea.hide();//hide this anyway because it is wrong show both of messages
                    } else {
                        // Nothing to do hear just waiting when user clicks on image to query details
                    }
                } else { // Show Query button
                    cardElement.find('.image-details').hide();
                    if (!imageObj.error) {
                        cardElement.find('.no-lookup-data').show();
                        errorArea.hide();//hide this anyway because it is wrong show both of messages
                    } else {
                        //at here imageObj has errors and need to show it in sidebar
                        errorArea.text(imageObj.error);
                        errorArea.show();
                    }
                }
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
                        self.addOrUpdateImageCard(imageObjects[i]);
                    }
                    if (imageCardToOpen) {
                        self.openImage(imageCardToOpen.uuid);
                    }
                }
            };

            self.receivedImageDataFromServer = function (imageObj) {
                var card = getImageCardByUUID(imageObj.uuid);
                card.data(constants.imageObject, imageObj);
                self.addOrUpdateImageCard(imageObj);
                self.openImage(imageObj.uuid, true);
            };
            function getImageCardByUUID(uuid) {
                return $('#' + uuid);
            }

            self.openImage = function (imageUUID, preventAnnotationsLoading) {
                var imageCard = getImageCardByUUID(imageUUID);
                $('html, body').animate({scrollTop: imageCard.offset().top}, 500);
                var imageObj = imageCard.data(constants.imageObject);
                if (imageObj.details) {
                    imageCard.find('.image-details').toggle();
                }
                if (!preventAnnotationsLoading && !imageObj.details && imageObj.lookup) { //if details doesn't exist then send request to server
                    imageCard.find('.loading').show();//if we need annotations we wait for response
                    bridge.emit(bridge.events.imageDetailsRequired, imageObj);
                }
                imageCard.highlight();
            };
            self.init = function () {
                // Compile mustache templates
                Mustache.parse(template.imageItem);

                // Subscribe for events
                bridge.on(bridge.events.newImageFound, function (imageObj) {
                    self.addOrUpdateImageCard(imageObj);
                    self.displayMessages();
                });

                bridge.on(bridge.events.pluginActivated, function () {
                    object.onButton.hide();
                    object.offButton.show();
                    isPluginEnabled = true;
                    self.startPlugin();
                });

                //from main.js we get a message which mean: we need to get details of image, because hash lookup was received
                bridge.on(bridge.events.imageDetailsRequired, function (imageObj) {
                    //and send it back
                    bridge.emit(bridge.events.imageDetailsRequired, imageObj);
                });

                bridge.on(bridge.events.pluginStopped, function () {
                    object.onButton.show();
                    object.offButton.hide();
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

                bridge.on(bridge.events.onImageAction, function (imageObject) {
                    self.openImage(imageObject.uuid);
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

                object.onButton.on('click', self.startPlugin);
                object.offButton.on('click', self.stopPlugin);
                //handle click on copy button
                object.imageListView.on('click', '.image-card .elogio-clipboard', function () {
                    var imageCard = $(this).closest('.image-card'),
                        imageObj = imageCard.data(constants.imageObject), annotations,
                        copyToClipBoard;
                    annotations = new Elogio.Annotations(imageObj, config);
                    annotations.uri = imageObj.uri;
                    if (imageObj.details) {
                        annotations.locatorLink = annotations.getLocatorLink();
                        annotations.titleLabel = annotations.getTitle();
                        annotations.creatorLink = annotations.getCreatorLink();
                        annotations.creatorLabel = annotations.getCreatorLabel();
                        annotations.licenseLink = annotations.getLicenseLink();
                        annotations.licenseLabel = annotations.getLicenseLabel();
                        annotations.copyrightLink = annotations.getCopyrightLink();
                        annotations.copyrightLabel = annotations.getCopyrightLabel();
                    }
                    copyToClipBoard = Mustache.render(template.clipboardItem, {'imageObj': annotations});
                    bridge.emit(bridge.events.copyToClipBoard, copyToClipBoard);
                });
                //handle click on image card
                object.imageListView.on('click', '.image-card img', function () {
                    var card = $(this).closest('.image-card');
                    var imageObj = card.data(constants.imageObject);
                    bridge.emit(bridge.events.onImageAction, imageObj);
                    self.openImage(imageObj.uuid);
                });
                //handle click on query button
                object.imageListView.on('click', '.image-card .query-button', function () {
                    var imageCard = $(this).closest('.image-card');
                    var imageObj = imageCard.data(constants.imageObject);
                    imageCard.find('.loading').show();
                    imageCard.find('.no-lookup-data').hide();
                    bridge.emit(bridge.events.hashRequired, imageObj);
                });
                // Hide action buttons since state is not determined yet
                object.onButton.hide();
                object.offButton.hide();
            };

            return self;
        })();
        // Initialize bridge
        bridge.registerClient(addon.port);               // Default transport: link chrome
        //bridge.registerClient(panelController, 'panel'); // panel controller itself
        panelController.init();
    });
});