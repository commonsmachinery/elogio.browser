/**
 * Created by LOGICIFY\corvis on 9/12/14.
 */

Elogio.modules.dom = Elogio(function(modules) {
    'use strict';
    // Module configuration
    this.config = {
        dataAttributeName: 'elogio'
    };
    var self = this;
    /*
     =======================
     PRIVATE MEMBERS
     =======================
     */
    var generateGuid = (function () {
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


    /*
    =======================
    PUBLIC MEMBERS
    =======================
    */
    this.getElementByGUID = function(guid) {
        var nodeList = document.getElementsByTagName('*');
        for (var i = 0, n = nodeList.length; i < n; i++) {
            var att = nodeList[i].getAttribute(self.config.dataAttributeName);
            if (att && att === id) {
                return nodeList[i];
            }
        }
    };

});