/**
 * Created by LOGICIFY\corvis on 9/15/14.
 */

Elogio.modules.config = function (modules) {
    'use strict';
    this.global = {
        apiServer: {
            serverUrl: 'https://catalog.elog.io',
            lookupContext: '/lookup/uri',
            hashLookupContext: '/lookup/blockhash',
            imagesPerRequest: 10,
            gravatar: {
                gravatarServerUrl: 'http://www.gravatar.com/avatar/',
                size: "?s=40"
            },
            collection: [
                {
                    link: 'http://commons.wikimedia.org',
                    iconUrl: 'http://upload.wikimedia.org/wikipedia/commons/7/79/Wiki-commons.png'
                },
                {
                    link: 'http://commonsmachinery.se',
                    iconUrl: 'https://raw.githubusercontent.com/commonsmachinery/ci/master/CommonsMachinery_Humphrey_Tin_LightBackground.jpg'
                }
            ],
            urlLookupOptions: {include: ['owner'], annotations: ['title,locator,policy,creator,copyright,collection']}
        },
        locator: {
            limitImageHeight: 100,
            limitImageWidth: 100,
            deepScan: true
        },
        oembed: {
            endpoint: {
                flickr: 'https://www.flickr.com/services/oembed.json/'
            }
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
        elogioFounded: 'elogiofounded',
        decoratedItemAttribute: 'elogiodecorated',
        panelAttribute: 'elogiopanelimage'
    };
    this.sidebar = {
        imageObject: 'imageObj'
    };
    this.logging = {

    };
};
