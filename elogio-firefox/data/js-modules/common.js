/**
 * Created by LOGICIFY\corvis on 9/12/14.
 */

function Elogio() {
    'use strict';
    // convert arguments to real array
    var args = Array.prototype.slice.call(arguments),
    // callback should be the last element in the list of arguments
    callback = args.pop(),
    // Module names can be passed as array or set of arguments
    modules = (args[0] && typeof args[0] === 'string') ? args : args[0], i;
    // Explicitly call constructor if it is needed
    if (!(this instanceof Elogio)) {
        return new Elogio(modules, callback);
    }
    // Initialize all needed modules
    for (i = 0; i < modules.length; i += 1) {
        Elogio.modules[modules[i]](this);
    }
    // .. and finally invoke callback method!
    callback(this);
}

Elogio.modules = {};