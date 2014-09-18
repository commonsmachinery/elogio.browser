Elogio.ApplicationStateController = function() {
    Elogio.inherit(this, new Elogio.StateController());

    var ATTRIBUTE_TAB_STATE_PREFIX = 'tabState_';

    this.getTabState = function(tabId) {
        if (!this.propertyExists(ATTRIBUTE_TAB_STATE_PREFIX+tabId)) {
            this.set(ATTRIBUTE_TAB_STATE_PREFIX+tabId, new Elogio.TabStateController());
        }
        return this.get(ATTRIBUTE_TAB_STATE_PREFIX+tabId);
    };

    this.dropTabState = function(tabId) {
        this.dropProperty(ATTRIBUTE_TAB_STATE_PREFIX+tabId);
    };

    this.getAllTabState = function() {
        var propertyNames = this.getAllPropertyNames(), i, result = [];
        for (i = 0; propertyNames.length; i += 1) {
            if (propertyNames[i].indexOf(ATTRIBUTE_TAB_STATE_PREFIX) === 0) {
                result[result.length] = this.get(propertyNames[i]);
            }
        }
        return result;
    }

};

Elogio.TabStateController = function () {
    Elogio.inherit(this, new Elogio.StateController());

    var ATTRIBUTE_IMAGE_STORE = 'imageStore';
    var self = this;

    var getImageStorage = function() {
        if (!self.propertyExists(ATTRIBUTE_IMAGE_STORE)) {
            self.set(ATTRIBUTE_IMAGE_STORE, {});
        }
        return self.get(ATTRIBUTE_IMAGE_STORE);
    };

    this.getImagesFromStorage = function() {
        var store = getImageStorage(), key, result = [];
        for (key in store) {
            if (store.hasOwnProperty(key)) {
                result[result.length] = store[key];
            }
        }
        return result;
    };

    this.findImageInStorageByUuid = function(uuid) {
        var store = getImageStorage();
        return store[uuid];
    };

    this.putImageToStorage = function(imageObject) {
        var store = getImageStorage();
        if (imageObject.uuid) {
            store[imageObject.uuid] = imageObject;
        } else {
            console.error('Only ImageObject can be placed in ImageStorage');
        }
    };

    this.clearImageStorage = function() {
        this.set(ATTRIBUTE_IMAGE_STORE, {});
    };

    this.set(ATTRIBUTE_IMAGE_STORE, {});
};