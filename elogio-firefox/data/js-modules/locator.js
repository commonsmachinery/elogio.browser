/**
 * Created by LOGICIFY\corvis on 9/15/14.
 */

Elogio.modules.locator = function(modules) {
    'use strict';
    var self = this;
    /*
     =======================
     REQUIREMENTS
     =======================
     */
    var dom = modules.getModule('dom'),
        utils = modules.getModule('utils');

    /*
     =======================
     PRIVATE MEMBERS
     =======================
     */
    function applyFilters(elements, filters) {
        var nodesQty = elements.length,
            i, j, item, isSuitable,
            result = [];
        for (i = 0; i < nodesQty; i +=1 ) {
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
    /*
     =======================
     PUBLIC MEMBERS
     =======================
     */
    this.config = {
        imageMinHeight: 100,
        imageMinWidth: 100
    };

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
        // All IMG tags
        function (node) {
            return node instanceof HTMLImageElement;
        },
        // Any tag with background-url
        function(node) {
            return false;
        }
    ];

    this.imageFilters = [
        // Min size is 100*100px
        function(img) {
            return img.width >= this.config.imageMinWidth &&
                   img.height >= this.config.imageMinHeight;
        }
    ];


    this.getImageUrlForNode = function(node, currentLocation) {
        // If node is IMG tag - then URL should be just the value of SRC attribute
        if (node instanceof HTMLImageElement) {
            return utils.canonizeUrl(node.src, currentLocation);
        }
        return false;
    };

    /**
     * Returns a list of nodes which should be processed (all nodes which match <code>this.nodeFilters</code>)
     * @param document - document referrence
     */
    this.findNodes = function(document) {
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
     */
    this.findImages = function(document, onImageFound, onError) {
        var i, imageUrl, temporaryImageTags = {}, currentImageTag, uuid,
            onTempImageLoadedHandler = function () {
                var imageUuid = this.getAttribute('sourceElement'),
                    src = this.src;
                // Apply filters:
                var result = applyFilters([this], self.imageFilters);
                delete temporaryImageTags[imageUuid];
                if (result.length && onImageFound) {
                    var imgObj = {
                        uri: src,
                        uuid: imageUuid,
                        size: { width: this.width, height: this.height }
                    };
                    onImageFound(imgObj);
                }
            },
            onTempImageErrorHandler = function (error) {
                var imageUuid = this.getAttribute('sourceElement'),
                    src = this.src;
                delete temporaryImageTags[imageUuid];
                if (onError) {
                    var imgObj = {
                        uri: src,
                        uuid: imageUuid
                    };
                    onError(imgObj,  'Error Message fshould be there!!'); // TODO: Error message!
                }
            };

        // Step 1. We need to get all nodes which potentially contains suitable image.
        var nodes = this.findNodes(document);
        for (i=0; i < nodes.length; i += 1) {
            // Mark node with special attribute containing unique ID which will be used internally
            uuid = utils.generateUUID();
            nodes[i].setAttribute(dom.config.dataAttributeName, uuid);
            // Step 2. Get image URL from the node
            imageUrl = this.getImageUrlForNode(nodes[i], document.location.href);
            if (!imageUrl) {
                // Skip node if we are unable to determine url!
                continue;
            }
            // Step 3. We need to analise image properties and apply additional filters.
            //         Thus we need to load it first. The only way which comes to mind - create IMG tag and
            //         wait for onLoad event
            currentImageTag = new Image();
            temporaryImageTags[uuid] = currentImageTag;
            currentImageTag.addEventListener('load', onTempImageLoadedHandler);
            currentImageTag.addEventListener('error', onTempImageErrorHandler);
            currentImageTag.setAttribute('sourceElement', uuid);
            currentImageTag.src = imageUrl;
        }
        return temporaryImageTags.length;
    };
};