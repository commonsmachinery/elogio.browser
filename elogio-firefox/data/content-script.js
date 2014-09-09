(function () {
    'use strict';
    var limitPixels = 200;
    var loc = document.location.toString().substring(0, document.location.toString().lastIndexOf('/') + 1);
    self.port.on("getElements", function () {
        var count = 0;
        //canonization of image url
        function canonizeUrl(url, urlLocation) {
            if (url) {
                if (url.indexOf('/') === 0) {
                    return urlLocation + url.substring(1, url.length - 1);
                }
                if (url.indexOf('../') === 0) {
                    urlLocation = urlLocation.substring(0, urlLocation.lastIndexOf('/'));
                    return canonizeUrl(url.substring(3, url.length), urlLocation.substring(0, urlLocation.lastIndexOf('/') + 1));
                }
            }
            return urlLocation + url;
        }

        //traverse all items on the page
        function arrayIndexOf(arr, what, index) {
            index = index || 0;
            var lengthOfInputArray = arr.length;
            while (index < lengthOfInputArray) {
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

        var imagesOnThePage = document.images;//all <img> on the page
        var elementsToFiltering = getAllBackgroundImages();//all urls of images
        //for loop
        for (var i = 0; i < imagesOnThePage.length; i++) {
            if (imagesOnThePage[i].src) {
                elementsToFiltering.push(imagesOnThePage[i].src);
            }
        }
        for (var j = 0; j < elementsToFiltering.length; j++) {
            if (!startsWith(elementsToFiltering[j], 'http')) {
                elementsToFiltering[j] = canonizeUrl(elementsToFiltering[j], loc);
            }
        }
        var imagesToOutPut = [];
        function ifReadyThenSend() {//if all images loaded then we need to send it to Main.js
            if (count === elementsToFiltering.length-1) {
                self.port.emit("gotElement", imagesToOutPut);
            }
            console.log(count+'; '+elementsToFiltering.length);
        }
        //we need to filter all images by width*height>limit
        function filterImages(inputImgs) {
            var filteringImages = [];
            //if img loaded then count++ and save it if width*height of image >limit
            var onLoadImg = function () {
                if ((this.width * this.height) >= limitPixels) {
                    imagesToOutPut.push(this.src);
                    ifReadyThenSend();
                }
                count++;
                return true;
            };
            //if image didn't loaded then we need increase count but wouldn't push it to array
            var imageOnError = function () {
                this.onerror = '';
                count++;
                ifReadyThenSend();
                return true;
            };
            for (var i = 0; i < inputImgs.length; i++) {
                filteringImages.push(new Image());
                filteringImages[i].src = inputImgs[i];
                filteringImages[i].addEventListener('load', onLoadImg);
                filteringImages[i].addEventListener('error', imageOnError);
            }
        }

        filterImages(elementsToFiltering);//run
    });
})();
