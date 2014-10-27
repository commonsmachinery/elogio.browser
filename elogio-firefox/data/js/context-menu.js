/**
 * Created by TEMA on 23.10.2014.
 */
(function () {
    'use strict';
    self.on("click", function (node) {
        self.postMessage(node.getAttribute('elogio'));
    });
})();