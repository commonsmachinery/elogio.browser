/**
 * Created by TEMA on 16.09.2014.
 * This module needs for jquery
 */
Elogio.modules.elogioRequest = function (modules) {
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

    /**
     * @param url - there is the server url where sending request
     * @param onSuccess - callback function for success request
     * @param onError - callback function which calls on error
     * @param method - HTTP method to be used
     * @param headers
     */
    self.sendRequest = function (url, onSuccess, onError, method) {
        url = url || config.global.apiServer.serverUrl;
        method = method || 'GET';
        $.ajax({
            type: method,
            headers: {Accept: 'application/json'},
            url: url,
            dataType: "json",
            success: function (response) {
                if (onSuccess) {
                    onSuccess(response);
                }
            },
            error: function (response) {
                if (onError) {
                    onError(response);
                }
            }
        });
    };
    self.getTextFile = function (url, onSuccess, onError, method) {
        method = method || 'GET';
        $.ajax({
            type: method,
            url: url,
            dataType: 'html',
            success: function (response) {
                if (onSuccess) {
                    onSuccess(response);
                }
            },
            error: function (response) {
                if (onError) {
                    onError(response);
                }
            }
        });
    };

    /**
     * POST request with post body
     * @param url
     * @param postBody
     * @param onSuccess
     * @param onError
     */

    self.sendPOSTFeedbackSubmit = function (url, postBody, onSuccess, onError) {
        $.ajax({
            type: 'POST',
            url: url,
            mimeType: "application/json",
            data: postBody,
            success: function (response) {
                if (onSuccess) {
                    onSuccess(response);
                }
            },
            error: function (response) {
                if (onError) {
                    onError(response);
                }
            }
        });
    };
};