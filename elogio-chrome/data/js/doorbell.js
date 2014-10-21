/**
 * Created by TEMA on 21.10.2014.
 */
(function () {
    'use strict';
    window.doorbellOptions = {
        hideButton: true,
        appKey: 'yuKV0gmIM91d4crYqSTyTVwXi79UH564JAOJ575IkgywVFFCnPbScIGhsp1yipeM'
    };
    (function (d, t) {
        var g = d.createElement(t);
        g.id = 'doorbellScript';
        g.type = 'text/javascript';
        g.async = true;
        g.src = 'https://doorbell.io/button/423';
        (d.getElementsByTagName('head')[0] || d.getElementsByTagName('body')[0]).appendChild(g);
    }(document, 'script'));
})();
