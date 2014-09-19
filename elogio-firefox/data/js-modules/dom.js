/**
 * Created by LOGICIFY\corvis on 9/12/14.
 */

Elogio.modules.dom = function(modules) {
    'use strict';
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


    /*
    =======================
    PUBLIC MEMBERS
    =======================
    */

    // Module configuration


    /**
     * Returns DOM element by given internal UUID.
     * @param guid - Elogio internal UUID which is used for identification of nodes which should be processed by plugin.
     * @returns {*}
     */
    this.getElementByUUID = function(guid) {
        // Efficient implementation which uses querySelector method
        if (document.querySelectorAll) {
            return document.querySelector('[' + config.ui.dataAttributeName + '="' + guid + '"]');
        } else { // If querySelector is not supported - fallback to the legacy method
            var nodeList = document.getElementsByTagName('*');
            for (var i = 0, n = nodeList.length; i < n; i++) {
                var att = nodeList[i].getAttribute(config.ui.dataAttributeName);
                if (att && att === guid) {
                    return nodeList[i];
                }
            }
        }
    };
    /**
     * this function needs for getting all elements which decorated on the page
     *
     * @returns {*}
     */
    this.getAllDecoratedElements=function(){
        if (document.querySelectorAll) {
            var domElements=document.querySelectorAll('[' +config.ui.decoratedItemAttribute+']');
            return Array.prototype.slice.call(domElements,0,domElements.length);
        } else { // If querySelector is not supported - fallback to the legacy method
            var nodeList = document.getElementsByTagName('*'),
            nodeArray=[];
            for (var i = 0, n = nodeList.length; i < n; i++) {
                var att = nodeList[i].getAttribute(config.ui.decoratedItemAttribute);
                if (att) {
                   nodeArray.push(nodeList[i]);
                }
            }
            return nodeArray;
        }
    };

    /**
     * Returns Elogio UUID of the element if was set, otherwise returns undefined.
     * @param element - target DOM element
     */
    this.getUUIDofElement = function(element) {
        return element.getAttribute(config.ui.dataAttributeName);
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


    // If JQuery is in context - extend it with some useful plugins
    if (typeof jQuery !== 'undefined') {
        // Highlight effect
        if (!jQuery.fn.highlight) {
            jQuery.fn.highlight = function() {
                $(this).each(function() {
                    var el = $(this),
                        originalColor = el.css('background-color');
                    if (el.hasClass('jqHighlight')) {
                        return;
                    }
                    el.addClass('jqHighlight');
                    el.animate( { backgroundColor: "#ffffcc" }, 1 )
                      .animate( { backgroundColor: originalColor }, 1500, function() {
                            $(this).removeClass('jqHighlight');
                        });
                });
            };
        }
    }

};