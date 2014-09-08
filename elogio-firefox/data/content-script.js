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
            var sty = css.replace(/\-([a-z])/g, function (a, b) {
                return b.toUpperCase();
            });
            if (who.currentStyle) {
                return who.style[sty] || who.currentStyle[sty] || '';
            }
            var dv = document.defaultView || window;
            if (who.style[sty]) {
                return who.style[sty];
            }
            if (null !== dv.getComputedStyle(who, "")) {
                if (dv.getComputedStyle(who, "").getPropertyValue(css)) {
                    return dv.getComputedStyle(who, "").getPropertyValue(css);
                }
            }
            return '';
        };
        function getallBgimages() {
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

        var imgs = document.images;
        var els = getallBgimages();
        //for loop

        for (var i = 0; i < imgs.length; i++) {
            if (null !== imgs[i].src && '' !== imgs[i].src) {
                els.push(imgs[i].src);
            }
        }
        var loc = document.location.toString().substring(0, document.location.toString().lastIndexOf('/')) + '/';
        for (var j = 0; j < els.length; j++) {
            if (!startsWith(els[j], 'http')) {
                els[j] = loc + els[j];
            }
        }
        console.log(els.length);
        self.port.emit("gotElement", els);
    });
})();
