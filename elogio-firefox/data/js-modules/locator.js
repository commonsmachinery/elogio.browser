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
    var urlStorage = [], filterPrefix = '.gif';//needs for saving urls of images by request
    function applyFilters(elements, filters) {
        var nodesQty = elements.length,
            i, j, item, isSuitable,
            result = [];
        for (i = 0; i < nodesQty; i += 1) {
            item = elements[i];
            isSuitable = false;
            for (j = 0; j < filters.length; j += 1) {
                // If at least one of the filters allows to
                if (filters[j].apply(self, [item])) {
                    isSuitable = true;
                    break;
                }
            }
            if (isSuitable) {
                result[result.length] = item;
            }
        }
        return result;
    }

    function getImageExtensionByUrl(url) {
        return url.substring(url.length - 4);
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
            url = /url\(['"]?([^")]+)/.exec(url) || [];
            return url[1];
        }
        if (null !== elementDefaultView.getComputedStyle(node, "")) {
            if (elementDefaultView.getComputedStyle(node, "").getPropertyValue(css)) {
                url = elementDefaultView.getComputedStyle(node, "").getPropertyValue(css);
                url = /url\(['"]?([^")]+)/.exec(url) || [];
                return url[1];
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
            return node instanceof HTMLImageElement &&
                filterPrefix !== getImageExtensionByUrl(node.src) &&
                !node.src.startsWith('data:');
        },
        // Any tag with background-url excluding .gif
        function (node) {
            var url = getBackgroundUrl(node);
            if (url && (filterPrefix === getImageExtensionByUrl(url) || url.startsWith('data:'))) {
                return false;
            }
            return !!url;
        }
    ];
    this.imageFilters = [
        // Min size is 100*100px, and exclude repeating urls
        function (data) {
            var img = data.img;
            if (urlStorage.indexOf(img.src) !== -1) {
                return false;
            }
            urlStorage.push(img.src);
            //filtering sprites, width and height of sprite will be bigger then real width and height of image
            var node=data.node;
            if(node&&node.offsetWidth<img.width||node.offsetHeight<img.height){
                return false;
            }
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
     * @param document - document referrence
     */
    this.findNodes = function (document) {
        var domElements = document.getElementsByTagName('*');
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
        urlStorage = [];//every request to find images we need to delete all of urls saved before
        var countOfProcessedImages = 0, countNodes = 0;
        var i, imageUrl, temporaryImageTags = {}, currentImageTag, uuid,
            onTempImageLoadedHandler = function () {
                var imageUuid = this.getAttribute('sourceElement'),
                    src = this.src;
                //
                countOfProcessedImages++;
                // Apply filters:
                var result = applyFilters([
                    {img: this, node: dom.getElementByUUID(imageUuid)}
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
        nodes = nodes || this.findNodes(document);
        for (i = 0; i < nodes.length; i += 1) {
            if(nodes[i].hasAttribute(config.ui.dataAttributeName)){
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