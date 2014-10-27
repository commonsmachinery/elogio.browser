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
    //var config = modules.getModule('config');

    /*
     =======================
     PRIVATE MEMBERS
     =======================
     */
    var bus = {}, defaultTransportName = 'default';

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

    this.events = {
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
         * fires when need to send message to content script (doorbell actions)
         */
        doorBellInjection: 'doorbellInjection'
    };

    this.registerClient = function (transportObj, name) {
        if (!transportObj.on || !transportObj.emit) {
            console.error('Unable to register transport. Transport object should provide "on" and "emit" methods.');
        }
        bus[name || defaultTransportName] = transportObj;
    };

    this.on = function (eventName, callback, source) {
        var i, transport;
        if (source === '*') {
            source = Object.getOwnPropertyNames(bus);
        } else {
            source = source || [defaultTransportName];
        }
        if (checkEventName(eventName)) {
            for (i = 0; i < source.length; i += 1) {
                transport = bus[source[i]];
                if (transport) {
                    if (callback) {
                        transport.on(eventName, callback);
                    }
                } else {
                    console.error('Unknown transport: ' + source[i]);
                }
            }
        }
    };

    this.emit = function (eventName, arg, destination) {
        var i, transport;
        if (destination === 'default') {
            destination = [defaultTransportName];
        } else {
            destination = destination || Object.getOwnPropertyNames(bus);
        }
        if (checkEventName(eventName)) {
            for (i = 0; i < destination.length; i += 1) {
                transport = bus[destination[i]];
                if (transport) {
                    transport.emit(eventName, arg);
                } else {
                    console.error('Unknown transport: ' + destination[i]);
                }
            }
        }
    };
};