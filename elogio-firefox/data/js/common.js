/**
 * Created by LOGICIFY\corvis on 9/12/14.
 */

function Elogio() {
    "use strict";
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
Elogio.prototype.getModule = function (moduleName) {
    "use strict";
    if (this.hasOwnProperty(moduleName)) {
        return this[moduleName];
    } else {
        console.error('Unable to load module: ' + moduleName);
        return null;
    }
};

Elogio.inherit = function (C, P) {
    "use strict";
    C.prototype = new P();
    C.superClass = P.prototype;
    C.prototype.constructor = C;
};

Elogio.Observable = function () {
    "use strict";
    var bus = {};

    function validateEventName(eventName, self) {
        if (self.events.indexOf(eventName) === -1) {
            console.error('Event ' + eventName + 'is not supported by ' + self.constructor.name);
            return false;
        }
        return true;
    }

    this.events = [];

    this.emit = function (eventName, arg) {
        var i, handlers;
        if (!validateEventName(eventName, this)) {
            return;
        }
        handlers = bus[eventName];
        for (i = 0; i < handlers.length; i +=1) {
            bus[i].apply(null, arg);
        }
    };

    this.on = function (eventName, callback) {
        var handlers;
        if (!validateEventName(eventName, this)) {
            return;
        }
        if (!bus[eventName]) {
            bus[eventName] = [];
        }
        handlers = bus[eventName];
        handlers[handlers.length] = callback;
    };
};

/**
 * Class allows to
 * @constructor
 */
Elogio.StateController = function (initialState) {
    "use strict";
    var state = {};

    this.isObservable = false;

    this.get = function (propertyName, defaultValue) {
        if (!(propertyName in state)) {
            return defaultValue;
        }
        return state[propertyName];
    };

    this.set = function (propertyName, value) {
        var oldValue = state[propertyName];
        state[propertyName] = value;
        if (this.isObservable) {
            this.emit(this.constructor.events.onPropertyChanged, [propertyName, oldValue, value]);
        }
    };

    if (initialState) {
        state = initialState || {};
        if (this.isObservable) {
            this.emit(this.constructor.events.onInitialized);
        }
    }
    this.events = this.constructor.events;
};
Elogio.StateController.events = {
    onPropertyChanged:  'onChanged',
    onInitialized:      'onInitialized'
};
Elogio.inherit(Elogio.StateController, Elogio.Observable);

// If module is used in Chrome context
if (typeof exports !== 'undefined') {
    exports.Elogio = Elogio;
}
