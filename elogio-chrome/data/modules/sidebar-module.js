/**
 * Created by TEMA on 09.10.2014.
 */
Elogio.modules.sidebarModule = function (modules) {
    //module uses jQuery library
    'use strict';
    var self = this;
    /*
     =======================
     REQUIREMENTS
     =======================
     */
    var locator = modules.getModule('locator'),
        bridge = modules.getModule('bridge'),
        events = bridge.events,
        config = modules.getModule('config');

    /*
     =======================
     PRIVATE MEMBERS
     =======================
     */
    //click on switchOn button
    var constants = {
        imageObject: 'imageObj'
    };
    var object = {
        sidebar: {},
        port: {},
        imageListView: {},
        messageBox: {}
    };
    var template = {
        imageItem: {},
        clipboardItem: {}
    };

    function initModule(sidebar, port) {
        object.sidebar = sidebar;
        object.port = port;
        object.imageListView = $("#elogio-imageListView");
        object.messageBox = $('#elogio-messageText');
        template.imageItem = $("#elogio-image-template").html();
        template.clipboardItem = $("#elogio-clipboard-template").html();
        Mustache.parse(template.imageItem);
    }


    function initializeDetails(imageObj, cardElement) {
        var annotations = new Elogio.Annotations(imageObj, config);
        console.log(annotations);
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
    }

    /*
     =======================
     PUBLIC MEMBERS
     =======================
     */


    self.addOrUpdateCard = function (imageObj) {
        var sidebar = object.sidebar;
        var cardElement = sidebar.find('#' + imageObj.uuid);
        if (!cardElement.length) {
            cardElement = $(Mustache.render(template.imageItem, {'imageObj': imageObj}));
            cardElement.data(constants.imageObject, imageObj);
            cardElement.find('img').on('click', function () {
                var card = $(this).closest('.image-card');
                var imageObj = card.data(constants.imageObject);
                self.openImage(imageObj.uuid);
            });
            var imgURL = chrome.extension.getURL("img/process-indicator.png");
            cardElement.find('.loading').css({
                background: "rgba(255, 255, 255, .8) url('" + imgURL + "') 50% 50% no-repeat;"
            });
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
                initializeDetails(imageObj, cardElement);
                errorArea.hide();//hide this anyway because it is wrong show both of messages
            } else {
                // Nothing to do hear just waiting when user clicks on image to query details
            }
        } else { // Show Query button
            cardElement.find('.elogio-image-details').hide();
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
    /**
     *
     * @param context - context which need to scan
     * @param nodes - nodes for search images
     * @param sidebar - element of DOM which contains all founded images
     * @param port - port for messaging with background
     * @param finish - callback which calls when scan is finished
     */

    self.startScan = function (context, nodes, sidebar, port, finish) {
        //init nodes and sidebar
        initModule(sidebar, port);
        hideMessage();
        if (object.imageListView.length) {
            object.imageListView.empty();
        }
        nodes = nodes || null;
        locator.findImages(context, nodes, function (imageObj) {
            self.addOrUpdateCard(imageObj, sidebar);
            //emit to background js
            port.postMessage({eventName: events.newImageFound, data: imageObj});
        }, function () {
            //on error
        }, function () {
            if (finish) {
                finish();
            }
        });
    };


    self.receivedImageDataFromServer = function (imageObj) {
        var card = self.getImageCardByUUID(imageObj.uuid);
        card.data(constants.imageObject, imageObj);
        self.addOrUpdateCard(imageObj);
        self.openImage(imageObj.uuid, true);
    };

    function hideMessage() {
        object.messageBox.html('');
        object.messageBox.hide();
    }

    self.getImageCardByUUID = function (uuid) {
        return object.imageListView.find('#' + uuid);
    };
    self.cleanUp = function () {
        object.imageListView.empty();
    };
    self.openImage = function (imageUUID, preventAnnotationsLoading) {
        var imageCard = self.getImageCardByUUID(imageUUID);
        var imageObj = imageCard.data(constants.imageObject);
        if (imageObj.details) {
            imageCard.find('.elogio-image-details').toggle();
        }
        if (!preventAnnotationsLoading && !imageObj.details && imageObj.lookup) { //if details doesn't exist then send request to server
            imageCard.find('.loading').show();//if we need annotations we wait for response
            object.port.postMessage({eventName: events.imageDetailsRequired, data: imageObj});
        }
    };

};