/**
 * Created by LOGICIFY\corvis on 9/15/14.
 */

Elogio.modules.config = function(modules) {
    'use strict';
    this.global = {
        apiServer:{
            serverUrl:'http://localhost:8080'
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
        },
        dataAttributeName: 'elogio',
        decoratedItemAttribute:'elogiodecorated',
        undecoratedItemAttribute:'elogioundecorated'
    };
    this.logging = {

    };
};