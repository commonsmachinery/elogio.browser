/**
 * Created by TEMA on 09.10.2014.
 * bridge required
 */
Elogio.modules.messaging = function (modules) {
    'use strict';
    var self = this;
    Elogio.inherit(this, new Elogio.Observable());
    /*
     =======================
     REQUIREMENTS
     =======================
     */
    var bridge = modules.getModule('bridge');

    /*
     =======================
     PRIVATE MEMBERS
     =======================
     */
    //init events
    var props = Object.getOwnPropertyNames(bridge.events);
    for (var i = 0; i < props.length; i++) {
        if (bridge.events.hasOwnProperty(props[i])) {
            self.events.push(bridge.events[props[i]]);
        }
    }
};