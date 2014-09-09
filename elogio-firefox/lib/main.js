'use strict';
var buttons = require('sdk/ui/button/action');
var pageMod = require("sdk/page-mod");
var data = require('sdk/self').data;
var tabs = require('sdk/tabs');
var imageStorage = [];
var activeTab;
var limitPixels = 200;
var sidebarWorker = null;
var workersObject = [];
var sidebar = require("sdk/ui/sidebar").Sidebar({
    id: 'elogio-firefox-plugin',
    title: 'Elog.io Image Catalog',
    url: require("sdk/self").data.url("panel.html"),
    onAttach: function (worker) {
        sidebarWorker = worker;
        sidebarWorker.port.on('click-load', function () {
            imageStorage = [];
            var workers = workersObject[activeTab.id];
            if (workers) {
                for (var i = 0; i < workers.length; i++) {
                    workers[i].port.emit("getElements", limitPixels);
                }
            } else {
                console.error('sorry but web page is not ready');
            }
        });
    }
});

buttons.ActionButton({
    id: "elogio-button",
    label: "Get images",
    icon: {
        "16": "./icon-16.png",
        "32": "./icon-32.png",
        "64": "./icon-64.png"
    },
    onClick: function () {
        sidebar.show();
    }
});

function detachWorker(worker, workerArray) {
    var index = workerArray.indexOf(worker);
    if (index !== -1) {
        workerArray.splice(index, 1);
    }
}
pageMod.PageMod({
    include: "*",
    contentScriptFile: [data.url("content-script.js")],
    onAttach: function (worker) {
        var tabId = worker.tab.id;
        if (!workersObject[tabId]) {
            workersObject[tabId] = [];
        }
        activeTab = worker.tab;
        workersObject[tabId].push(worker);
        worker.on('detach', function () {
            if (activeTab  && workersObject[activeTab.id]) {
                detachWorker(this, workersObject[activeTab.id]);
            }
        });
        worker.port.on("gotElement", function (imagesFromPage) {
            if (imagesFromPage && imagesFromPage.length > 0) {
                imageStorage.push(imagesFromPage);
                if (sidebarWorker) {
                    sidebarWorker.port.emit('drawItems', imagesFromPage);
                }
            }
        });
    }
});
tabs.on('open', function (tab) {
    activeTab = tab;
});
tabs.on('activate', function (tab) {
    activeTab = tab;
});
//if tab was closed the we need to remove all workers of this tab
tabs.on('close', function (tab) {
    var index = workersObject.indexOf(tab.id);
    if (index !== -1) {
        workersObject.splice(index, 1);
    }
});