/**
 * Created by TEMA on 16.09.2014.
 */
Elogio.modules.elogioServer = function (modules) {
    'use strict';
    var self = this;
    /*
     =======================
     REQUIREMENTS
     =======================
     */
    var config = modules.getModule('config'),
        Request = require('sdk/request').Request;
    /*
     =======================
     PRIVATE MEMBERS
     =======================
     */

    /**
     * @param url - there is the server url where sending request
     * @param onSuccess - callback function for success request
     * @param onError - callback function which calls on error
     * @param method - HTTP method to be used
     */
    function sendRequest(url, onSuccess, onError, method) {
        url = url || config.global.apiServer.serverUrl;
        method = method || 'GET';
        var request = new Request({
            url: url,
            headers: { Accept: 'application/json' },
            onComplete: function (response) {
                if (response.json) {
                    if (onSuccess) {
                        onSuccess(response.json);
                    }
                } else {
                    if (onError) {
                        onError(response);
                    }
                }
            }
        });
        switch (method) {
            case 'GET':
                request.get();
                break;
            case 'POST':
                request.post();
        }
    }

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
    this.lookupQuery = function (imageUrlOrUrls, onLoad, onError) {
        var url = config.global.apiServer.serverUrl + config.global.apiServer.lookupContext + urlHelperBuilder(imageUrlOrUrls);
        sendRequest(url, onLoad, onError, 'GET');
    };

    /**
     * @param hash - it's the hash of image, which needs for lookup
     * @param onLoad
     * @param onError
     */
    this.hashLookupQuery = function (hash, onLoad, onError) {
        if (!hash) {
            return;
        }
        var url = config.global.apiServer.serverUrl + config.global.apiServer.hashLookupContext + urlHelperBuilder({hash: hash});
        sendRequest(url, onLoad, onError, 'GET');
    };
    /**
     *
     * @param url - there is url of the server where sending request (not uri of image!!!)
     * @param onLoad
     * @param onError
     * @param options - there is parameters of request;
     */
    this.annotationsQuery = function (url, onLoad, onError, options) {
        options = options || {include: ['owner'], annotations: ['title,locator,policy']};
        url += urlHelperBuilder(options);
        sendRequest(url, onLoad, onError);
    };

    /**
     * This method returns data from 2 requests in callbacks:
     * 1 request - lookup request which getting json with lookup data
     * 2 request - annotation request which getting json with annotations for image
     * @param imageUrl - there is uri of image for lookup request
     * @param onLoad - callback which called when success
     * @param onError - callback which called when error
     * @param options - there is options of url request for annotation request
     */
    this.getAnnotationsForImage = function (imageUrl, onLoad, onError, options) {
        this.lookupQuery(imageUrl, function (data) {
            if (data[0].href) {
                self.annotationsQuery(data[0].href, function (data) {
                    if (onLoad) {
                        onLoad(data);
                    }
                }, onError, options);
            }
        }, onError);
    };
};