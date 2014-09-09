$(document).ready(function () {
    'use strict';
    var buttonText = 'query';

    $('#on').click(function () {
        var myNode = document.getElementById('first');
        myNode.innerHTML = '';
        addon.port.emit('click-load');
    });

    addon.port.on("drawItems", function (items) {
            for (var i = 0; i < items.length; i++) {
                var elem = items[i];
                var img = new Image();
                var div = document.createElement('div');
                div.appendChild(img);
                img.src = elem;
                img.width = 50;
                img.height = 50;
                var br = document.createElement('br');
                var button = document.createElement('button');
                var t = document.createTextNode(buttonText);
                button.appendChild(t);
                div.appendChild(button);
                div.appendChild(br);
                document.getElementById('first').appendChild(div);
            }
        }
    );
});
