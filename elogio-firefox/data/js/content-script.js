
new Elogio(
    ['config', 'utils', 'dom', 'imageDecorator', 'locator', 'bridge'],
    function(modules) {
        'use strict';
        var locator = modules.getModule('locator'),
            imageDecorator = modules.getModule('imageDecorator'),
            dom = modules.getModule('dom'),
            config = modules.getModule('config'),
            bridge = modules.getModule('bridge');

        // Initialize bridge
        bridge.registerClient(self.port);

        // Subscribe for events
        bridge.on(bridge.events.configUpdated, function(updatedConfig){
            config.ui.imageDecorator.iconUrl = updatedConfig.ui.imageDecorator.iconUrl;
        });
        bridge.on(bridge.events.onImageAction,function(imageObj){
            var elem = dom.getElementByUUID(imageObj.uuid);
            if (elem) {
                elem.scrollIntoView();
            }
        });
        bridge.on(bridge.events.startPageProcessing, function(){
            locator.findImages(document, function (imageObj) {
                var element = dom.getElementByUUID(imageObj.uuid);
                if (element) {
                    imageDecorator.decorate(element, document, function () {
                        bridge.emit(bridge.events.onImageAction,imageObj);
                    });
                    bridge.emit(bridge.events.newImageFound, imageObj);
                }
            });
        });
    }
);