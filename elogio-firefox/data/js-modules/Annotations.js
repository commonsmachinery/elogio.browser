/**
 * Created by TEMA on 22.09.2014.
 */
Elogio.Annotations = function (imageObj, config) {
    "use strict";
    var details = imageObj.details;

    function getAnnotationField() {
        return details.annotations || null;
    }


    /**
     *
     * @param obj - object which maybe contains fieldName
     * @param fieldName - searchable field name
     * @returns {*}
     */
    function getFieldValue(obj, fieldName) {
        if (!obj && !fieldName) {
            return null;
        }
        if (!Array.isArray(obj)) {
            if (obj.hasOwnProperty(fieldName)) {
                if (Array.isArray(obj[fieldName]) && obj[fieldName].length > 0) {
                    return obj[fieldName][0].property || null;
                } else {
                    return obj[fieldName].property || null;
                }
            }
            return null;
        }
        if (obj.length === 0) {
            return null;
        }
        for (var i = 0; i < obj.length; i++) {
            if (obj[i].hasOwnProperty('property')) {
                if (obj[i].property.propertyName === fieldName) {
                    return obj[i].property || null;
                }
            }
        }
    }

    this.getOwner = function () {
        if (!details && !details.owner) {
            return null;
        }
        var some = details.owner.user || details.owner.org;
        if (!some) {
            return false;
        }
        return some.id || null;
    };

    this.getAddedAt = function () {
        if (details) {
            return details.added_at || null;
        }
        return null;
    };

    this.getLicenseLabel = function () {
        var policy = getFieldValue(getAnnotationField(), 'policy');
        if (policy) {
            return policy.statementLabel || null;
        }
        return null;
    };

    this.getLicenseLink = function () {
        var policy = getFieldValue(getAnnotationField(), 'policy');
        if (policy) {
            return policy.statementLink || null;
        }
        return null;
    };

    this.getLocatorLink = function () {
        var locatorField = getFieldValue(getAnnotationField(), 'locator');
        if (locatorField) {
            return locatorField.locatorLink || null;
        }
        return null;
    };

    this.getGravatarLink = function () {
        if (!details && !details.owner) {
            return null;
        }
        var owner = details.owner.user || details.owner.org;
        if (owner.profile && owner.profile.gravatar_hash) {
            return config.global.apiServer.gravatarServerUrl + owner.profile.gravatar_hash;
        }
        return null;
    };
    this.getTitle = function () {
        var annotation = getAnnotationField();
        var title = getFieldValue(annotation, 'title');
        if (!title) {
            return null;
        }
        return title.titleLabel || null;
    };
    function getCreator() {
        var annotations = getAnnotationField();
        var creator = getFieldValue(annotations, 'creator');
        if (!creator) {
            return null;
        }
        return creator;
    }

    this.getCreatorLabel = function () {
        var creator = getCreator();
        if (creator) {
            return creator.creatorLabel || null;
        }
        return null;
    };
    this.getCreatorLink = function () {
        var creator = getCreator();
        if (creator) {
            return creator.creatorLink || null;
        }
        return null;
    };
};