/**
 * Created by LOGICIFY\corvis on 9/15/14.
 */

Elogio.modules.locator = function (modules) {
    'use strict';
    var self = this;
    /*
     =======================
     REQUIREMENTS
     =======================
     */
    var utils = modules.getModule('utils'),
        config = modules.getModule('config'),
        dom = modules.getModule('dom');

    /*
     =======================
     PRIVATE MEMBERS
     =======================
     */
    var urlStorage = [], coefficientOfSpriteSize = 5;//needs for saving urls of images by request
    function applyFilters(elements, filters) {
        var nodesQty = elements.length,
            i, j, item, isSuitable,
            result = [], filterResult;
        for (i = 0; i < nodesQty; i += 1) {
            item = elements[i];
            isSuitable = false;
            for (j = 0; j < filters.length; j += 1) {
                filterResult = filters[j].apply(self, [item]);
                // NULL means that filter can't decide if candidate matches conditions
                if (filterResult === null || filterResult === undefined) {
                    continue;
                }
                else {
                    isSuitable = !!filterResult;
                    break;
                }
            }
            if (isSuitable) {
                result[result.length] = item;
            }
        }
        return result;
    }

    function isNotGifFile(url) {
        var expr = /(\.gif\?.*|(\.gif)$)/i;
        return !expr.test(url);
    }

    function getBackgroundUrl(node) {
        var css = 'background-image';
        var url;
        if (!node || !node.style) {
            return null;
        }
        var elementStyle = css.replace(/\-([a-z])/g, function (a, b) {
            url = b.toUpperCase();
        });
        if (node.currentStyle) {
            url = node.style[elementStyle] || node.currentStyle[elementStyle] || '';
            url = /url\(['"]?([^")]+)/.exec(url) || [];
            return url[1];
        }
        var elementDefaultView = document.defaultView || window;
        if (node.style[elementStyle]) {
            url = node.style[elementStyle];
            if (url) {
                url = /url\(['"]?([^")]+)/.exec(url) || [];
                return url[1];
            }
        }
        if (null !== elementDefaultView.getComputedStyle(node, "")) {
            if (elementDefaultView.getComputedStyle(node, "").getPropertyValue(css)) {
                url = elementDefaultView.getComputedStyle(node, "").getPropertyValue(css);
                if (url) {
                    url = /url\(['"]?([^")]+)/.exec(url) || [];
                    return url[1];
                }
            }
        }
        return null;
    }

    /*
     =======================
     PUBLIC MEMBERS
     =======================
     */

    /**
     * Array of filters which will be applied to the HTML nodes found by this module
     * Each filter should be a function which takes dom node as argument and returns true if it should be included to
     * the final list.
     * If at least one of the filters returns TRUE node will be added to the list
     * Note: filter function function will be invoked in the context of this module, which means that you are free to
     * use <code>this</code> to access module members
     * @type {Array}
     */
    this.nodeFilters = [
        // All IMG tags excluding .gif
        function (node) {
            if (node.hasAttribute(config.ui.panelAttribute)) {
                return false;
            }
        },
        function (node) {
            if (node instanceof HTMLImageElement) {
                return !utils.startsWith(node.src, 'data:') && isNotGifFile(node.src);
            }
            return null;
        },
        // Any tag with background-url excluding .gif
        function (node) {
            var url = getBackgroundUrl(node);
            return url && isNotGifFile(url) && !utils.startsWith(url, 'data:') && config.global.locator.deepScan;
        }
    ];
    this.imageFilters = [
        // Exclude repeating urls
        function (data) {
            if (urlStorage.indexOf(data.img.src) !== -1) {
                return false;
            }
            urlStorage.push(data.img.src);
            return null;
        },
        // Skip sprites
        function (data) {
            var img = data.img;
            //filtering sprites, width and height of sprite will be bigger then real width and height of image
            var node = data.node, squareOfNode = node.offsetWidth * node.offsetHeight,
                squareOfImage = img.width * img.height;
            if (node && (squareOfImage / squareOfNode > coefficientOfSpriteSize) && getBackgroundUrl(node)) {
                return false;
            }
            return null;
        },
        // Min size is 100*100px
        function (data) {
            var img = data.img;
            return img.width >= config.global.locator.limitImageWidth &&
                img.height >= config.global.locator.limitImageWidth;
        }
    ];


    this.getImageUrlForNode = function (node, currentLocation) {
        // If node is IMG tag - then URL should be just the value of SRC attribute
        if (node instanceof HTMLImageElement) {
            return utils.canonizeUrl(node.src, currentLocation);
        }
        var url = getBackgroundUrl(node);
        if (url) {
            return utils.canonizeUrl(url, currentLocation);
        }
        return false;
    };

    /**
     * Returns a list of nodes which should be processed (all nodes which match <code>this.nodeFilters</code>)
     * @param context - context reference
     */
    this.findNodes = function (context) {
        var domElements;
        if (!context.querySelectorAll) {
            domElements = context.getElementsByTagName('*');
        } else {
            domElements = context.querySelectorAll('*');
        }
        domElements = Array.prototype.slice.call(domElements, 0, domElements.length);
        return applyFilters(domElements, this.nodeFilters);
    };

    /**
     * Finds every node which references image, loads that image, validates if it matches criteria and invokes callback
     * method passing image details as parameter.
     * Processing includes a few stages:
     * 1. Get all nodes which potentially can refer an image (see <code>this.findNodes</code> for details)
     * 2. For each node get image URL (see <code>this.getImageUrlForNode</code> for details)
     * 3. Load each image url and check if it matches criterions (<code>this.imageFilter</code>).
     * Callback onImageFound will be invoked for each suitable image.
     * @param{HTMLElement} document
     * @param{Function} onImageFound - callback method which will be invoked on each suitable image.
     *                                 Signature onImageFound(imageObject)
     *                                 Image object is a dictionary of the following structure:
     *                                 uri{String} - URI of the image
     *                                 uuid{String} - internal image UUID
     *                                 size{Object} - optional. Contains width and height in pixels.
     * @param{Function} onError -      Callback method which will be called on each image which can't be loaded.
     *                                 Signature: onError(imageObject, error)
     *                                 imageObject{Object} - see above
     *                                 error{String} - error message
     * @returns{Integer} Returns qty of images it was founded BEFORE applying image filters. Note: Final qty of
     * @param processFinished - calls if all images loaded
     * @param nodes
     */

    this.findImages = function (document, nodes, onImageFound, onError, processFinished) {
        if (!nodes) {
            urlStorage = []; //if start scan All dom from scratch, then we need to clear storage
        }
        var countOfProcessedImages = 0, countNodes = 0;
        var i, imageUrl, temporaryImageTags = {}, currentImageTag, uuid,
            onTempImageLoadedHandler = function () {
                var imageUuid = this.getAttribute('sourceElement'),
                    src = this.src;
                //
                countOfProcessedImages++;
                // Apply filters:
                var result = applyFilters([
                    {img: this, node: dom.getElementByUUID(imageUuid, document)}
                ], self.imageFilters);
                delete temporaryImageTags[imageUuid];
                if (result.length && onImageFound) {
                    var imgObj = {
                        uri: src,
                        uuid: imageUuid,
                        size: { width: this.width, height: this.height }
                    };
                    onImageFound(imgObj);
                }
                if (countNodes === countOfProcessedImages) {
                    processFinished();
                }
            },
            onTempImageErrorHandler = function (error) {
                var imageUuid = this.getAttribute('sourceElement'),
                    src = this.src;
                countOfProcessedImages++;
                delete temporaryImageTags[imageUuid];
                if (onError) {
                    var imgObj = {
                        uri: src,
                        uuid: imageUuid
                    };
                    if (countNodes === countOfProcessedImages) {
                        processFinished(imageUuid);
                    }
                    onError(imgObj, 'Error Message should be there!!'); // TODO: Error message!
                }
                if (countNodes === countOfProcessedImages) {
                    processFinished();
                }
            };

        // Step 1. We need to get all nodes which potentially contains suitable image.
        nodes = nodes || self.findNodes(document);
        for (i = 0; i < nodes.length; i += 1) {
            if (nodes[i].hasAttribute(config.ui.dataAttributeName)) {
                continue;
            }
            // Mark node with special attribute containing unique ID which will be used internally
            uuid = utils.generateUUID();
            nodes[i].setAttribute(config.ui.dataAttributeName, uuid);
            // Step 2. Get image URL from the node
            imageUrl = this.getImageUrlForNode(nodes[i], document.location.href);
            if (!imageUrl) {
                // Skip node if we are unable to determine url!
                continue;
            }
            // Step 3. We need to analise image properties and apply additional filters.
            //         Thus we need to load it first. The only way which comes to mind - create IMG tag and
            //         wait for onLoad event
            //count of nodes needs to calculate all nodes which trying to load
            countNodes++;
            currentImageTag = new Image();
            currentImageTag.setAttribute('sourceElement', uuid);
            temporaryImageTags[uuid] = currentImageTag;
            currentImageTag.addEventListener('load', onTempImageLoadedHandler);
            currentImageTag.addEventListener('error', onTempImageErrorHandler);
            currentImageTag.src = imageUrl;
        }
        return temporaryImageTags.length;
    };
};