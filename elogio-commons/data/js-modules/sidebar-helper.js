/**
 * Created by TEMA on 15.10.2014.
 * Warning: jquery and Mustache required!
 */
Elogio.modules.sidebarHelper = function (modules) {
    var self = this;
    /*
     =======================
     REQUIREMENTS
     =======================
     */


    var config = modules.getModule('config'), utils = modules.getModule('utils');


    /*
     =======================
     PRIVATE MEMBERS
     =======================
     */
    function setLicenseColor(licensePlaceHolder, license) {
        if (utils.startsWith(license, 'CC-ND') || utils.startsWith(license, 'CC-NC')) {
            licensePlaceHolder.css({
                backgroundColor: 'yellow'
            });
        } else if (utils.startsWith(license, 'public')) {
            licensePlaceHolder.css({
                backgroundColor: 'green'
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
     *
     * @param imageList - jquery object container of image cards
     * @param imageObj - image object which we get from content {uri, uuid, lookup, details, error}
     * @param imageItemTemplate - jquery object (selector) of template
     */
    self.addOrUpdateImageCard = function (imageList, imageObj, imageItemTemplate) {
        // Try to find existing card and create the new one if it wasn't rendered before
        var cardElement = imageList.find('#' + imageObj.uuid);
        if (!cardElement.length) {
            cardElement = $(Mustache.render(imageItemTemplate, {'imageObj': imageObj}));
            cardElement.data(config.sidebar.imageObject, imageObj);
            imageList.append(cardElement);
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
            cardElement.data(config.sidebar.imageObject, imageObj);// save lookup data to card
            if (imageObj.hasOwnProperty('details')) { // If annotations were loaded...
                self.initializeDetails(imageObj, cardElement);
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
                errorArea.show();
                if (imageObj.blockhashError) {
                    var hash = cardElement.find('.elogio-hash');
                    hash.attr('href', imageObj.uri);
                    hash.show();
                }
            }
        }
    };
    self.initializeDetails = function (imageObj, cardElement) {
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
                var license = annotations.getLicenseLabel().trim(),
                    licensePlaceHolder = cardElement.find('.elogio-license');
                setLicenseColor(licensePlaceHolder, license);
                licensePlaceHolder.text(annotations.getLicenseLabel());
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
    };
};
