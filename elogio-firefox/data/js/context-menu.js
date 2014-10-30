/**
 * Created by TEMA on 23.10.2014.
 */
(function () {
    'use strict';
    function getElementsByAttribute(attribute, context) {
        if (context.querySelectorAll) {
            var domElements = context.querySelectorAll('[' + attribute + ']');
            return Array.prototype.slice.call(domElements, 0, domElements.length);
        } else { // If querySelector is not supported - fallback to the legacy method
            var nodeList = context.getElementsByTagName('*'),
                nodeArray = [];
            for (var i = 0, n = nodeList.length; i < n; i++) {
                var att = nodeList[i].getAttribute(attribute);
                if (att) {
                    nodeArray.push(nodeList[i]);
                }
            }
            return nodeArray;
        }
    }

    self.on("click", function (node) {
        var activeElement = node, targetUUID = null;
        //if click on image element then we don't need to check all children
        var element = activeElement.getAttribute('elogiofounded');
        var uuidActiveElement = null;
        if (!element) {//it may mean what image has overlaps another element
            var children = getElementsByAttribute('elogiofounded', activeElement);
            console.log(children);
            //need to check if user click on element which contains many images, then we don't need to scroll
            if (children.length === 1) {
                targetUUID = children[0].getAttribute('elogio');
            } else {
                targetUUID = null;
            }
        } else {
            uuidActiveElement = activeElement.getAttribute('elogio');
        }
        console.log(targetUUID);
        targetUUID = uuidActiveElement || targetUUID;
        self.postMessage(targetUUID);
    });
})();