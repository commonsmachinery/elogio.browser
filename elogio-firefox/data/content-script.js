(function () {
    'use strict';
    self.port.on("getElements", function () {
        //traverse all items on the page
        function arrayIndexOf(arr, what, index) {
            index = index || 0;
            var L = arr.length;
            while (index < L) {
                if (arr[index] === what) {
                    return index;
                }
                ++index;
            }
            return -1;
        }

//traverse the css styles of the page
        document.deepCss = function (who, css) {
            if (!who || !who.style) {
                return '';
            }
            var elementStyle = css.replace(/\-([a-z])/g, function (a, b) {
                return b.toUpperCase();
            });
            if (who.currentStyle) {
                return who.style[elementStyle] || who.currentStyle[elementStyle] || '';
            }
            var elementDefaultView = document.defaultView || window;
            if (who.style[elementStyle]) {
                return who.style[elementStyle];
            }
            if (null !== elementDefaultView.getComputedStyle(who, "")) {
                if (elementDefaultView.getComputedStyle(who, "").getPropertyValue(css)) {
                    return elementDefaultView.getComputedStyle(who, "").getPropertyValue(css);
                }
            }
            return '';
        };
        function getAllBackgroundImages() {
            var url, urlsImage = [], allDomElements = document.getElementsByTagName('*');
            allDomElements = urlsImage.slice.call(allDomElements, 0, allDomElements.length);
            while (allDomElements.length) {
                url = document.deepCss(allDomElements.shift(), 'background-image');
                if (url) {
                    url = /url\(['"]?([^")]+)/.exec(url) || [];
                }
                url = url[1];
                if (url && -1 === arrayIndexOf(urlsImage, url)) {
                    urlsImage[urlsImage.length] = url;
                }
            }
            return urlsImage;
        }

        function startsWith(st, prefix) {
            if (st.indexOf(prefix) === 0) {
                return true;
            }
            return false;
        }

        var imagesOnThePage = document.images;
        var elementsToOutPut = getAllBackgroundImages();
        //for loop
        for (var i = 0; i < imagesOnThePage.length; i++) {
            if (imagesOnThePage[i].src) {
                elementsToOutPut.push(imagesOnThePage[i].src);
            }
        }
        var loc = document.location.toString().substring(0, document.location.toString().lastIndexOf('/')) + '/';
        for (var j = 0; j < elementsToOutPut.length; j++) {
            if (!startsWith(elementsToOutPut[j], 'http')) {
                elementsToOutPut[j] = loc + elementsToOutPut[j];
            }
        }
        self.port.emit("gotElement", elementsToOutPut);
    });
})();
