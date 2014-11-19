/**
 * Created by LOGICIFY\corvis on 9/16/14.
 */

Elogio.modules.bridge = function (modules) {
    'use strict';
    var self = this;

    /*
     =======================
     REQUIREMENTS
     =======================
     */
    var messaging = modules.getModule('messaging');

    /*
     =======================
     PRIVATE MEMBERS
     =======================
     */
    var bus = {}, defaultTransportName = 'default';


    function onHandler(eventName, transport, callback, source) {
        if (transport && transport.postMessage || !transport) {
            messaging.on(eventName, callback, source);
        } else {
            transport.on(eventName, callback);
        }
    }


    function emitHandler(eventName, transport, arg, destination, from) {
        if (transport.postMessage) {
            if (from) {
                transport.postMessage({eventName: eventName, data: arg, from: from}, destination);
            } else {
                transport.postMessage({eventName: eventName, data: arg}, destination);
            }
        } else if (transport.contentWindow && transport.contentWindow.postMessage) {
            transport.contentWindow.postMessage({eventName: eventName, data: arg}, destination)
        } else {
            transport.emit(eventName, arg, from);
        }
    }

    function checkEventName(eventName) {
        if (!self.events.hasOwnProperty(eventName)) {
            console.warn('Event "' + eventName + '" is unknown. Check bridge module for ' +
            'complete list of available events.');
            return false;
        }
        return true;
    }

    /*
     =======================
     PUBLIC MEMBERS
     =======================
     */

    self.events = {
        /**
         * Fires each time after plugin state was switched to Active
         */
        pluginActivated: 'pluginActivated',
        /**
         * Fires when plugin after was switched to Disabled state
         */
        pluginStopped: 'pluginStopped',
        /**
         * Fires each time when internal configuration object was updated
         */
        configUpdated: 'configUpdated',
        /**
         * Fires each time when plugin starts page processing
         */
        startPageProcessing: 'startPageProcessing',
        /**
         * Fires when page processing was finished
         */
        pageProcessingFinished: 'pageProcessingFinished',
        /**
         * Fires each time when plugin finds new image on the page (during processing)
         */
        newImageFound: 'newImageFound',
        /**
         * Fires each time when user switches tab in browser
         */
        tabSwitched: 'tabSwitched',

        /**
         * Fired when someone preform an action on an image
         */
        onImageAction: 'onImageAction',
        /**
         * Fires when it is needed to load image details. Image UUID will be passed as argument
         */
        imageDetailsRequired: "imageDetailsRequired",
        /**
         * Fires application receives image details from server.
         * Arguments: imageDetails
         *            error - will be false if request was successful, otherwise will contain an object
         *                    of the following structure: { code: 1, msg: "" }
         */
        imageDetailsReceived: "imageDetailsReceived",
        /**
         * Fires when image was removed from DOM, needs for remove image from panel when this image disappear from page
         */
        onImageRemoved: "onImageRemoved",
        /**
         * Fires when click on button on the panel 'Copy', and sends html text to main.js which save it to clipboard
         */
        copyToClipBoard: "copyToClipBoard",
        /**
         * Fires always when page shows up, but in main.js we checks: page from cache or no
         */
        pageShowEvent: "pageShowEvent",
        /**
         * Fires when we need hash of image for lookup request
         */
        hashRequired: "hashRequired",
        /**
         * Fires when hash calculated and need to send it to main.js
         */
        hashCalculated: "hashCalculated",
        /**
         * Fires when all scripts loaded and sidebar required
         */
        sidebarRequired: "sidebarRequired",
        /**
         * Fires when all scripts loaded to the DOM
         */
        ready: 'ready',
        /**
         * Fires when context menu shows up
         */
        setUUID: 'setUUID',
        /**
         * Fires when need to setup the locale
         */
        l10nSetupLocale: 'l10nSetupLocale',
        /**
         * Fires when user click on query button at first time, and at first we need to check oembed data if exist
         */
        oembedRequestRequired: 'oembedRequestRequired',
        /**
         * is needed for registration content script in main.js
         */
        registration: 'registration',
        /**
         * Fires when feedback template required
         */
        feedbackTemplateRequired: 'feedbackTemplateRequired',
        /**
         * Fires when panel sent to content message for feedback
         */
        feedBackMessage: 'feedBackMessage'
    };

    self.registerClient = function (transportObj, name) {
        if (transportObj) {
            bus[name || defaultTransportName] = transportObj;
        } else {
            bus[name || defaultTransportName] = messaging;
        }
    };

    this.on = function (eventName, callback, source) {
        var i, transport;
        source = source || [defaultTransportName];
        if (checkEventName(eventName)) {
            for (i = 0; i < source.length; i += 1) {
                transport = bus[source[i]];
                if (callback) {
                    onHandler(eventName, transport, callback, source);
                }
            }
        }
    };

    self.emit = function (eventName, arg, destination, from) {
        var i, transport;
        if (!destination) {
            destination = [defaultTransportName];
        }
        if (checkEventName(eventName)) {
            for (i = 0; i < destination.length; i += 1) {
                transport = bus[destination[i]];
                if (transport) {
                    emitHandler(eventName, transport, arg, destination[i], from);
                } else {
                    console.error('Unknown transport: ' + destination[i] + 'eventName is ' + eventName);
                }
            }
        }
    };
};