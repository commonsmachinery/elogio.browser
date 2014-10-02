/**
 * Created by LOGICIFY\corvis on 9/15/14.
 */

Elogio.modules.config = function (modules) {
    'use strict';
    this.global = {
        apiServer: {
            serverUrl: 'http://dev.commonsmachinery.se:8004',
            lookupContext: '/lookup/uri',
            imagesPerRequest: 10,
            gravatarServerUrl: 'http://www.gravatar.com/avatar/',
            urlLookupOptions: {include: ['owner'], annotations: ['title,locator,policy,creator,copyright']}
        },
        locator: {
            limitImageHeight: 100,
            limitImageWidth: 100
        }
    };


    this.ui = {
        imageDecorator: {
            iconUrl: '',
            iconWidth: 20,
            iconHeight: 20
        },
        highlightRecognizedImages: false,
        dataAttributeName: 'elogio',
        decoratedItemAttribute: 'elogiodecorated'
    };
    this.errors = {
        requestError: 'Server responded, but with errors'
    };
    this.logging = {

    };
};