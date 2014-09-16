/**
 * Created by LOGICIFY\corvis on 9/15/14.
 */

Elogio.modules.config = function(modules) {
    'use strict';
    this.global = {
        lookUp:{
            serverUrl:'http://www.google.com.ua',
            method:'get'
        },
        locator:{
            limitImageHeight:100,
            limitImageWidth:100
        }
    };

    this.ui = {
        imageDecorator: {
            iconUrl: '',
            iconWidth: 20,
            iconHeight: 20
        }
    };
    this.logging = {

    };
};