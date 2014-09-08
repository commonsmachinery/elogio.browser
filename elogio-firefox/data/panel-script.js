(function () {
    'use strict';

    require.config({
        baseUrl: 'deps',
        paths: {
            jquery: 'jquery'
        }
    });
    require(['jquery'], function ($) {
        window.addEventListener('click', function (event) {
            var t = event.target;
            if (t.nodeName === 'A') {
                self.port.emit('click-link', t.toString());
            }
        }, false);
    });
})();