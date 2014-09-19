$(document).ready(function () {
    'use strict';
    new Elogio(['config', 'utils', 'dom', 'imageDecorator', 'locator', 'bridge'], function (modules) {
        var bridge = modules.getModule('bridge');

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
                imageItem: $("#image-template").html()
            };
            var eventHandlers = {},
                self = {},
                isPluginEnabled = null;

            self.on = function (eventName, callback) {
                eventHandlers[eventName] = callback;
            };
            self.emit = function (eventName, argument) {
                if (eventHandlers[eventName]) {
                    eventHandlers[eventName](argument);
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
                if (!imageObj.hasOwnProperty('lookup')) {
                    cardElement.find('.loading').show();
                    return; // Waiting for lookup....
                } else {
                    cardElement.find('.loading').hide();
                    cardElement.find('.message-area').hide();
                }
                // If there is lookup data available check if there is image details
                if (imageObj.lookup && imageObj.lookup.href) {
                    if (imageObj.hasOwnProperty(imageObj.details)) { // If annotations were loaded...
                        if (imageObj.details) { // If we were abe to get annotations - populate details
                            cardElement.find('.elogio-owner').text('Owner');
                            cardElement.find('.elogio-addedAt').text('Added at');
                            cardElement.find('.elogio-annotations').text('Annotations');
                            cardElement.find('.image-details').show();
                        } else { // Otherwise - show message
                            cardElement.find('.message-area').text('Sorry, no data available').show();
                        }
                    } else {
                        // Nothing to do hear just waiting when user clicks on image to query details
                    }
                } else { // Show Query button
                    cardElement.find('.image-details').hide();
                    cardElement.find('.no-lookup-data').show();
                }
            };

            self.startPlugin = function () {
                // Clear existing list of
                object.imageListView.empty();
                bridge.emit(bridge.events.pluginActivated);
                bridge.emit(bridge.events.startPageProcessing);
            };

            self.stopPlugin = function () {
                object.imageListView.empty();
                bridge.emit(bridge.events.pluginStopped);
            };

            self.loadImages = function (imageObjects) {
                var i;
                // Clear list
                object.imageListView.empty();
                // Add all objects
                for (i = 0; i < imageObjects.length; i += 1) {
                    self.addOrUpdateImageCard(imageObjects[i]);
                }
            };

            self.receivedImageDataFromServer = function (imageObj) {
                getImageCardByUUID(imageObj.uuid).data(constants.imageObject, imageObj);
                self.openImage(imageObj.uuid);
            };
            function getImageCardByUUID(uuid) {
                return $('#' + uuid);
            }

            self.openImage = function (imageUUID) {
                var imageCard = getImageCardByUUID(imageUUID);
                //var imageObj = imageCard.data(constants.imageObject);
                //var lookup = imageCard.find('.lookup');
                $('html, body').animate({scrollTop: imageCard.offset().top}, 500);
                imageCard.highlight();
                /*var details = imageCard.find('.image-details');
                var loadIndicator = imageCard.find('.loading');
                if (imageObj.details) {
                    loadIndicator.hide();//if details exist then always indicator hide
                    updateAnnotations(imageCard, imageObj.details);
                    details.toggle(); //and info we must toggle
                } else if (imageObj.lookup) {
                    loadIndicator.hide();
                    details.hide(); //and details hide
                    lookup.show();
                }*/
            };
            self.init = function () {
                // Compile mustache templates
                Mustache.parse(template.imageItem);
                // Subscribe for events
                bridge.on(bridge.events.newImageFound, function (imageObj) {
                    self.addOrUpdateImageCard(imageObj);
                });
                bridge.on(bridge.events.pluginActivated, function () {
                    isPluginEnabled = true;
                    self.hideMessage();
                    object.onButton.hide();
                    object.offButton.show();
                    self.startPlugin();
                });
                bridge.on(bridge.events.pluginStopped, function () {
                    isPluginEnabled = false;
                    object.onButton.show();
                    object.offButton.hide();
                    self.stopPlugin();
                });
                bridge.on(bridge.events.tabSwitched, function (imageObjects) {
                    self.loadImages(imageObjects);
                });
                bridge.on(bridge.events.onImageAction, function (imageObject) {
                    self.openImage(imageObject.uuid);
                });
                bridge.on(bridge.events.imageDetailsReceived, function (imageObject) {
                    self.receivedImageDataFromServer(imageObject);
                });
                object.onButton.on('click', self.startPlugin);
                object.offButton.on('click', self.stopPlugin);
                object.imageListView.on('click', '.image-card img', function () {
                    var imageObj = $(this).closest('.image-card').data(constants.imageObject);
                    console.log(imageObj);
                    if (!imageObj.details && imageObj.lookup) {//if details doesn't exist then send request to server
                        bridge.emit(bridge.events.imageDetailsRequired, imageObj);
                    }
                    bridge.emit(bridge.events.onImageAction, imageObj);
                    self.openImage(imageObj.uuid);
                });
                object.imageListView.on('click', '.image-card .query-button', function () {
                    var imageCard = $(this).closest('.image-card');
                    var imageObj = imageCard.data(constants.imageObject);
                    imageCard.find('.loading').show();
                    imageCard.find('.no-lookup-data').hide();
                    alert('TODO: Perform query request for ' + imageObj.uuid);
                    imageCard.find('.hide').show();
                });
                // Hide action buttons since state is not determined yet
                object.onButton.hide();
                object.offButton.hide();
                // If plugin was initialized after page load - show notification
                if (isPluginEnabled === null) {
                    self.showMessage("Refresh the page to start");
                }
            };

            return self;
        })();

        // Initialize bridge
        bridge.registerClient(addon.port);               // Default transport: link chrome
        bridge.registerClient(panelController, 'panel'); // panel controller itself
        panelController.init();
    });
});