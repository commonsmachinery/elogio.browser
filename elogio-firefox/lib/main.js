'use strict';
var buttons = require('sdk/ui/button/action');
var tabs = require("sdk/tabs");
var pageMod = require("sdk/page-mod");
var data = require("sdk/self").data;
var tag = "div";
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
    include:"*",
    contentScriptFile: data.url("content-script.js"),
    onAttach: function(worker) {
        worker.port.emit("getElements", tag);
        worker.port.on("gotElement", function(element) {
            console.log(element);
        })
    }
});
function handleClick(state) {
}