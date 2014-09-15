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
    var dom = modules.getModule('dom'),
        config = modules.getModule('config');

    /*
     =======================
     PRIVATE MEMBERS
     =======================
     */
    var transport, isInitialized;

    function checkEventName(eventName) {
        if (!self.events.hasOwnProperty(eventName)) {
            console.warn('Event "'+eventName+'" is unknown. Check bridge module for ' +
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
        newImageFound: 'newImageFound'
    };

    this.init = function(transportObj) {
        transport = transportObj;
        isInitialized = true;
    };

    this.on = function(eventName, callback) {
        if (!isInitialized) {
            console.error('Bridge is not initialized');
            return;
        }
        if (checkEventName(eventName)) {
            transport.on(eventName, callback);
        }
    };

    this.emit =function(eventName, arg) {
        if (!isInitialized) {
            console.error('Bridge is not initialized');
            return;
        }
        if (checkEventName(eventName)) {
            transport.emit(eventName, callback);
        }
    };
};