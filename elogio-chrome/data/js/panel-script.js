/**
 * Created by TEMA on 06.10.2014.
 */
$(document).ready(function () {
    'use strict';
    new Elogio(['config', 'utils', 'dom', 'imageDecorator', 'locator', 'bridge'], function (modules) {
        var bridge = modules.getModule('bridge'),
            events = bridge.events;
        var panelController = (function () {
            var object = {
                onButton: $('#on'),
                offButton: $('#off'),
                imageListView: $("#imageListView"),
                messageBox: $('#messageText')
            };
            var template = {
                imageItem: $("#image-template").html()
            };
            var constants = {
                imageObject: 'imageObj'
            };
            var self = {},
                isPluginEnabled = true;
            var port = chrome.runtime.connect({name: 'popup'});

            function getImageCardByUUID(uuid) {
                return $('#' + uuid);
            }

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
            self.addOrUpdateImageCard = function (imageObj) {
                // Try to find existing card and create the new one if it wasn't rendered before
                var cardElement = getImageCardByUUID(imageObj.uuid);
                if (!cardElement.length) {
                    cardElement = $(Mustache.render(template.imageItem, {'imageObj': imageObj}));
                    cardElement.data(constants.imageObject, imageObj);
                    object.imageListView.append(cardElement);
                }
            };
            self.startPlugin = function () {
                if (!isPluginEnabled) {
                    // Clear existing list of
                    if (object.imageListView.length) {
                        object.imageListView.empty();
                    }
                    port.postMessage({eventName: events.pluginActivated});
                }
            };

            self.stopPlugin = function () {
                if (isPluginEnabled) { //if already stopped then we don't need to stop the plugin again
                    if (object.imageListView.length) {
                        object.imageListView.empty();
                    }
                    port.postMessage({eventName: events.pluginStopped});
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
                object.onButton.on('click', self.startPlugin);
                object.offButton.on('click', self.stopPlugin);
                //handle click on copy button
                object.imageListView.on('click', '.image-card .elogio-clipboard', function () {
                    console.log('on copy click');
                });
                //handle click on image card
                object.imageListView.on('click', '.image-card img', function () {
                    console.log('om image click');
                });
                //handle click on query button
                object.imageListView.on('click', '.image-card .query-button', function () {
                    console.log('on query click');
                });
                object.onButton.hide();
                /**
                 * handler for messaging with background.js
                 */
                port.onMessage.addListener(function (request) {
                    switch (request.eventName) {
                        //fires when image received from background.js
                        case events.newImageFound:
                            self.addOrUpdateImageCard(request.image);
                            break;
                        //fires when background send message for activate plugin
                        case events.pluginActivated:
                            object.onButton.hide();
                            object.offButton.show();
                            isPluginEnabled = true;
                            self.startPlugin();
                            break;
                        //fires when tab switched
                        case events.tabSwitched:
                            if (isPluginEnabled) {//if plugin disabled we don't need load any images
                                self.loadImages(request.images, request.imageCardToOpen);
                                self.displayMessages();
                            }
                            break;
                        //fires when plugin stopped
                        case events.pluginStopped:
                            object.onButton.show();
                            object.offButton.hide();
                            isPluginEnabled = false;
                            self.stopPlugin();
                            self.displayMessages();
                            break;
                    }
                });
                port.postMessage('registration');
                //when popup shows up we starting processing the page
                port.postMessage({eventName: events.pluginActivated});
            };
            return self;
        })();
        panelController.init();
    });
});