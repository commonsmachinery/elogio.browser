/**
 * Created by TEMA on 05.09.2014.
 */
'use strict';
window.addEventListener('click', function(event) {
    var t = event.target;
    if (t.nodeName == 'A')
        self.port.emit('click-link', t.toString());
}, false);