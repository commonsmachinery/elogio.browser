new Elogio(
    ['config', 'utils', 'dom', 'imageDecorator', 'locator', 'bridge'],
    function (modules) {
        'use strict';
        var locator = modules.getModule('locator'),
            imageDecorator = modules.getModule('imageDecorator'),
            dom = modules.getModule('dom'),
            config = modules.getModule('config'),
            bridge = modules.getModule('bridge');

        // Initialize bridge
        bridge.registerClient(self.port);

        // Subscribe for events
        bridge.on(bridge.events.configUpdated, function (updatedConfig) {
            config.ui.imageDecorator.iconUrl = updatedConfig.ui.imageDecorator.iconUrl;
        });
        //on
        bridge.on(bridge.events.pluginStopped, function () {
            var elements = dom.getAllDecoratedElements();
            for (var i = 0, n = elements.length; i < n; i++) {
                imageDecorator.undecorate(elements[i], document);
            }
        });

        bridge.on(bridge.events.onImageAction, function (imageObj) {
            var elem = dom.getElementByUUID(imageObj.uuid);
            if (elem) {
                elem.scrollIntoView();
            }
        });
        bridge.on(bridge.events.startPageProcessing, function () {
            locator.findImages(document, function (imageObj) {
                var element = dom.getElementByUUID(imageObj.uuid);
                if (element) {
                    imageDecorator.decorate(element, document, function () {
                        bridge.emit(bridge.events.onImageAction, imageObj);
                    });
                    console.log('image loaded');
                    bridge.emit(bridge.events.newImageFound, imageObj);
                }
            },function(){
                //on error
            },function(){
                //on finished
                bridge.emit(bridge.events.pageProcessingFinished);
            });
        });
    }
);