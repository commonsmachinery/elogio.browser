/**
 * Created by TEMA on 22.09.2014.
 */
Elogio.Annotations = function (imageObj,config) {
    "use strict";
    var details = imageObj.details;

    function getAnnotationField() {
        return details.annotations || null;
    }

    //policy field will be an array always
    function getPolicyField() {
        var annotations = getAnnotationField();
        if (!annotations) {
            return false;
        }
        var policy = annotations.policy || null;
        if (!policy) {
            return false;
        }
        if (Array.isArray(policy)) {
            if (policy.length > 0) {
                return policy;
            }
        } else {
            return [policy];
        }
        return null;
    }

    function getPropertyField() {
        var policy = getPolicyField();
        if (!policy) {
            return false;
        }
        return policy[0].property || null;
    }

    //returns details.owner or null
    function getOwnerField() {
        return details.owner || null;
    }

    //returns owner.org or null
    function getOwnersOrgField() {
        var owner = getOwnerField();
        if (owner) {
            return owner.org || null;
        }
        return null;
    }

    this.getOwner = function () {
        var owner = getOwnersOrgField();
        if (owner) {
            return owner.added_by || null;
        }
        return null;
    };
    this.getAddedAt = function () {
        var owner = getOwnersOrgField();
        if (owner) {
            return owner.added_at || null;
        }
        return null;
    };
    this.getLicenseLabel = function () {
        var propertyField = getPropertyField();
        if (propertyField) {
            return propertyField.statementLabel || null;
        }
        return null;
    };
    this.getLicenseLink = function () {
        var propertyField = getPropertyField();
        if (propertyField) {
            return propertyField.statementLink || null;
        }
        return null;
    };
    this.getLocatorLink = function () {
        var propertyField = getPropertyField();
        if (propertyField) {
            return propertyField.locatorLink || null;
        }
        return null;
    };
    this.getGravatarLink = function () {
        var owner = getOwnersOrgField();
        if (!owner) {
            return null;
        }
        if (owner.profile && owner.profile.gravatar_hash) {
            return config.global.apiServer.gravatarServerUrl + owner.profile.gravatar_hash;
        }
        return null;
    };
};