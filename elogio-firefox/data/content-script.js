'use strict';
self.port.on("getElements", function(tag) {
    var elements = document.getElementsByTagName(tag);
    for (var i = 0; i < elements.length; i++) {
        elements[i].style.backgroundImage="url('2.jpg')";
        self.port.emit("gotElement", elements[i]);
    }
});
