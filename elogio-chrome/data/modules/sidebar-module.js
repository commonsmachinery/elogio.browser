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
        sidebarHelper = modules.getModule('sidebarHelper'),
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
    var template = {
        imageItem: {},
        clipboardItem: {}
    };

    function initModule(sidebar, port, document) {
        object.sidebar = sidebar;
        template.imageItem = $("#elogio-image-template").html();
        template.clipboardItem = $("#elogio-clipboard-template").html();
        Mustache.parse(template.imageItem);
        Mustache.parse(template.clipboardItem);
        object.port = port;
        object.feedbackButton = $('#elogio-feedback');
        object.document = document;
        object.imageListView = $("#elogio-imageListView");
        object.messageBox = $('#elogio-messageText');
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
        object.imageListView.on('click', '.image-card .elogio-clipboard', function () {
            var imageCard = $(this).closest('.image-card'),
                imageObj = imageCard.data(config.sidebar.imageObject), annotations,
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
            object.port.postMessage({eventName: events.copyToClipBoard, data: copyToClipBoard});
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

    /*
     =======================
     PUBLIC MEMBERS
     =======================
     */

    /**
     * Override method which needs only imagObj for adding to sidebar an Image card
     * @param imageObj
     */
    self.addOrUpdateCard = function (imageObj) {
        sidebarHelper.addOrUpdateImageCard(object.imageListView, imageObj, template.imageItem);
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
            sidebarHelper.addOrUpdateImageCard(object.imageListView, imageObj, template.imageItem);
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
        sidebarHelper.addOrUpdateImageCard(object.imageListView, imageObj, template.imageItem);
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
        if (imageCard.highlight) {
            imageCard.highlight();
        }
    };

};