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
                imageItem: $("#image-template").html()
            };
            var eventHandlers = {},
                self = {},
                isPluginEnabled = null;

            self.displayMessages = function() {
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
            self.initializeDetails=function(imageObj,cardElement){
                if (imageObj.details) { // If we were abe to get annotations - populate details
                    cardElement.find('.elogio-owner').text('Owner: ' + imageObj.details.owner.org.added_by);
                    cardElement.find('.elogio-addedAt').text('Added at: ' + imageObj.details.owner.org.added_at);
                    cardElement.find('.elogio-annotations').attr('href', imageObj.details.annotations.locator[0].property.locatorLink);
                    if (imageObj.details.owner.org.profile) {//if exist profile then draw gravatar
                        cardElement.find('.elogio-gravatar').attr('src',
                                config.global.apiServer.gravatarServerUrl + imageObj.details.owner.org.profile.gravatar_hash);
                    } else {
                        cardElement.find('.elogio-gravatar').hide();//if no gravatar then hide
                    }
                    if(imageObj.details.annotations.policy){
                        cardElement.find('.elogio-license').text('License: '+imageObj.details.annotations.policy[0].property.statementLabel);
                        if(imageObj.details.annotations.policy[0].property.statementLink){
                            cardElement.find('.elogio-license-link').attr('href',imageObj.details.annotations.policy[0].property.statementLink);
                        }else{
                            cardElement.find('.elogio-license-link').hide();
                        }
                    }else{
                        cardElement.find('.elogio-license').hide();
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
                if (!imageObj.hasOwnProperty('lookup')) {
                    cardElement.find('.loading').show();
                    return; // Waiting for lookup....
                } else {
                    cardElement.find('.loading').hide();
                    cardElement.find('.message-area').hide();
                }
                // If there is lookup data available check if there is image details
                if (imageObj.lookup && imageObj.lookup.href) {
                    cardElement.data(constants.imageObject, imageObj);// save lookup data to card
                    if (imageObj.hasOwnProperty('details')) { // If annotations were loaded...
                        self.initializeDetails(imageObj,cardElement);
                    } else {
                        // Nothing to do hear just waiting when user clicks on image to query details
                    }
                } else { // Show Query button
                    cardElement.find('.image-details').hide();
                    cardElement.find('.no-lookup-data').show();
                }
            };

            self.startPlugin = function () {
                if (!isPluginEnabled) {
                    // Clear existing list of
                    isPluginEnabled = true;
                    object.imageListView.empty();
                    bridge.emit(bridge.events.pluginActivated);
                }
            };

            self.stopPlugin = function () {
                if (isPluginEnabled) { //if already stopped then we don't need to stop the plugin again
                    object.imageListView.empty();
                    bridge.emit(bridge.events.pluginStopped);
                }
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
                var card = getImageCardByUUID(imageObj.uuid);
                card.data(constants.imageObject, imageObj);
                this.addOrUpdateImageCard(imageObj);
                this.openImage(imageObj.uuid);
            };
            function getImageCardByUUID(uuid) {
                return $('#' + uuid);
            }

            self.openImage = function (imageUUID) {
                var imageCard = getImageCardByUUID(imageUUID);
                $('html, body').animate({scrollTop: imageCard.offset().top}, 500);
                var imageObj = imageCard.data(constants.imageObject);
                if (imageObj.details) {
                    imageCard.find('.image-details').toggle();
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
                    self.startPlugin();
                    self.displayMessages();
                });
                bridge.on(bridge.events.pluginStopped, function () {
                    isPluginEnabled = false;
                    object.onButton.show();
                    object.offButton.hide();
                    self.stopPlugin();
                    self.displayMessages();
                });
                bridge.on(bridge.events.tabSwitched, function (imageObjects) {
                    self.loadImages(imageObjects);
                    self.displayMessages();
                });
                bridge.on(bridge.events.onImageAction, function (imageObject) {
                    self.openImage(imageObject.uuid);
                });
                bridge.on(bridge.events.imageDetailsReceived, function (imageObject) {
                    self.receivedImageDataFromServer(imageObject);
                });
                bridge.on(bridge.events.startPageProcessing, function (imageObject) {
                    self.hideMessage();
                    object.imageListView.empty();
                    bridge.emit(bridge.events.startPageProcessing);
                });
                object.onButton.on('click', self.startPlugin);
                object.offButton.on('click', self.stopPlugin);
                object.imageListView.on('click', '.image-card img', function () {
                    var card = $(this).closest('.image-card');
                    var imageObj = card.data(constants.imageObject);
                    bridge.emit(bridge.events.onImageAction, imageObj);
                    self.openImage(imageObj.uuid);
                    if (!imageObj.details && imageObj.lookup) {//if details doesn't exist then send request to server
                        card.find('.loading').show();//if we need annotations we wait for response
                        bridge.emit(bridge.events.imageDetailsRequired, imageObj);
                    }
                });
                object.imageListView.on('click', '.image-card .query-button', function () {
                    var imageCard = $(this).closest('.image-card');
                    var imageObj = imageCard.data(constants.imageObject);
                    imageCard.find('.loading').show();
                    imageCard.find('.no-lookup-data').hide();
                    alert('TODO: Perform query request for ' + imageObj.uuid);
                    imageCard.find('.loading').hide();
                });
                // Hide action buttons since state is not determined yet
                object.onButton.hide();
                object.offButton.hide();
            };

            return self;
        })();

        // Initialize bridge
        bridge.registerClient(addon.port);               // Default transport: link chrome
        bridge.registerClient(panelController, 'panel'); // panel controller itself
        panelController.init();
    });
});