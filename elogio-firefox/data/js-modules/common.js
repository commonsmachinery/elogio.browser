/**
 * Created by LOGICIFY\corvis on 9/12/14.
 */

function Elogio() {
    "use strict";
    var a = 1;
    console.log('Elogio sandbox');
    // convert arguments to real array
    var args = Array.prototype.slice.call(arguments),
        // callback should be the last element in the list of arguments
        callback = args.pop(),
        // Module names can be passed as array or set of arguments
        modules = (args[0] && typeof args[0] === 'string') ? args : (args[0] ? args[0] : []), i;
    // Explicitly call constructor if it is needed
    if (!(this instanceof Elogio)) {
        return new Elogio(modules, callback);
    }
    Elogio.modules = Elogio.modules || {};
    // Initialize all needed modules
    for (i = 0; i < modules.length; i += 1) {
        if (Elogio.modules.hasOwnProperty(modules[i])) {
            this[modules[i]] = new Elogio.modules[modules[i]](this);
        } else {
            console.error('Dependency injection failed. Unable to find module: ' + modules[i]);
        }
    }
    // .. and finally invoke callback method!
    callback(this);
}

Elogio.modules = Elogio.modules || {};
Elogio.prototype.getModule = function(moduleName) {
    "use strict";
    if (this.hasOwnProperty(moduleName)) {
        return this[moduleName];
    } else {
        console.error('Unable to load module: ' + moduleName);
        return null;
    }
};