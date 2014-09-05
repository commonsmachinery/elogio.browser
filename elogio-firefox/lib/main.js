'use strict';
var buttons = require('sdk/ui/button/action');
var tabs = require("sdk/tabs");
var pageMod = require("sdk/page-mod");
var data = require("sdk/self").data;
var tag = "img";
var panel = require("sdk/panel").Panel({
    width: 180,
    height: 180,
    contentURL:data.url('panel.html'),
    contentScriptFile:data.url('panel-script.js')
});
var button = buttons.ActionButton({
    id: "elogio-button",
    label: "Get images",
    icon: {
        "16": "./icon-16.png",
        "32": "./icon-32.png",
        "64": "./icon-64.png"
    },
    onClick: handleClick
});

pageMod.PageMod({
    include: "*",
    contentScriptFile: data.url("content-script.js"),
    onAttach: function (worker) {
        worker.port.emit("getElements", tag);
        worker.port.on("gotElement", function (element) {
            //at here we do anything with element
        })
    }
});

panel.port.on("click-link", function(url) {
    console.log(url);
});
function handleClick(state) {
    panel.show({
        position: button
    });

};
function handleHide() {
    button.state('window', {checked: false});
};