/**
 * Created by TEMA on 08.10.2014.
 */
/**
 * Script which attached to page when it loaded
 */
(function () {
    'use strict';
    var button = document.createElement('a');
    var panel = document.createElement('div');
    $(panel).addClass('elogio-panel');
    $(button).addClass('elogio-button');
    $(button).attr('href', "#elogio-panel");
    $(panel).attr('id', 'elogio-panel');
    $(button).text('open');
    document.body.appendChild(button);
    document.body.appendChild(panel);
    //careful if you change position then change position for sidebar button in css file
    $(button).elogioSidebar({side: 'right', duration: 300, clickClose: true});
})();