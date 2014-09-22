new Elogio(
    ['config', 'utils', 'dom', 'imageDecorator', 'locator', 'bridge'],
    function (modules) {
        'use strict';
        var locator = modules.getModule('locator'),
            imageDecorator = modules.getModule('imageDecorator'),
            dom = modules.getModule('dom'),
            config = modules.getModule('config'),
            bridge = modules.getModule('bridge');

        /*
         =======================
         PRIVATE MEMBERS
         =======================
         */

        function processDocument() {
            locator.findImages(document, null, function (imageObj) {
                bridge.emit(bridge.events.newImageFound, imageObj);
            },function(){
                //on error
            },function(){
                //on finished
                bridge.emit(bridge.events.pageProcessingFinished);
            });
        }

        // Initialize bridge
        bridge.registerClient(self.port);

        // Subscribe for events
        bridge.on(bridge.events.configUpdated, function (updatedConfig) {
            config.ui.imageDecorator.iconUrl = updatedConfig.ui.imageDecorator.iconUrl;
            if(updatedConfig.ui.highlightRecognizedImages && document.body.className.indexOf('elogio-highlight') < 0) {
                document.body.className+=' elogio-highlight';
            }else{
                document.body.className = document.body.className.replace(/\belogio-highlight\b/,'');
            }
        });
        bridge.on(bridge.events.pluginStopped, function () {
            var elements = dom.getAllDecoratedElements();
            for (var i = 0, n = elements.length; i < n; i++) {
                imageDecorator.undecorate(elements[i], document);
            }
        });
        bridge.on(bridge.events.newImageFound,function(imageObj){
            var element = dom.getElementByUUID(imageObj.uuid);
            if (element) {
                imageDecorator.decorate(element, document, function () {
                    bridge.emit(bridge.events.onImageAction, imageObj);
                });
            }
        });
        bridge.on(bridge.events.onImageAction, function (imageObj) {
            var elem = dom.getElementByUUID(imageObj.uuid);
            if (elem) {
                elem.scrollIntoView();
            }
        });
        bridge.on(bridge.events.startPageProcessing, processDocument);
        // Experiment with MutationObserver
        // create an observer instance
        var observer = new MutationObserver(function(mutations) {
            var nodesToBeProcessed = [];
            mutations.forEach(function(mutation) {
                var i;
                for (i = 0; i < mutation.addedNodes.length; i += 1) {
                    if (mutation.addedNodes[i].nodeType === Node.ELEMENT_NODE) {
                        nodesToBeProcessed[nodesToBeProcessed.length] = mutation.addedNodes[i];
                    }
                }
            });
            processDocument();
        });
        observer.observe(document.body, { attributes: false, childList: true, subtree: true });
    }
);