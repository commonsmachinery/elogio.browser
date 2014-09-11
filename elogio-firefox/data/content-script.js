(function () {
    'use strict';
    var loc = document.location.toString().substring(0, document.location.toString().lastIndexOf('/') + 1);
    var attributeOfElements = 'elogio';
    var imagesHashMap = [];
    var wheel = new Image();

    function startsWith(st, prefix) {
        return st.indexOf(prefix) === 0;
    }

    var guid = (function () {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }

        return function () {
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                s4() + '-' + s4() + s4() + s4();
        };
    })();

    function getElementByGUID(attribute, id, context) {
        var nodeList = (context || document).getElementsByTagName('*');
        for (var i = 0, n = nodeList.length; i < n; i++) {
            var att = nodeList[i].getAttribute(attribute);
            if (att && att === id) {
                return nodeList[i];
            }
        }
    }

    function attachUrlAndGUID(inElem, url) {
        var id = guid();
        inElem.setAttribute(attributeOfElements, id);
        imagesHashMap[url] = id;
    }

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
    function canonizeUrl(url, urlLocation) {
        if (url) {
            if (startsWith(url, 'http') || startsWith(url, 'www')) {
                return url;
            }
            if (startsWith(url, '/')) {//if image into deep folder
                return urlLocation + url.substring(1, url.length);
            }
            if (startsWith(url, '../')) {//if image into upper folder
                urlLocation = urlLocation.substring(0, urlLocation.lastIndexOf('/'));
                return canonizeUrl(url.substring(3, url.length), urlLocation.substring(0, urlLocation.lastIndexOf('/') + 1));
            }
            if (startsWith(url, 'data')) {//if image is base64
                return url;
            }
        } else {
            return false;
        }
        return urlLocation + url;//if already canonized
    }

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

    function getAllImages() {
        var url, current, urlsImage = [], allDomElements = document.getElementsByTagName('*');
        allDomElements = urlsImage.slice.call(allDomElements, 0, allDomElements.length);
        while (allDomElements.length) {
            current = allDomElements.shift();
            if (current instanceof HTMLImageElement) {//if img
                url = canonizeUrl(current.src, loc);
            } else {//if background
                url = document.deepCss(current, 'background-image');
                if (url) {
                    url = /url\(['"]?([^")]+)/.exec(url) || [];
                }
                url = canonizeUrl(url[1], loc);
            }
            if (url && -1 === arrayIndexOf(urlsImage, url)) {
                attachUrlAndGUID(current, url);
                urlsImage[urlsImage.length] = url;
            }
        }
        return urlsImage;
    }


    window.onbeforeunload = function () {
        self.port.emit('onBeforeUnload');
    };
    var getSelectedPicture = function () {
        self.port.emit('getPicture', this.getAttribute('id'));
    };
    var cumulativeOffset = function (element) {
        var top = 0, left = 0;
        do {
            top += element.offsetTop || 0;
            left += element.offsetLeft || 0;
            element = element.offsetParent;
        } while (element);

        return {
            top: top,
            left: left
        };
    };

    self.port.on('scrollToImageById', function (id) {
        var elem = getElementByGUID(attributeOfElements, id);
        if (elem) {
            elem.scrollIntoView();
        }
    });
    function setTheWheel(wheel, elem) {
        wheel.style.position = 'absolute';
        wheel.setAttribute('id', imagesHashMap[elem.src]);
        wheel.style.top = cumulativeOffset(elem).top.toString() + 'px';
        wheel.style.left = cumulativeOffset(elem).left.toString() + 'px';
        wheel.style.zIndex = '10000';
        return wheel;
    }

    self.port.on("getElement", function (limitPixels, wheelUrl) {
        var count = 0;
        wheel.src = wheelUrl;
        imagesHashMap = [];
        var elementsToFiltering = getAllImages();//all urls of images
        function ifReadyThenSend() {//if all images loaded then we need to send it to Main.js
            if (count === elementsToFiltering.length) {
                self.port.emit("gotElement", imagesToOutPut);
            }
        }

        var imagesToOutPut = [];
        //we need to filter all images by width*height>limit
        function filterImages(inputImages) {
            var filteringImages = [];
            //if img loaded then count++ and save it if width and height of image >limit
            var onLoadImg = function () {
                if (this.width >= limitPixels && this.height >= limitPixels) {
                    var elem = getElementByGUID(attributeOfElements, imagesHashMap[this.src]);
                    var currentWheel = setTheWheel(wheel.cloneNode(false), elem);
                    document.body.insertBefore(currentWheel, document.body.firstChild);
                    currentWheel.addEventListener('click', getSelectedPicture);
                    imagesToOutPut.push({'src': this.src, 'guid': imagesHashMap[this.src]});
                }
                count++;
                ifReadyThenSend();
                return true;
            };
            //if image isn't loaded then we need increase count but wouldn't push it to array
            //this also clears the list
            var imageOnError = function () {
                this.onerror = '';
                count++;
                ifReadyThenSend();
                return true;
            };
            // TODO think if we need to query images which are <img> tags, not backgrounds. Guess we already have
            // info about them?
            for (var i = 0; i < inputImages.length; i++) {
                filteringImages.push(new Image());
                filteringImages[i].addEventListener('load', onLoadImg);
                filteringImages[i].addEventListener('error', imageOnError);
                filteringImages[i].src = inputImages[i];//from cache
            }
        }

        filterImages(elementsToFiltering);//filter img and send it
    });
})();
