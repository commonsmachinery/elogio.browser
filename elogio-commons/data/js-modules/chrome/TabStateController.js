Elogio.ApplicationStateController = function () {
    "use strict";
    Elogio.inherit(this, new Elogio.StateController());

    var ATTRIBUTE_TAB_STATE_PREFIX = 'tabState_';

    this.getTabState = function (tabId) {
        if (!this.propertyExists(ATTRIBUTE_TAB_STATE_PREFIX + tabId)) {
            this.set(ATTRIBUTE_TAB_STATE_PREFIX + tabId, new Elogio.TabStateController());
        }
        return this.get(ATTRIBUTE_TAB_STATE_PREFIX + tabId);
    };

    this.dropTabState = function (tabId) {
        this.dropProperty(ATTRIBUTE_TAB_STATE_PREFIX + tabId);
    };

    this.getAllTabState = function () {
        var propertyNames = this.getAllPropertyNames(), i, result = [];
        for (i = 0; i < propertyNames.length; i += 1) {
            if (propertyNames[i].indexOf(ATTRIBUTE_TAB_STATE_PREFIX) === 0) {
                result[result.length] = this.get(propertyNames[i]);
            }
        }
        return result;
    };

};

Elogio.TabStateController = function () {
    "use strict";
    Elogio.inherit(this, new Elogio.StateController());

    var ATTRIBUTE_IMAGE_STORE = 'imageStore';
    var ATTRIBUTE_WORKER = 'worker';
    var ATTRIBUTE_LOOKUP_IMAGE_STORAGE = 'lookupImageStorage';
    var IS_PAGE_HIDDEN = 'isPageHidden';
    var self = this;

    var getImageStorage = function () {
        if (!self.propertyExists(ATTRIBUTE_IMAGE_STORE)) {
            self.set(ATTRIBUTE_IMAGE_STORE, {});
        }
        return self.get(ATTRIBUTE_IMAGE_STORE);
    };

    var getLookupImageStorage = function () {
        if (!self.propertyExists(ATTRIBUTE_LOOKUP_IMAGE_STORAGE)) {
            self.set(ATTRIBUTE_LOOKUP_IMAGE_STORAGE, []);
        }
        return self.get(ATTRIBUTE_LOOKUP_IMAGE_STORAGE);
    };

    this.isPageHidden = function (isIt) {
        if (isIt === undefined) {
            return self.get(IS_PAGE_HIDDEN);
        }
        self.set(IS_PAGE_HIDDEN, isIt);
    };

    this.putImageToLookupStorage = function (imageObject) {
        var store = getLookupImageStorage();
        if (imageObject.uuid) {
            store.push(imageObject);
        } else {
            console.error('Only ImageObject can be placed in LookupStorage');
        }
    };

    this.hasErrors = function () {
        var store = getImageStorage(), key;
        for (key in store) {
            if (store.hasOwnProperty(key)) {
                if (store[key].error && !store[key].noData) {
                    return true;
                }
            }
        }
        return false;
    };

    this.getAllImagesWithErrors = function () {
        var store = getImageStorage(), key, result = [];
        for (key in store) {
            if (store.hasOwnProperty(key)) {
                if (store[key].error) {
                    result[result.length] = store[key];
                }
            }
        }
        return result;
    };

    this.getImagesFromLookupStorage = function () {
        return getLookupImageStorage();
    };

    this.getImagesFromStorage = function () {
        var store = getImageStorage(), key, result = [];
        for (key in store) {
            if (store.hasOwnProperty(key)) {
                result[result.length] = store[key];
            }
        }
        return result;
    };

    this.findImageInStorageByUuid = function (uuid) {
        var store = getImageStorage();
        return store[uuid];
    };

    this.removeImageFromStorageByUuid = function (uuid) {
        var store = getImageStorage();
        delete store[uuid];
        return store;
    };

    this.findImageInStorageByUrl = function (url) {
        var store = getImageStorage(), uuid;
        for (uuid in store) {
            if (store.hasOwnProperty(uuid) && store[uuid].uri === url) {
                return store[uuid];
            }
        }
        return null;
    };

    this.putImageToStorage = function (imageObject) {
        var store = getImageStorage();
        if (imageObject.uuid) {
            store[imageObject.uuid] = imageObject;
        } else {
            console.error('Only ImageObject can be placed in ImageStorage');
        }
    };

    this.clearImageStorage = function () {
        this.set(ATTRIBUTE_IMAGE_STORE, {});
    };

    this.clearLookupImageStorage = function () {
        this.set(ATTRIBUTE_LOOKUP_IMAGE_STORAGE, []);
    };

    this.getWorker = function () {
        return this.get(ATTRIBUTE_WORKER);
    };

    this.attachWorker = function (worker) {
        return this.set(ATTRIBUTE_WORKER, worker);
    };

    this.set(IS_PAGE_HIDDEN, false);
    this.set(ATTRIBUTE_LOOKUP_IMAGE_STORAGE, []);
    this.set(ATTRIBUTE_IMAGE_STORE, {});
};