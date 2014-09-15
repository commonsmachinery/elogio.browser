/**
 * Created by LOGICIFY\corvis on 9/12/14.
 */
Elogio.modules.imageDecorator = function (modules) {
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

    function buildIdForIcon(imageUuid) {
        return 'elogioico_' + imageUuid;
    }

    function buildIconElement(element) {
        var iconElement = new Image();
        iconElement.src = self.config.iconUrl;
        iconElement.width = self.config.iconWidth;
        iconElement.height = self.config.iconHeight;
        iconElement.style.position = 'absolute';
        iconElement.style.display = 'none';
        iconElement.style.zIndex = '10000';
        iconElement.style.cursor = 'pointer';
        iconElement.id = buildIdForIcon(dom.getUUIDofElement(element));
        return iconElement;
    }

    /*
     =======================
     PUBLIC MEMBERS
     =======================
     */
    this.config = config.ui.imageDecorator;

    /**
     * Draws Elogio icon on top of the given element.
     * @param element - target element
     * @param document - DOM root
     * @param callback - callback function which will act as an action handler (e.g. OnClick event of the icon).
     *                   Signature: callback(uuid)
     *                   uuid{String} - UUID of the related image
     */
    this.decorate = function(element, document, callback) {
        var iconElement, uuid = dom.getUUIDofElement(element),
            position, iconAlreadyCreated = false;
        // Get or build icon element
        iconElement = document.getElementById(buildIdForIcon(uuid));
        if (iconElement) {
            iconAlreadyCreated = true;
        } else {
            iconElement = buildIconElement(element);
            // Append icon to the body
            document.body.appendChild(iconElement);
            // Show on mouse in
            element.addEventListener('mouseover', function() {
                self.decorate(this, document);
            });
            // Hide icon on mouse out
            element.addEventListener('mouseout', function () {
                var uuid = dom.getUUIDofElement(this),
                    iconElement;
                iconElement = document.getElementById(buildIdForIcon(uuid));
                if (iconElement) {
                    iconElement.style.display = 'none';
                }
            });
            iconElement.addEventListener('mouseout', function(){
                this.style.display = 'none';
            });
            // Prevent bubbling of the mouseover event
            iconElement.addEventListener('mouseover', function(e) {
                e.bubble = false;
                if (iconElement.style.display === 'none') {
                    iconElement.style.display = 'block';
                }
            });
            if (callback) {
                iconElement.addEventListener('click', function() {
                    callback(uuid);
                });
            }
        }
        // Position icon on the element
        position = dom.getAbsolutePosition(element);
        iconElement.style.top = position.top + 'px';
        iconElement.style.left = position.left + 'px';
        // Hide element if this is very first call.
        iconElement.style.display = iconAlreadyCreated ? 'block' : 'none';
    };

    this.undecorate = function(element, document) {
        var uuid = dom.getUUIDofElement(element),
            iconElement;
        iconElement = document.getElementById(buildIdForIcon(uuid));
        if (iconElement) {
            document.body.removeChild(iconElement);
        }
    };

};