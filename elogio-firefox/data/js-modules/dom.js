/**
 * Created by LOGICIFY\corvis on 9/12/14.
 */

Elogio.modules.dom = function(modules) {
    'use strict';
    var self = this;
    /*
     =======================
     REQUIREMENTS
     =======================
     */
    var utils = modules.getModule('utils');

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

    // Module configuration
    this.config = {
        dataAttributeName: 'elogio'
    };

    this.getElementByGUID = function(guid) {
        // Efficient implementation which uses querySelector method
        if (document.querySelectorAll) {
            return document.querySelectorAll('['+self.config.dataAttributeName+'="' + guid + '"]');
        } else {
            var nodeList = document.getElementsByTagName('*');
            for (var i = 0, n = nodeList.length; i < n; i++) {
                var att = nodeList[i].getAttribute(self.config.dataAttributeName);
                if (att && att === guid) {
                    return nodeList[i];
                }
            }
        }
    };

};