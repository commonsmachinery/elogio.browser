$(document).ready(function () {
    'use strict';
    new Elogio(['config', 'utils', 'dom', 'imageDecorator', 'locator', 'bridge'], function (modules) {
        var locator = modules.getModule('locator'),
            imageDecorator = modules.getModule('imageDecorator'),
            dom = modules.getModule('dom'),
            config = modules.getModule('config'),
            bridge = modules.getModule('bridge');

        function StateController() {
            this.currentState = StateController.State.STOPPED;
            this.isStarted = function () {
                return currentState === StateController.State.STARTED || StateController.State.PAGE_PROCESSING;
            };
            this.isStopped = function () {
                return currentState === StateController.State.STOPPED;
            };
            this.pageProcessingIsInProgress = function () {
                return currentState === StateController.State.PAGE_PROCESSING;
            };
        }

        StateController.State = {
            STOPPED: 0,
            STARTED: 1,
            PAGE_PROCESSING: 2
        };

        var panelController = new (function (state) {
            var object = {
                onButton: $('#on'),
                offButton: $('#off'),
                imageListView: $("#imageListView")
            };
            var template = {
                imageItem: $("#image-template").html()
            };
            var eventHandlers = {},
                stateController = state;
            var self = this;

            this.on = function (eventName, callback) {
                eventHandlers[eventName] = callback;
            };

            this.emit = function (eventName, argument) {
                if (eventHandlers[eventName]) {
                    eventHandlers[eventName](argument);
                }
            };

            this.addImageCard = function (imageObj) {
                var cardElement = $(Mustache.render(template.imageItem, {'imageObj': imageObj}));
                cardElement.data('imageObj', imageObj);
                object.imageListView.append(cardElement);
            };

            this.startPlugin = function () {
                // Clear existing list of
                stateController.currentState = StateController.State.STARTED;
                object.imageListView.empty();
                bridge.emit(bridge.events.startPageProcessing);
            };

            this.stopPlugin = function () {
                stateController.currentState = StateController.State.STOPPED;
            };

            this.loadImages = function(imageObjects) {
                var i;
                // Clear list
                object.imageListView.empty();
                // Add all objects
                for (i = 0; i < imageObjects.length; i += 1) {
                    this.addImageCard(imageObjects[i]);
                }
            };

            this.openImage = function(imageUUID) {
                $('html, body').animate({
                    scrollTop: $("#"+imageUUID).offset().top
                }, 500);
            };

            this.init = function () {
                // Compile mustache templates
                //Mustache.parse(template.imageItem);
                // Subscribe for events
                bridge.on(bridge.events.newImageFound, function (imageObj) {
                    self.addImageCard(imageObj);
                });
                bridge.on(bridge.events.pluginActivated, function (imageObj) {
                    self.startPlugin();
                });
                bridge.on(bridge.events.tabSwitched, function (imageObjects) {
                    self.loadImages(imageObjects);
                });
                bridge.on(bridge.events.onImageAction, function (imageObject) {
                    self.openImage(imageObject.uuid);
                });
                object.onButton.on('click', this.startPlugin);
                object.offButton.on('click', this.stopPlugin);
                object.imageListView.on('click','.image-card',function(){
                    bridge.emit(bridge.events.onImageAction,$(this).data('imageObj'));
                });
            };

        })(new StateController());

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
