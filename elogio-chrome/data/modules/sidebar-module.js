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
        bridge = modules.getModule('bridge');
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
        imageListView: {},
        messageBox: {}
    };
    var template = {
        imageItem: {},
        clipboardItem: {}
    };

    function initModule() {
        object.imageListView = $("#elogio-imageListView");
        object.messageBox = $('#elogio-messageText');
        template.imageItem = $("#elogio-image-template").html();
        template.clipboardItem = $("#elogio-clipboard-template").html();
    }


    /*
     function initializeDetails(imageObj, cardElement) {
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
     }
     */
    /*
     =======================
     PUBLIC MEMBERS
     =======================
     */


    self.addOrUpdateCard = function (imageObj, sidebar) {
        var cardElement = sidebar.find('#' + imageObj.uuid);
        if (!cardElement.length) {
            cardElement = $(Mustache.render(template.imageItem, {'imageObj': imageObj}));
            cardElement.data(constants.imageObject, imageObj);
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
    /**
     *
     * @param context - context which need to scan
     * @param nodes - nodes for search images
     * @param sidebar - element of DOM which contains all founded images
     * @param port - port for messaging with background
     */
    self.startPageProcessing = function (context, nodes, sidebar, port) {
        initModule();
        nodes = nodes || null;
        locator.findImages(context, nodes, function (imageObj) {
            self.addOrUpdateCard(imageObj, sidebar);
            //emit to background js
            port.postMessage({eventName: bridge.events.newImageFound, image: imageObj});
        }, function () {
            //on error
        }, function () {
            //on finished
        });
    };
};