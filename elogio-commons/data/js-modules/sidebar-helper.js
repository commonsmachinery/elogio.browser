/**
 * Created by TEMA on 15.10.2014.
 * Warning: jquery and Mustache required!
 */
Elogio.modules.sidebarHelper = function (modules) {
    'use strict';
    var self = this;
    /*
     =======================
     REQUIREMENTS
     =======================
     */


    var config = modules.getModule('config'), utils = modules.getModule('utils'), bridge = modules.getModule('bridge');


    /*
     =======================
     PRIVATE MEMBERS
     =======================
     */
    function getImageCardByUUID(uuid) {
        return $('#' + uuid);
    }

    function setLicenseColor(licensePlaceHolder, license) {
        if (utils.startsWith(license, 'http://www.europeana.eu/rights/out-of-copyright-non-commercial')) {
            licensePlaceHolder.css({
                backgroundColor: 'yellow'
            });
            return;
        }
        license = license.replace('http://creativecommons.org/', '');
        if (
            utils.startsWith(license, 'licenses/by') ||
            utils.startsWith(license, 'publicdomain/mark') ||
            utils.startsWith(license, 'licenses/by-sa')) {
            licensePlaceHolder.css({
                backgroundColor: 'green'
            });
        } else if (
            utils.startsWith(license, 'licenses/by-nd') ||
            utils.startsWith(license, 'licenses/by-nc-nd') ||
            utils.startsWith(license, 'licenses/by-nc') ||
            utils.startsWith(license, 'licenses/by-nc-sa')) {
            licensePlaceHolder.css({
                backgroundColor: 'yellow'
            });
        } else {
            licensePlaceHolder.css({
                backgroundColor: 'red'
            });
        }
    }

    /*
     =======================
     PUBLIC MEMBERS
     =======================
     */


    /**
     * Method which create image for copy as image format
     * @param document
     * @param imageCard - jquery object
     * @param canvasTemplate - HTML string
     * @param callback - returns base64 image for copy to clipboard
     */
    self.createCanvas = function (document, imageCard, canvasTemplate, callback) {
        var canvas = document.createElement('canvas'), dataCanvas,
            ctx = canvas.getContext('2d');
        //load image
        var image = new Image();
        //remove CORS security
        image.crossOrigin = "Anonymous";
        image.src = imageCard.data(config.sidebar.imageObject).uri;
        //when load then ...
        var renderData = {
            width: imageCard.find('.elogio-image-details').width(),
            height: imageCard.find('.elogio-image-details').height(),
            title: imageCard.find('.elogio-annotations-title').html(),
            by: imageCard.find('.elogio-annotations-by').html(),
            license: imageCard.find('.elogio-license').html()
        };
        dataCanvas = Mustache.render(canvasTemplate, {'renderData': renderData});
        image.onload = function () {
            //it's a label under an image
            var data = "data:image/svg+xml," + dataCanvas;
            //load an image for label
            var img = new Image();
            //when image ready then ...
            img.onload = function () {
                //setup the canvas
                canvas.width = image.width;
                canvas.height = image.height + img.height;
                //draw image
                ctx.drawImage(image, 0, 0, image.width, image.height);
                //create white rectangle for label
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, image.height, image.width, img.height);
                //draw label on the canvas
                ctx.drawImage(img, 0, 0, img.width, img.height, 0, image.height + 5, img.width, img.height);
                //return base64 url of canvas
                callback(canvas.toDataURL('image/png'));
            };
            img.src = data;
        };
    };

    /**
     *
     * @param annotations - is needed for create properties of JSON
     * @returns {*}
     */
    self.jsonToString = function (annotations) {
        function replacer(key, value) {
            if (!value) {
                return undefined;
            }
            return value;
        }

        var stringJson = {
            locatorLink: annotations.locatorLink,
            titleLabel: annotations.titleLabel,
            creatorLink: annotations.creatorLink,
            creatorLabel: annotations.creatorLabel,
            licenseLink: annotations.licenseLink,
            licenseLabel: annotations.licenseLabel,
            copyrightLink: annotations.copyrightLink,
            copyrightLabel: annotations.copyrightLabel

        };
        return JSON.stringify(stringJson, replacer);
    };

    /**
     * Method which setups annotations for image, and returns it back
     * @param annotations - is needed for initializing details
     * @returns {*}
     */
    self.initAnnotationsForCopyHandler = function (annotations) {
        return {
            locatorLink: annotations.getLocatorLink(),
            titleLabel: annotations.getTitle(),
            creatorLink: annotations.getCreatorLink(),
            creatorLabel: annotations.getCreatorLabel(),
            licenseLink: annotations.getLicenseLink(),
            licenseLabel: annotations.getLicenseLabel(),
            copyrightLink: annotations.getCopyrightLink(),
            copyrightLabel: annotations.getCopyrightLabel()
        };
    };

    /**
     *This method is needed for updating and adding image card to panel
     * @param imageList - jquery object container of image cards
     * @param imageObj - image object which we get from content {uri, uuid, lookup, details, error}
     * @param templates - jquery object (selector) of template
     * @param locale - locale
     */
    self.addOrUpdateImageCard = function (imageList, imageObj, templates, locale) {
        // Try to find existing card and create the new one if it wasn't rendered before
        var cardElement = imageList.find('#' + imageObj.uuid), navigationPart;
        if (!cardElement.length) {
            cardElement = $(Mustache.render(templates.imageItem, {'imageObj': imageObj, 'locale': locale}));
            cardElement.data(config.sidebar.imageObject, imageObj);
            imageList.append(cardElement);
        } else {
            cardElement.data(config.sidebar.imageObject, imageObj);
        }
        // If we didn't send lookup query before - show loading
        if (!imageObj.hasOwnProperty('lookup') && !imageObj.error) {
            cardElement.find('.loading').show();
            return; // Waiting for lookup....
        } else {
            cardElement.find('.loading').hide();
            cardElement.find('.message-area').hide();
        }
        // If there is lookup data available check if there is image details
        var errorArea = cardElement.find('.error-area');
        if (imageObj.lookup && !imageObj.error) {
            cardElement.data(config.sidebar.imageObject, imageObj);// save lookup data to card
            if (imageObj.hasOwnProperty('details')) { // If annotations were loaded...
                var matchPlaceHolder = cardElement.find('.match-placeholder');
                if (!matchPlaceHolder.children().length) {
                    if (imageObj.allMatches) {
                        navigationPart = Mustache.render(templates.multipleMatch, {'loc': locale});
                    } else {
                        navigationPart = Mustache.render(templates.singleMatch, {'loc': locale});
                    }
                    matchPlaceHolder.append($(navigationPart));
                }
                self.initializeDetails(imageObj, cardElement, templates);
                errorArea.hide();//hide this anyway because it is wrong show both of messages
            } else {
                // Nothing to do hear just waiting when user clicks on image to query details
            }
        } else { // Show Query button
            cardElement.find('.image-found').hide();
            if (!imageObj.error) {
                cardElement.find('.image-not-found').show();
                errorArea.hide();//hide this anyway because it is wrong show both of messages
            } else {
                //at here imageObj has errors and need to show it in sidebar
                errorArea.text(imageObj.error);
                cardElement.find('.image-not-found').hide();
                errorArea.show();
                if (imageObj.blockhashError) {
                    var hash = cardElement.find('.elogio-hash');
                    hash.attr('href', imageObj.uri);
                    hash.show();
                }
            }
        }
    };


    /**
     *This method initialize details for image card
     * @param imageObj - object of image which need initialize
     * @param cardElement - card element from panel
     * @param templates - link to templates
     */
    self.initializeDetails = function (imageObj, cardElement, templates) {
        var annotations = new Elogio.Annotations(imageObj, config),
            templateData = {}, detailsTemplate, detailsPlaceholder = cardElement.find('.details-placeholder');
        if (imageObj.details) {
            //initialize details object for rendering via mustache
            templateData = {
                thumbnailImage: imageObj.details[imageObj.currentMatchIndex].thumbnailUrl,
                collectionLink: annotations.getCollectionLink(),
                gravatarLink: annotations.getGravatarLink(),
                title: annotations.getTitle(),
                by: annotations.getCopyrightLabel() || annotations.getCreatorLabel(),
                license: annotations.getLicenseLabel()
            };
            //if image has several matches then display it (count and current)
            if (imageObj.allMatches) {
                cardElement.find('.current-match-index').text(imageObj.currentMatchIndex + 1);
                cardElement.find('.count-matches').text(imageObj.allMatches.length);
            }
            //menu actions
            cardElement.find('.elogio-locatorlink').attr('href', annotations.getLocatorLink());
            //color of license
            if (annotations.getLicenseLink()) {
                var licenseLink = annotations.getLicenseLink(),
                    licensePlaceHolder = cardElement.find('.elogio-license');
                if (licenseLink) {
                    setLicenseColor(licensePlaceHolder, licenseLink);
                } else {
                    licensePlaceHolder.css({
                        backgroundColor: 'gray'   //if no link was founded
                    });
                }
            }
            //menu actions
            if (annotations.getLicenseLink()) {
                cardElement.find('.elogio-license-link').attr('href', annotations.getLicenseLink());
            } else {
                cardElement.find('.elogio-license-link').hide();
            }
        } else { // Otherwise - show message
            cardElement.find('.message-area').show();
            cardElement.find('.image-not-found').hide();
        }
        //cleanup details always
        detailsPlaceholder.empty();
        //render details
        detailsTemplate = $(Mustache.render(templates.detailsTemplate, {'imageObj': templateData}));
        //append details to image card
        detailsPlaceholder.append(detailsTemplate);
        //then just animate image card to top
        $('html, body').animate({scrollTop: cardElement.offset().top}, 500);
    };


    /**
     * Open image card
     * @param imageUUID - uuid of image which need to open
     * @param preventAnnotationsLoading - if need to load details for image set it to true
     * @param sendTo - is needed for chrome plugin
     * @param from - is needed for chrome plugin
     */
    self.openImage = function (imageUUID, preventAnnotationsLoading, sendTo, from) {
        var imageCard = getImageCardByUUID(imageUUID);
        $('html, body').animate({scrollTop: imageCard.offset().top}, 500);
        var imageObj = imageCard.data(config.sidebar.imageObject);
        if (imageObj.details) {
            imageCard.find('.elogio-image-details').toggle();
            if (imageObj.allMatches) {
                imageCard.find('.several-matches').show();
            }
            imageCard.find('.image-found').show();
            imageCard.find('.image-not-found').hide();
        } else if (!imageObj.lookup) {
            var notFound = imageCard.find('.elogio-not-found');
            if (!notFound.is(':visible')) {//if image data does not exist then we hide always query button
                imageCard.find('.elogio-image-details').toggle();
                imageCard.find('.image-found').hide();
            }
            if (imageObj.noData) {
                imageCard.find('.elogio-not-found').toggle();
                imageCard.find('.image-not-found').hide();
            }
        }
        if (!preventAnnotationsLoading && !imageObj.details && imageObj.lookup) { //if details doesn't exist then send request to server
            imageCard.find('.loading').show();//if we need annotations we wait for response
            if (sendTo) {
                sendTo = [sendTo];
            }
            bridge.emit(bridge.events.imageDetailsRequired, imageObj, sendTo, from);
        }
        imageCard.highlight();
    };


    /**
     * Handler for copy to clipboard event (html format)
     * @param sendTo - is needed for chrome plugin
     * @param from - is needed for chrome plugin
     */
    self.copyAsHTML = function (imageCard, template, sendTo, from) {
        var copyJSON = {},
            imageObj = imageCard.data(config.sidebar.imageObject), annotations,
            copyToClipBoard;
        if (imageObj.details && imageObj.details[imageObj.currentMatchIndex]) {
            annotations = new Elogio.Annotations(imageObj, config);
            copyJSON = self.initAnnotationsForCopyHandler(annotations);
            copyJSON.uri = imageObj.uri;
            copyToClipBoard = Mustache.render(template, {'imageObj': copyJSON});
            if (sendTo) {
                sendTo = [sendTo];
            }
            bridge.emit(bridge.events.copyToClipBoard, {data: copyToClipBoard, type: 'html'}, sendTo, from);
        }

    };


    /**
     * Handler for copy to clipboard event (json format)
     * @param sendTo - is needed for chrome plugin
     * @param from - is needed for chrome plugin
     */
    self.copyAsJSON = function (imageCard, sendTo, from) {
        var copyJSON = {},
            imageObj = imageCard.data(config.sidebar.imageObject), annotations,
            copyToClipBoard;
        if (imageObj.details && imageObj.details[imageObj.currentMatchIndex]) {
            annotations = new Elogio.Annotations(imageObj, config);
            copyJSON = self.initAnnotationsForCopyHandler(annotations);
            copyJSON.uri = imageObj.uri;
            copyToClipBoard = self.jsonToString(copyJSON);
            if (sendTo) {
                sendTo = [sendTo];
            }
            bridge.emit(bridge.events.copyToClipBoard, {data: copyToClipBoard, type: 'text'}, sendTo, from);
        }
    };

};
