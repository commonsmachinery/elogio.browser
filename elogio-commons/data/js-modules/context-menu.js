/**
 * Created by TEMA on 23.10.2014.
 */
Elogio.modules.contextMenu = function (modules) {
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
    var itemHandler = null, uuid = null;

    function showMenu() {
        if (self.contextMenuTemplate) {
            self.contextMenuTemplate.style.left = (self.mouse.x + window.pageXOffset || document.documentElement.scrollLeft) + 'px';
            self.contextMenuTemplate.style.top = (self.mouse.y + +window.pageYOffset || document.documentElement.scrollTop) + 'px';
            self.contextMenuTemplate.style.display = 'block';
        }
    }

    function hideMenu() {
        if (self.contextMenuTemplate) {
            self.contextMenuTemplate.style.display = 'none';
        }
    }

    function itemHandlerClick(e) {
        var element = e.target || e.srcElement;
        if (!element) {
            console.error("seems like event doesn't have any target");
            return false;
        }
        if (itemHandler && uuid) {
            itemHandler(uuid);
        }
    }

    function contextMenuHandler(event) {
        event = event || window.event;
        //stop browser actions on this node
        if (event.stopPropagation) {
            event.stopPropagation();
        } else {
            event.cancelBubble = true;
        }
        if (event.preventDefault) {
            event.preventDefault();
        } else {
            event.returnValue = false;
        }
        if (!self.contextMenuTemplate) {
            console.error("I don't have any HTML implementation of context menu");
            return false;
        }
        uuid = this.getAttribute(config.ui.dataAttributeName);
        self.mouse.x = event.clientX || event.pageX;
        self.mouse.y = event.clientY || event.pageY;
        showMenu(self.mouse);
    }


    /*
     =======================
     PUBLIC MEMBERS
     =======================
     */
    self.mouse = {x: 0, y: 0};
    self.contextMenuTemplate = null;
    self.init = function (contextTemplate, document) {
        self.contextMenuTemplate = contextTemplate;
        document.body.appendChild(contextTemplate);
        document.addEventListener('click', hideMenu);
        document.addEventListener('keyup', function (e) {
            if (e.type === 'keyup' && e.keyCode !== 27) {
                return;
            }
            uuid = null;
            hideMenu();
        });
        document.addEventListener('contextmenu', function (e) {
            uuid = null;
            hideMenu();
        });
        contextTemplate.addEventListener('click', itemHandlerClick);
    };
    self.attachContextMenu = function (node, callback) {
        node.addEventListener('contextmenu', contextMenuHandler);
        itemHandler = callback;
    };
};