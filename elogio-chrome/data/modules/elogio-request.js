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
     */
    self.sendRequest = function (url, onSuccess, onError, method) {
        url = url || config.global.apiServer.serverUrl;
        method = method || 'GET';
        $.ajax({
            type: method,
            headers: { Accept: 'application/json' },
            url: url,
            dataType: "json",
            success: function (response) {
                onSuccess(response);
            },
            error: function (response) {
                onError(response);
            }
        });
    };

};