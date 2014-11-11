/**
 * Created by TEMA on 23.10.2014.
 */
new Elogio(['config', 'dom'], function (modules) {
    'use strict';
    var dom = modules.getModule('dom'),
        config = modules.getModule('config');
    self.on("click", function (node) {
        var activeElement = node, targetUUID = null;
        //if click on image element then we don't need to check all children
        var element = activeElement.getAttribute(config.ui.elogioFounded);
        var uuidActiveElement = null;
        if (!element) {//it may mean what image has overlaps another element
            var children = dom.getElementsByAttribute(config.ui.elogioFounded, activeElement);
            console.log(children);
            //need to check if user click on element which contains many images, then we don't need to scroll
            if (children.length === 1) {
                targetUUID = children[0].getAttribute(config.ui.dataAttributeName);
            } else {
                targetUUID = null;
            }
        } else {
            uuidActiveElement = activeElement.getAttribute(config.ui.dataAttributeName);
        }
        console.log(targetUUID);
        targetUUID = uuidActiveElement || targetUUID;
        self.postMessage(targetUUID);
    });
});