/**
 * Created by TEMA on 16.10.2014.
 */
(function () {
    'use strict';
    /*global doorbell*/
    window.doorbellOptions = {
        hideButton: true,
        appKey: 'yuKV0gmIM91d4crYqSTyTVwXi79UH564JAOJ575IkgywVFFCnPbScIGhsp1yipeM'
    };

    document.addEventListener('doorbell-injection', function (e) {
        var data = e.detail;
        if (data.eventName === 'feedbackClick') {
            doorbell.show();
        } else {
            doorbell.setProperty('uri', data.uri);
            doorbell.show();
        }
    });
    (function (document, t) {
        var g = document.createElement(t);
        g.id = 'doorbellScript';
        g.type = 'text/javascript';
        g.async = true;
        g.src = 'https://doorbell.io/button/423';
        (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(g);
    }(document, 'script'));
})();
