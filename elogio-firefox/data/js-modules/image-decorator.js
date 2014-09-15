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
    var dom = modules.getModule('dom');

    /*
     =======================
     PRIVATE MEMBERS
     =======================
     */

    function buildIdForIcon(imageUuid) {
        return 'elogioIgon_' + imageUuid;
    }

    function buildIconElement(element) {
        var iconElement = new Image();
        iconElement.src = self.config.iconUrl;
        iconElement.width = self.config.iconWidth;
        iconElement.height = self.config.iconHeight;
        iconElement.style.position = 'absolute';
        iconElement.style.display = 'none';
        iconElement.style.zIndex = '10000';
        iconElement.id = buildIdForIcon(dom.getUUIDofElement(element));
        return iconElement;
    }

    /*
     =======================
     PUBLIC MEMBERS
     =======================
     */
    this.config = {
        iconUrl: '',
        iconWidth: 20,
        iconHeight: 20
    };

    /**
     * Draws Elogio icon on top of the given element.
     * @param element - target element
     * @param document - DOM root
     */
    this.decorate = function(element, document) {
        var iconElement, uuid = dom.getUUIDofElement(element),
            position, iconAlreadyCreated = false;
        // Get or build icon element
        iconElement = document.getElementById(buildIdForIcon(uuid));
        if (iconElement) {
            iconAlreadyCreated = true;
        } else {
            iconElement = buildIconElement(element);
        }
        // Append icon to the body
        document.body.appendChild(iconElement);
        // Position icon on the element
        position = dom.getAbsolutePosition(element);
        iconElement.style.top = position.top;
        iconElement.style.left = position.left;
        // Hide element if this is very first call.
        iconElement.style.display = iconAlreadyCreated ? 'block' : 'none';
        // Show on mouse in
        iconElement.addEventListener('mouseover', function() {
            self.decorate(this);
        });
        // Hide icon on mouse out
        iconElement.addEventListener('mouseout', function() {
            var uuid = dom.getUUIDofElement(this),
                iconElement;
            iconElement = document.getElementById(buildIdForIcon(uuid));
            if (iconElement) {
                iconElement.style.display = 'none';
            }
        });
    };

    this.undecorate = function(element, document) {
        var uuid = dom.getUUIDofElement(element),
            iconElement;
        iconElement = document.getElementById(buildIdForIcon(uuid));
        if (iconElement) {
            document.body.removeChild(iconElement);
        }
    }

};