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

    /**
     * Returns DOM element by given internal UUID.
     * @param guid - Elogio internal UUID which is used for identification of nodes which should be processed by plugin.
     * @returns {*}
     */
    this.getElementByUUID = function(guid) {
        // Efficient implementation which uses querySelector method
        if (document.querySelectorAll) {
            return document.querySelector('[' + self.config.dataAttributeName + '="' + guid + '"]');
        } else { // If querySelector is not supported - fallback to the legacy method
            var nodeList = document.getElementsByTagName('*');
            for (var i = 0, n = nodeList.length; i < n; i++) {
                var att = nodeList[i].getAttribute(self.config.dataAttributeName);
                if (att && att === guid) {
                    return nodeList[i];
                }
            }
        }
    };

    /**
     * Returns Elogio UUID of the element if was set, otherwise returns undefined.
     * @param element - target DOM element
     */
    this.getUUIDofElement = function(element) {
        return element.getAttribute(this.config.dataAttributeName);
    };

    /**
     * Returns absolute coordinate for given element
     * @param element - target DOM element
     * @returns{Object} - Object with top, left attributes
     */
    this.getAbsolutePosition = function(element) {
        var xPosition = 0, yPosition = 0;

        while(element) {
            xPosition += (element.offsetLeft - element.scrollLeft + element.clientLeft);
            yPosition += (element.offsetTop - element.scrollTop + element.clientTop);
            element = element.offsetParent;
        }
        return {
            top: yPosition,
            left: xPosition
        };
    };

};