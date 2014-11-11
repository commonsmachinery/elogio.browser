/**
 * Created by TEMA on 09.10.2014.
 */
Elogio.modules.elogioServer = function (modules) {
    'use strict';
    var self = this;
    /*
     =======================
     REQUIREMENTS
     =======================
     */
    var config = modules.getModule('config'), elogioRequest = modules.getModule('elogioRequest');
    /*
     =======================
     PRIVATE MEMBERS
     =======================
     */

    /**
     * This method
     * @param options
     * @returns {string}
     */
    function urlHelperBuilder(options) {
        var url = '?';
        for (var key in options) {
            if (options.hasOwnProperty(key)) {
                if (Array.isArray(options[key])) { //if array
                    for (var j = 0; j < options[key].length; j++) {
                        url += key + '=' + encodeURIComponent(options[key][j]) + '&';
                    }
                } else { //if string or number
                    url += key + '=' + encodeURIComponent(options[key]) + '&';
                }
            }
        }
        return url.substring(0, url.length - 1);
    }

    /*
     =======================
     PUBLIC MEMBERS
     =======================
     */

    /**
     * @param{String} imageUrlOrUrls - url of image from page, there is a request param
     * @param{Function} onLoad - callback method which will be invoked on event onLoad data from site.
     * @param{Function} onError -      Callback method which will be called on event error requesting
     */
    self.lookupQuery = function (imageUrlOrUrls, onLoad, onError) {
        var url = config.global.apiServer.serverUrl + config.global.apiServer.lookupContext + urlHelperBuilder(imageUrlOrUrls);
        elogioRequest.sendRequest(url, onLoad, onError, 'GET');
    };

    /**
     * @param hash - it's the hash of image, which needs for lookup
     * @param onLoad
     * @param onError
     * @param parameters
     */
    self.hashLookupQuery = function (parameters, onLoad, onError) {
        if (!parameters.hash) {
            return;
        }
        var url = config.global.apiServer.serverUrl + config.global.apiServer.hashLookupContext + urlHelperBuilder(parameters);
        elogioRequest.sendRequest(url, onLoad, onError, 'GET');
    };
    /**
     *
     * @param url - there is url of the server where sending request (not uri of image!!!)
     * @param onLoad
     * @param onError
     * @param options - there is parameters of request;
     */
    self.annotationsQuery = function (url, onLoad, onError, options) {
        options = options || {include: ['owner'], annotations: ['title,locator,policy']};
        url += urlHelperBuilder(options);
        elogioRequest.sendRequest(url, onLoad, onError);
    };

    /**
     *
     * @param oembedEndpoint - endpoint for oembed request
     * @param imageUrl - url of image which needs for oembed data
     * @param onError
     * @param onLoad
     */
    self.oembedLookup = function (oembedEndpoint, imageUrl, onLoad, onError) {
        var url = oembedEndpoint + urlHelperBuilder({url: imageUrl});
        elogioRequest.sendRequest(url, onLoad, onError);
    };
};