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

            self.addImageCard = function (imageObj) {
                var cardElement = $(Mustache.render(template.imageItem, {'imageObj': imageObj}));
                cardElement.data(constants.imageObject, imageObj);
                object.imageListView.append(cardElement);
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
                    self.addImageCard(imageObjects[i]);
                }
            };

            self.receivedImageDataFromServer = function (imageObj) {
                var currentImageObj = getImageCardByUUID(imageObj.uuid).data(constants.imageObject);
                currentImageObj.details = imageObj.details;
                self.openImage(imageObj.uuid);
            };
            function getImageCardByUUID(uuid) {
                return $('#' + uuid);
            }

            self.openImage = function (imageUUID) {
                var imageCard = getImageCardByUUID(imageUUID);
                var imageObj = imageCard.data(constants.imageObject);
                $('html, body').animate({
                    scrollTop: imageCard.offset().top
                }, 500);
                imageCard.highlight();
                var details = imageCard.find('.image-details');
                var loadIndicator = imageCard.find('.loading');
                if (imageObj.details) {
                    loadIndicator.hide();//if details exist then always indicator hide
                    details.toggle(); //and info we must toggle
                } else {
                    loadIndicator.show();//if no info for image then indicator always show
                    details.hide(); //and details hide
                    bridge.emit(bridge.events.imageDetailsRequired, imageObj);
                }
            };

            self.init = function () {
                // Compile mustache templates
                Mustache.parse(template.imageItem);
                // Subscribe for events
                bridge.on(bridge.events.newImageFound, function (imageObj) {
                    self.addImageCard(imageObj);
                });
                bridge.on(bridge.events.pluginActivated, function (imageObj) {
                    isPluginEnabled = true;
                    self.hideMessage();
                    object.onButton.hide();
                    object.offButton.show();
                    self.startPlugin();
                });
                bridge.on(bridge.events.pluginStopped, function (imageObj) {
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
                object.imageListView.on('click', '.image-card', function () {
                    var imageObj = $(this).data('imageObj');
                    bridge.emit(bridge.events.onImageAction, imageObj);
                    self.openImage(imageObj.uuid);
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

/*
 $(document).ready(function () {
 'use strict';

 var isExtensionEnabled = true;

 var onButton = $("#on");
 var offButton = $("#off");
 var imageListView = $("#imageListView");
 var imageList = imageListView.find("#imageList");
 var messageView = $("#messageView");
 var messageLabel = $("#messageText");
 var template = $("#image-template").html();
 var jsonTemplate = $('#json-template').html();
 Mustache.parse(template);
 Mustache.parse(jsonTemplate);
 function showMessage(messageText) {
 messageView.show();
 imageListView.hide();
 messageLabel.text(messageText);
 }

 function showImageListView() {
 imageListView.show();
 messageView.hide();
 }

 onButton.click(function () {
 if (isExtensionEnabled) {
 return;
 }
 $('#imageListView').show();
 addon.port.emit("addonSwitchOn");
 isExtensionEnabled = true;
 onButton.addClass("btn-success");
 offButton.removeClass("btn-danger");
 });
 offButton.click(function () {
 if (!isExtensionEnabled) {
 return;
 }
 $('#imageListView').hide();
 addon.port.emit("addonSwitchOff");
 isExtensionEnabled = false;
 offButton.addClass("btn-danger");
 onButton.removeClass("btn-success");
 });


 addon.port.emit("panelLoaded");
 addon.port.on('showPictureById', function (id) {
 var elem = $('#' + id);
 if (elem.offset()) {
 $('html, body').animate({
 scrollTop: elem.offset().top
 }, 500);
 }
 elem.find('.image-details').toggle();
 });
 addon.port.on("drawItems", function (items) {
 if (!isExtensionEnabled) {
 showMessage("Please enable extension");
 return;
 }
 if (items === null || items === undefined) {
 showMessage("Loading, please wait...");
 return;
 }
 imageList.empty();
 showImageListView();

 function toggleDetails(renderedItem) {
 addon.port.emit('getImageFromContent', renderedItem.attr('id'));
 //todo add request for image
 var jsonData = $(Mustache.render(jsonTemplate, {'data': 'from server'}));
 if (renderedItem.find('.json-details') !== null) {
 renderedItem.find('.json-details').remove();
 renderedItem.find('.image-details').append(jsonData);
 } else {
 renderedItem.find('.image-details').append(jsonData);
 }
 renderedItem.find('.image-details').toggle();
 }

 for (var j = 0; j < items.length; j++) {
 var item=items[j];
 for (var i = 0; i < item.length; i++) {
 var element = item[i];
 var rendered = $(Mustache.render(template, {"imageURL": element.src, "guid": element.guid}));
 rendered.find('img').on('click', toggleDetails.bind(null, rendered));
 imageList.append(rendered);
 }
 }
 }
 );
 });
 */
