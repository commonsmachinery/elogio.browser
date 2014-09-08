'use strict';
var buttons = require('sdk/ui/button/action');
var pageMod = require("sdk/page-mod");
var data = require('sdk/self').data;
var imageStorage = [];
var activeTab;
var tabs = require('sdk/tabs');
var panel = require("sdk/panel").Panel({
    width: 180,
    height: 400,
    contentURL: data.url('panel.html'),
    contentScriptFile: [
        data.url('deps/jquery/jquery.js'),
        data.url('deps/jquery/bootstrap.js'),
        data.url('panel-script.js')]
});


var sidebar = require("sdk/ui/sidebar").Sidebar({
    id: 'my-sidebar',
    title: 'My sidebar',
    url: require("sdk/self").data.url("panel.html")
});

var button = buttons.ActionButton({
    id: "elogio-button",
    label: "Get images",
    icon: {
        "16": "./icon-16.png",
        "32": "./icon-32.png",
        "64": "./icon-64.png"
    },
    onClick: function () {
        sidebar.show();
        panel.show({
            position: button
        });
    }
});

function detachWorker(worker, workerArray) {
    var index = workerArray.indexOf(worker);
    if(index !== -1) {
        workerArray.splice(index, 1);
    }
}
var workersObject = {};
console.log('before PageMod');
pageMod.PageMod({
    include: "*",
    contentScriptFile: [data.url("content-script.js"), data.url('deps/jquery/jquery.js')],
    onAttach: function (worker) {
        var tabId = worker.tab.id;
        if (!workersObject[tabId]) {
            workersObject[tabId] = [];
        }
        activeTab = worker.tab;
        workersObject[tabId].push(worker);
        worker.on('detach', function () {
            detachWorker(this, workersObject[this.tab.id]);
        });
        worker.port.on("gotElement", function (imagesFromPage) {
            if (imagesFromPage && imagesFromPage.length > 0) {
                imageStorage.push(imagesFromPage);
                console.log('worker');
            }
            panel.port.emit('drawItems', imageStorage);
        });
    }
});
tabs.on('open', function (tab) {
    activeTab = tab;
});
tabs.on('activate', function (tab) {
    activeTab = tab;
});
panel.port.on('click-load', function () {
    console.log('clean list');
    imageStorage=[];
    var workers = workersObject[activeTab.id];
    for (var i = 0; i < workers.length; i++) {
        workers[i].port.emit("getElements");
    }
});