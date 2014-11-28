/**
 * Created by artem on 11/17/14.
 */
Elogio.modules.mainScriptHelper = function (modules) {
    'use strict';
    var self = this;
    /*
     =======================
     REQUIREMENTS
     =======================
     */
    var elogioServer = modules.getModule('elogioServer'),
        utils = modules.getModule('utils'),
        bridge = modules.getModule('bridge'),
        config = modules.getModule('config');


    /*
     =======================
     PRIVATE MEMBERS
     =======================
     */


    /*
     =======================
     PUBLIC MEMBERS
     =======================
     */

    /**
     * This method makes lookup request to Elog.io catalog
     * @param lookupImageObjStorage - image object from storage of main script
     * @param tabState - is needed to find image in local store
     * @param onError - callback when error
     * @param contentWorker - if is needed send data to content then we send it (only for firefox)
     */
    self.lookupQuery = function (lookupImageObjStorage, tabState, onError, contentWorker) {
        var localStore = lookupImageObjStorage,
            dictionary = {uri: []};
        var lookupOptions = config.global.apiServer.determineOptions;
        //create dictionary
        for (var i = 0; i < localStore.length; i++) {
            dictionary.uri.push(localStore[i].uri);
        }
        for (var i = 0; i < lookupOptions.length; i++) {
            if (localStore[0].domain.indexOf(lookupOptions[i]) !== -1) {
                dictionary.context = localStore[0].domain;
                break;
            }
        }
        elogioServer.lookupQuery(dictionary,
            function (lookupJson) {
                for (var i = 0; i < localStore.length; i++) {
                    var existsInResponse = false,
                        imageFromStorage = tabState.findImageInStorageByUuid(localStore[i].uuid);
                    // If image doesn't exist in local storage anymore - there is no sense to process it
                    if (!imageFromStorage) {
                        continue;
                    }
                    // Find image from our query in JSON.
                    for (var j = 0; j < lookupJson.length; j++) {
                        if (imageFromStorage.uri === lookupJson[j].uri) {
                            if (existsInResponse) {// if we found first lookup json object then cancel loop
                                break;
                            }
                            existsInResponse = true;
                            // Extend data ImageObject with lookup data and save it
                            imageFromStorage.lookup = lookupJson[j];
                            imageFromStorage.currentMatchIndex = 0;
                            bridge.emit(bridge.events.newImageFound, imageFromStorage);
                            if (contentWorker) {
                                contentWorker.port.emit(bridge.events.newImageFound, imageFromStorage);
                            }
                        }
                    }
                    // If it doesn't exist - assume it doesn't exist on server
                    if (!existsInResponse) {
                        imageFromStorage.lookup = false;
                        bridge.emit(bridge.events.newImageFound, imageFromStorage);
                    }
                }
            },
            function (response) {
                for (var i = 0; i < localStore.length; i++) {
                    var imageFromStorage = tabState.findImageInStorageByUuid(localStore[i].uuid);
                    // If image doesn't exist in local storage anymore - there is no sense to process it
                    if (!imageFromStorage) {
                        continue;
                    }
                    imageFromStorage.error = utils.getTextStatusByStatusCode(response.status);
                    if (onError) {
                        onError(imageFromStorage);
                    }
                }
            }
        );
    };


    /**
     * This method makes lookup query via hash, and may returns many matches
     * @param imageObj - image which is need to find in Elog.io catalog
     * @param tabState - is needed to find image in local store
     * @param onError - callback when error
     * @param contentWorker - if is needed send data to content then we send it (only for firefox)
     */
    self.hashLookupQuery = function (imageObj, tabState, onError, contentWorker) {
        var imageObjFromStorage = tabState.findImageInStorageByUuid(imageObj.uuid);
        if (!imageObj.error) {
            imageObjFromStorage.hash = imageObj.hash;
            console.log('hash is: ' + imageObj.hash + '  and src= ' + imageObj.uri);
            elogioServer.hashLookupQuery({
                hash: imageObjFromStorage.hash,
                src: imageObjFromStorage.uri,
                context: imageObj.domain
            }, function (json) {
                if (Array.isArray(json) && json.length > 0) {
                    var bestMatch = utils.sortJSONByLowestDistance(json);
                    imageObjFromStorage.lookup = bestMatch.json;
                    imageObjFromStorage.currentMatchIndex = bestMatch.index;
                    if (json.length > 1) {
                        imageObjFromStorage.allMatches = json;
                    }
                    delete imageObjFromStorage.error;
                    delete imageObjFromStorage.noData;
                    bridge.emit(bridge.events.newImageFound, imageObjFromStorage);//send message when lookup received
                    if (contentWorker) {
                        contentWorker.port.emit(bridge.events.newImageFound, imageObjFromStorage);//and content script too (for decorate)
                    }
                    //it means, what we need details, because user click on 'query to elog.io'
                    bridge.emit(bridge.events.imageDetailsRequired, imageObjFromStorage);
                } else {
                    //if we get an empty array, that's mean what no data for this image
                    imageObjFromStorage.error = Elogio._('noDataForImage');
                    imageObjFromStorage.noData = true;
                    if (onError) {
                        onError(imageObjFromStorage);
                    }
                }
            }, function (response) {
                if (response.status === 400) {
                    //it means the image was not founded because bad request maybe hash is wrong
                    console.log(response.text + '  Status is: ' + response.status + ' There is ' + response.statusText + ' image url is: ' + imageObjFromStorage.uri);
                    imageObjFromStorage.error = Elogio._('noDataForImage');
                } else {
                    console.log('text status ' + response.statusText + ' ; status code ' + response.status);
                    imageObjFromStorage.error = utils.getTextStatusByStatusCode(response.status);
                }
                if (onError) {
                    onError(imageObjFromStorage);
                }
            });
        } else {
            //if we get error when using blockhash
            console.log('hash is: ' + imageObj.error + '  and src= ' + imageObj.uri);
            imageObjFromStorage.error = Elogio._('blockhashError');
            imageObjFromStorage.blockhashError = 'yes';//we need to mark if block hash error
            if (onError) {
                onError(imageObjFromStorage);
            }
        }
    };


    /**
     * This method is needed for query to oembed endpoint. which returns 1 result
     * @param imageObj - image which is need to find on eombed endpoint
     * @param tabState - is needed to find image in local store
     * @param onError -callback when error
     * @param contentWorker - if is needed send data to content then we send it (only for firefox)
     */
    self.oembedLookup = function (imageObj, tabState, onError, contentWorker) {
        var oembedEndpoint = utils.getOembedEndpointForImageUri(imageObj.uri);
        if (oembedEndpoint) {
            elogioServer.oembedLookup(oembedEndpoint, imageObj.uri, function (oembedJSON) {
                var imageObjFromStorage = tabState
                    .findImageInStorageByUuid(imageObj.uuid);
                imageObjFromStorage.lookup = {};
                imageObjFromStorage.currentMatchIndex = 0;
                delete imageObjFromStorage.error;//if error already exist in this image then delete it
                if (imageObjFromStorage) {
                    if (!imageObjFromStorage.details) {
                        imageObjFromStorage.details = [];
                    }
                    imageObjFromStorage.details[imageObjFromStorage.currentMatchIndex] = utils.oembedJsonToElogioJson(oembedJSON);
                    if (onError) {
                        onError();
                    }
                    //sending details
                    bridge.emit(bridge.events.imageDetailsReceived, imageObjFromStorage);
                } else {
                    console.log("Can't find image in storage: " + imageObj.uuid);
                }
            }, function () {
                //on error we need calculate hash
                if (contentWorker) {
                    contentWorker.port.emit(bridge.events.hashRequired, imageObj);
                } else {
                    bridge.emit(bridge.events.hashRequired, imageObj);
                }
            });
        } else {
            //if this image doesn't match for oembed then calculate hash
            if (contentWorker) {
                contentWorker.port.emit(bridge.events.hashRequired, imageObj);
            } else {
                bridge.emit(bridge.events.hashRequired, imageObj);
            }
        }
    };


    /**
     * This method is needed for query to Elog.io catalog for image's details
     * @param imageObj - image object which details need to find
     * @param tabState - is needed to find image in local store
     * @param onError  - callback when error
     * @param contentWorker - if is needed send data to content then we send it (only for firefox)
     */
    self.annotationsQuery = function (imageObj, tabState, onError, contentWorker) {
        elogioServer.annotationsQuery(imageObj.lookup.href,
            function (annotationsJson) {
                var imageObjFromStorage = tabState
                    .findImageInStorageByUuid(imageObj.uuid);
                if (imageObjFromStorage) {
                    if (!imageObjFromStorage.details) {
                        imageObjFromStorage.details = [];
                    }
                    if (imageObjFromStorage.lookup.distance && imageObjFromStorage.lookup.distance !== 0) {
                        imageObjFromStorage.currentMatchIndex = imageObj.currentMatchIndex;
                        imageObjFromStorage.details[imageObj.currentMatchIndex] = annotationsJson;
                        delete imageObjFromStorage.error;//if error already exist in this image then delete it
                        //lookup thumbnail url of image
                        utils.findThumbnailOfImage(imageObjFromStorage, elogioServer, function (image) {
                            if (onError) {
                                onError();
                            }
                            bridge.emit(bridge.events.imageDetailsReceived, image);
                        });
                    } else {
                        imageObjFromStorage.currentMatchIndex = imageObj.currentMatchIndex;
                        imageObjFromStorage.details[imageObj.currentMatchIndex] = annotationsJson;
                        delete imageObjFromStorage.error;//if error already exist in this image then delete it
                        if (onError) {
                            onError();
                        }
                        bridge.emit(bridge.events.imageDetailsReceived, imageObjFromStorage);
                    }

                } else {
                    console.log("Can't find image in storage: " + imageObj.uuid);
                }
            },
            function (response) {
                //put error to storage
                imageObj.error = utils.getTextStatusByStatusCode(response.status);
                if (onError) {
                    onError(imageObj);
                }
            },
            config.global.apiServer.urlLookupOptions
        );
    };


    self.feedbackSubmit = function (data, onSuccess, onError) {
        var postBody;
        //if work report
        if (data.imageObject) {
            if (data.screenshot) {
                postBody = {
                    "email": data.email,
                    "message": data.message,
                    "properties": {
                        "uri": data.imageObject.uri
                    },
                    "screenshot": data.screenshot
                };
            } else {
                postBody = {
                    "email": data.email,
                    "message": data.message,
                    "properties": {
                        "uri": data.imageObject.uri
                    }
                };
            }
        } else {
            //if report without work data
            if (data.screenshot) {
                postBody = {
                    "email": data.email,
                    "message": data.message,
                    "screenshot": data.screenshot
                };
            } else {
                postBody = {
                    "email": data.email,
                    "message": data.message
                };
            }
        }
        console.log(postBody);
        elogioServer.sendFeedbackSubmit(postBody, onSuccess, onError);
    };
};