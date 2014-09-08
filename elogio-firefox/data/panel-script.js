(function () {
    'use strict';
    var textButton = 'query';
    document.getElementById('on').addEventListener('click', function () {
        var myNode = document.getElementById('first');
        myNode.innerHTML = '';
        console.log('clean');
        self.port.emit('click-load');
    }, false);

    self.port.on("drawItems", function (items) {
            for (var i = 0; i < items.length; i++) {

                var elem = items[i];
                for (var j = 0; j < elem.length; j++) {
                    var img = new Image();
                    var div = document.createElement('div');
                    div.appendChild(img);
                    img.src = elem[j];
                    img.width = 50;
                    img.height = 50;
                    var br = document.createElement('br');
                    var button = document.createElement('button');
                    var t = document.createTextNode(textButton);
                    button.appendChild(t);
                    div.appendChild(button);
                    div.appendChild(br);
                    document.getElementById('first').appendChild(div);
                }

            }
        }
    );
})();