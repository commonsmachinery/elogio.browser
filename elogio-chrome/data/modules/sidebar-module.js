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
        dom = modules.getModule('dom'),
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
        document: {},
        sidebar: {},
        port: {},
        feedbackButton: {},
        imageListView: {},
        messageBox: {}
    };
    window.doorbellOptions = {
        hideButton: true,
        appKey: 'yuKV0gmIM91d4crYqSTyTVwXi79UH564JAOJ575IkgywVFFCnPbScIGhsp1yipeM'
    };
    var template = {
        imageItem: {},
        clipboardItem: {}
    };

    function initModule(sidebar, port, document) {
        object.sidebar = sidebar;
        template.imageItem = $("#elogio-image-template").html();
        Mustache.parse(template.imageItem);
        object.port = port;
        object.feedbackButton = $('#elogio-feedback');
        object.document = document;
        object.imageListView = $("#elogio-imageListView");
        object.messageBox = $('#elogio-messageText');
        template.clipboardItem = $("#elogio-clipboard-template").html();
        /**
         *
         * Init doorbell
         */
        var g = document.createElement('script');
        g.id = 'doorbellScript';
        g.type = 'text/javascript';
        g.async = true;
        g.src = 'https://doorbell.io/button/423';
        (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(g);

        //init
        object.imageListView.on('click', '.image-card .query-button', function () {
            var imageCard = $(this).closest('.image-card');
            var imageObj = imageCard.data(constants.imageObject);
            imageCard.find('.loading').show();
            imageCard.find('.image-not-found').hide();
            blockhash(imageObj.uri, 16, 2, function (error, hash) {
                imageObj.error = error;
                imageObj.hash = hash;
                object.port.postMessage({eventName: events.hashCalculated, data: imageObj});
            });
        });
        object.imageListView.on('click', '.image-card img', function () {
            var card = $(this).closest('.image-card');
            var imageObj = card.data(constants.imageObject);
            dom.getElementByUUID(imageObj.uuid).scrollIntoView();
            self.openImage(imageObj.uuid);
        });
        object.imageListView.on('click', '.image-card .elogio-report-work', function () {
            var imageCard = $(this).closest('.image-card'),
                imageObj = imageCard.data(constants.imageObject);
            /* global doorbell */
            if (typeof doorbell !== 'undefined') {
                doorbell.setProperty('uri', imageObj.uri);
                doorbell.show();
            } else {
                console.error('Seems like doorbell is not defined');
            }
        });

        object.feedbackButton.on('click', function () {
            /* global doorbell */
            if (typeof doorbell !== 'undefined') {
                doorbell.show();
            } else {
                console.error('Seems like doorbell is not defined');
            }
        });
    }


    function initializeDetails(imageObj, cardElement) {
        var annotations = new Elogio.Annotations(imageObj, config);
        if (imageObj.details) { // If we were abe to get annotations - populate details
            if (annotations.getCopyrightLabel()) {
                cardElement.find('.elogio-annotations-by').text('By ' + annotations.getCopyrightLabel());
            } else if (annotations.getCreatorLabel()) {
                cardElement.find('.elogio-annotations-by').text('By ' + annotations.getCreatorLabel());
            }
            cardElement.find('.elogio-locatorlink').attr('href', annotations.getLocatorLink());
            if (annotations.getTitle()) {
                cardElement.find('.elogio-annotations-title').text(annotations.getTitle());
            } else {
                cardElement.find('.elogio-annotations-title').hide();
            }
            if (annotations.getGravatarLink()) {//if exist profile then draw gravatar
                cardElement.find('.elogio-gravatar').attr('src', annotations.getGravatarLink() + "?s=40");
            } else {
                cardElement.find('.elogio-gravatar').hide();//if no gravatar then hide
            }
            if (annotations.getLicenseLabel()) {
                cardElement.find('.elogio-license').text(annotations.getLicenseLabel());
            } else {
                cardElement.find('.elogio-license').hide();
            }
            if (annotations.getLicenseLink()) {
                cardElement.find('.elogio-license-link').attr('href', annotations.getLicenseLink());
            } else {
                cardElement.find('.elogio-license-link').hide();
            }
        } else { // Otherwise - show message
            cardElement.find('.message-area').show();
            cardElement.find('.image-not-found').hide();
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
            cardElement.find('.query-button').hide();//if lookup exist then query button must be hidden
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
                cardElement.find('.query-button').hide();//because error
            }
        }
    };
    /**
     *
     * @param context - context which need to scan (may be a document)
     * @param nodes - nodes for search images
     * @param sidebar - element of DOM which contains all founded images
     * @param port - port for messaging with background
     * @param finish - callback which calls when scan is finished
     * @param document - reference on the document for animation 'body'
     */

    self.startScan = function (document, context, nodes, sidebar, port, finish) {
        //init nodes and sidebar
        initModule(sidebar, port, document);
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
        object.imageListView = {};
        object.document = {};
        object.sidebar = {};
        object.port = {};
        object.imageListView = {};
        object.messageBox = {};
    };
    self.openImage = function (imageUUID, preventAnnotationsLoading) {
        var imageCard = self.getImageCardByUUID(imageUUID);
        var imageObj = imageCard.data(constants.imageObject);
        if (imageObj.details) {
            imageCard.find('.elogio-image-details').toggle();
            imageCard.find('.image-found').show();
            imageCard.find('.image-not-found').hide();
        } else if (!imageObj.lookup) {
            imageCard.find('.elogio-image-details').toggle();
            imageCard.find('.image-found').hide();
            imageCard.find('.image-not-found').show();
        }
        if (!preventAnnotationsLoading && !imageObj.details && imageObj.lookup) { //if details doesn't exist then send request to server
            imageCard.find('.loading').show();//if we need annotations we wait for response
            object.port.postMessage({eventName: events.imageDetailsRequired, data: imageObj});
        }
    };

};