/**
 * Created by LOGICIFY\corvis on 9/15/14.
 */

Elogio.modules.utils = function (modules) {
    'use strict';
    var self = this;
    /*
     =======================
     REQUIREMENTS
     =======================
     */
    var config = modules.getModule('config');
    /*
     =======================
     PRIVATE MEMBERS
     =======================
     */

    /*
     =======================
     PUBLIC MEMBERS
     =======================
     */

    /**
     * Returns true if string <code>st</code> starts with substring <code>prefix</code>
     * @param st - given string
     * @param prefix - prefix to be searched
     * @return {boolean}
     */
    self.startsWith = function (st, prefix) {
        return st.toLowerCase().indexOf(prefix.toLowerCase()) === 0;
    };

    /**
     * Returns canonized representatiopn of the url.
     * @param url - url to be canonized
     * @param currentLocation - url which targets current location. It will be used for resolving relative links
     */
    self.canonizeUrl = function (url, currentLocation) {
        if (url) {
            if (this.startsWith(url, 'http') || this.startsWith(url, 'www')) {
                return url;
            }
            if (this.startsWith(url, '/')) { //if image into deep folder
                return currentLocation + url.substring(1, url.length);
            }
            if (this.startsWith(url, '../')) { //if image into upper folder
                currentLocation = currentLocation.this.startsWith(0, currentLocation.lastIndexOf('/'));
                return this.canonizeUrl(url.substring(3, url.length),
                    currentLocation.substring(0, currentLocation.lastIndexOf('/') + 1));
            }
            if (this.startsWith(url, 'data')) {//if image is base64
                return url;
            }
        } else {
            return false;
        }
        return currentLocation + url; //if already canonized
    };
    /**
     * Translate json from oembed response to json from elog.io
     */
    self.oembedJsonToElogioJson = function (oembedJson) {
        return {
            added_by: {
                href: oembedJson.author_url,
                id: oembedJson.author_name
            },
            annotations: {
                copyright: [
                    {
                        id: oembedJson.author_name,
                        property: {
                            holderLabel: oembedJson.author_name,
                            holderLink: oembedJson.author_url,
                            value: oembedJson.author_name,
                            propertyName: 'copyright'
                        }
                    }
                ],
                creator: [
                    {
                        id: oembedJson.author_name,
                        property: {
                            creatorLabel: oembedJson.author_name,
                            creatorLink: oembedJson.author_url,
                            value: oembedJson.author_name,
                            propertyName: 'creator'
                        }
                    }
                ],
                locator: [
                    {
                        id: oembedJson.author_name,
                        property: {
                            locatorLink: oembedJson.url,
                            value: oembedJson.url,
                            propertyName: 'locator'
                        }
                    }
                ],
                policy: [
                    {
                        id: oembedJson.author_name,
                        property: {
                            statementLink: oembedJson.license_url,
                            statementLabel: oembedJson.license,
                            value: oembedJson.license,
                            typeLabel: 'license',
                            propertyName: 'policy'
                        }
                    }
                ],
                title: [
                    {
                        id: oembedJson.author_name,
                        property: {
                            titleLabel: oembedJson.title,
                            value: oembedJson.title,
                            propertyName: 'title'
                        }
                    }
                ]
            }
        };
    }


    self.getOembedEndpointForImageUri = function (url) {
        var endpoints = config.global.oembed.endpoint,
            regex = /\bhttps?:\/\/w?w?w?\.?/,
            domainEndpoint, domainImage;
        for (var key in endpoints) {
            if (endpoints.hasOwnProperty(key)) {
                domainEndpoint = endpoints[key].replace(regex, '');
                domainImage = url.replace(regex, '');
                domainEndpoint = domainEndpoint.substring(0, domainEndpoint.indexOf('/'));
                domainImage = domainImage.substring(0, domainImage.indexOf('/'));
                if (domainImage.indexOf(domainEndpoint) !== -1) {
                    return endpoints[key];
                }
            }
        }
        return null;
    };


    /**
     * Sort array of matches by distance
     * @param arrayJSON
     * @returns {{json: *, index: number}}
     */
    self.sortJSONByLowestDistance = function (arrayJSON) {
        var distanceBuffer = 0;
        for (var i = 0; i < arrayJSON.length - 1; i++) {
            for (var j = i + 1; j < arrayJSON.length; j++) {
                if (arrayJSON[i].distance > arrayJSON[i].distance) {
                    distanceBuffer = arrayJSON[i].distance;
                    arrayJSON[i].distance = arrayJSON[j].distance;
                    arrayJSON[j].distance = distanceBuffer;
                }
            }
        }
        return {json: arrayJSON[0], index: 0};
    };

    /**
     *
     * @param _ - it's a link to method "getMessage" of locale
     * @returns {{feedbackLabel: *, dropDownMenuLabel: *, copyHtmlButtonLabel: *, copyJsonButtonLabel: *, copyImgButtonLabel: *, sourceButtonLabel: *, licenseButtonLabel: *, reportButtonLabel: *, queryButtonLabel: *, openImgInNewTabLabel: *, noLookup: *, blockhash: {moreMatchesInfo: *}, button: {previous: *, next: *}}}
     */
    self.initLocale = function (_) {
        return {
            feedbackLabel: _('feedbackLabel'),
            dropDownMenuLabel: _('dropDownMenuLabel'),
            copyHtmlButtonLabel: _('copyHtmlButtonLabel'),
            copyJsonButtonLabel: _('copyJsonButtonLabel'),
            copyImgButtonLabel: _('copyImgButtonLabel'),
            sourceButtonLabel: _('sourceButtonLabel'),
            licenseButtonLabel: _('licenseButtonLabel'),
            reportButtonLabel: _('reportButtonLabel'),
            queryButtonLabel: _('queryButtonLabel'),
            openImgInNewTabLabel: _('openImageInNewTabLabel'),
            noLookup: _('noLookup'),
            blockhash: {
                moreMatchesInfo: _('multiMatchInfo')
            },
            button: {
                previous: _('matchPreviousButtonLabel'),
                next: _('matchNextButtonLabel')
            }
        };
    };

    self.findThumbnailOfImage = function (imageObjFromStorage, elogioServer, callback) {
        if (!Q) {
            var Q = Elogio.Q;
        }
        if (!imageObjFromStorage.details[imageObjFromStorage.currentMatchIndex].media) {
            console.error('no one thumbnail for image');
            return;
        }
        var requestHandler = function (href, promise) {
            elogioServer.sendRequestJustByUrl(href, function (response) {
                promise.resolve(response);
            }, function () {
                promise.reject();
            });
        };


        var media = imageObjFromStorage.details[imageObjFromStorage.currentMatchIndex].media, hrefs = [], defers = [], i, promises = [];
        //prepare promises
        for (i = 0; i < media.length; i++) {
            hrefs.push(media[i].href);
            defers.push(Q.defer());
            promises.push(defers[i].promise);
        }
        var all = Q.all(promises);
        all.then(function (imageObjects) {
            //looking for the best url
            var imageObj = {};
            imageObj.details = [imageObjects[0]];
            imageObj.currentMatchIndex = 0;
            var bestLocatorLink = new Elogio.Annotations(imageObj, config).getLocatorLink(), currentLocatorLink;
            console.log(imageObjects);
            for (var i = 1; i < imageObjects.length; i++) {
                imageObj.details = [imageObjects[i]];
                currentLocatorLink = new Elogio.Annotations(imageObj, config).getLocatorLink();
                if (bestLocatorLink.length < currentLocatorLink.length) {
                    bestLocatorLink = currentLocatorLink;
                }
            }
            imageObjFromStorage.details[imageObjFromStorage.currentMatchIndex].thumbnailUrl = bestLocatorLink;
            if (callback) {
                callback(imageObjFromStorage);
            }
        });
        for (i = 0; i < media.length; i++) {
            requestHandler(hrefs[i], defers[i]);
        }
    };
    /**
     * Generates random UUID
     * @return{String} Generated UUID
     */
    self.generateUUID = (function () {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }

        return function () {
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                s4() + '-' + s4() + s4() + s4();
        };
    })();
};