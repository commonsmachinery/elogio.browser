/**
 * Created by TEMA on 16.09.2014.
 */
Elogio.modules.elogioRequest = function (modules) {
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
    self.sendRequest = function (url, onSuccess, onError, method) {
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
    };

    self.getTextFile = function (url, onSuccess, onError, method) {
        method = method || 'GET';
        var request = new Request({
            url: url,
            overrideMimeType: 'text/html',
            onComplete: function (response) {
                if (response) {
                    if (onSuccess) {
                        onSuccess(response.text);
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
    };

    /**
     * POST request with post body
     * @param url
     * @param postBody
     * @param onSuccess
     * @param onError
     */

    self.sendPOSTFeedbackSubmit = function (url, postBody, onSuccess, onError) {
        var request = new Request({
            url: url,
            overrideMimeType: "application/json",
            content: postBody,
            onComplete: function (response) {
                if (response) {
                    if (onSuccess) {
                        onSuccess(response);
                    }
                } else {
                    if (onError) {
                        onError(response);
                    }
                }
            }
        });
        request.post();
    };


};