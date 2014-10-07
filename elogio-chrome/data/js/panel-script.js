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
                object.offButton.show();
                object.onButton.hide();
            };

            self.stopPlugin = function () {
                object.offButton.hide();
                object.onButton.show();
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
                port.onMessage.addListener(function (request) {
                    switch (request.eventName) {
                        case events.newImageFound:
                            self.addOrUpdateImageCard(request.image);
                            break;
                    }
                });
                port.postMessage('registration');
                port.postMessage({eventName: events.startPageProcessing});
            };
            return self;
        })();
        panelController.init();
    });
});