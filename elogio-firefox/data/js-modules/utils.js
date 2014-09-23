/**
 * Created by LOGICIFY\corvis on 9/15/14.
 */

Elogio.modules.utils = function(modules) {
    'use strict';
    /*
     =======================
     REQUIREMENTS
     =======================
     */

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
    this.startsWith = function(st, prefix) {
        return st.indexOf(prefix) === 0;
    };

    /**
     * Returns canonized representatiopn of the url.
     * @param url - url to be canonized
     * @param currentLocation - url which targets current location. It will be used for resolving relative links
     */
    this.canonizeUrl = function(url, currentLocation) {
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
     * Generates random UUID
     * @return{String} Generated UUID
     */
    this.generateUUID = (function () {
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