/**
 * Created by TEMA on 16.09.2014.
 */
Elogio.modules.elogioServer = function (modules) {
    'use strict';
    var self = this;
    var Json = [
            {
                "href": "http://localhost:8004/works/5412c76b793c7f383db4bc7c",
                "score": 0,
                "uri": "http://commons.wikimedia.org/wiki/File:Sean_O'Keefe.jpg",
                "property": "identifier"
            },
            {
                "property": "locator",
                "score": 0,
                "href": "http://localhost:8004/works/5412c76b793c7f383db4bc7c",
                "uri": "http://commons.wikimedia.org/wiki/File:Sean_O'Keefe.jpg"
            }
        ],
        annotationsJson = {
            "_perms" : {
                "read" : true
            },
            "id" : "5412c76b793c7f383db4bc7c",
            "href" : "http://localhost:8004/works/5412c76b793c7f383db4bc7c",
            "owner" : {
                "org" : {
                    "version" : 0,
                    "added_by" : "53bd6e811322215e36bfcf3d",
                    "profile" : {
                        "gravatar_hash" : "575ebd54fa00f99d17cecee5abf37f9a"
                    },
                    "_perms" : {},
                    "updated_by" : "53bd6e811322215e36bfcf3d",
                    "href" : "http://localhost:8004/org/5412c6af8edd1ab73cf80281",
                    "alias" : "cm",
                    "updated_at" : "2014-09-12T10:10:55.659Z",
                    "id" : "5412c6af8edd1ab73cf80281",
                    "added_at" : "2014-09-12T10:10:55.659Z",
                    "owners" : [
                        "53bd6e811322215e36bfcf3d"
                    ]
                }
            },
            "version" : 8,
            "annotations" : {
                "title" : [
                    {
                        "property" : {
                            "titleLabel" : "Sean O'Keefe, former NASA administrator and United States Secretary of the Navy.",
                            "propertyName" : "title",
                            "value" : "Sean O'Keefe, former NASA administrator and United States Secretary of the Navy.",
                            "language" : "en"
                        },
                        "updated_by" : {
                            "id" : "53bd6e811322215e36bfcf3d",
                            "href" : "http://localhost:8004/users/53bd6e811322215e36bfcf3d"
                        },
                        "id" : "5412c76b793c7f383db4bc7f",
                        "updated_at" : "2014-09-12T10:14:03.102Z",
                        "score" : 0
                    }
                ],
                "policy" : [
                    {
                        "score" : 0,
                        "property" : {
                            "propertyName" : "policy",
                            "statementLabel" : "Public domain",
                            "value" : "Public domain"
                        },
                        "updated_at" : "2014-09-12T10:14:03.129Z",
                        "id" : "5412c76b793c7f383db4bc88",
                        "updated_by" : {
                            "href" : "http://localhost:8004/users/53bd6e811322215e36bfcf3d",
                            "id" : "53bd6e811322215e36bfcf3d"
                        }
                    }
                ],
                "locator" : [
                    {
                        "score" : 0,
                        "updated_at" : "2014-09-12T10:14:03.119Z",
                        "id" : "5412c76b793c7f383db4bc85",
                        "updated_by" : {
                            "href" : "http://localhost:8004/users/53bd6e811322215e36bfcf3d",
                            "id" : "53bd6e811322215e36bfcf3d"
                        },
                        "property" : {
                            "locatorLink" : "http://commons.wikimedia.org/wiki/File:Sean_O'Keefe.jpg",
                            "propertyName" : "locator",
                            "value" : "http://commons.wikimedia.org/wiki/File:Sean_O%27Keefe.jpg"
                        }
                    },
                    {
                        "score" : 0,
                        "id" : "5412c76b793c7f383db4bc91",
                        "updated_at" : "2014-09-12T10:14:03.154Z",
                        "updated_by" : {
                            "href" : "http://localhost:8004/users/53bd6e811322215e36bfcf3d",
                            "id" : "53bd6e811322215e36bfcf3d"
                        },
                        "property" : {
                            "propertyName" : "locator",
                            "value" : "http://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Sean_O%27Keefe.jpg/640px-Sean_O%27Keefe.jpg",
                            "locatorLink" : "http://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Sean_O'Keefe.jpg/640px-Sean_O'Keefe.jpg"
                        }
                    }
                ]
            }
        };
    /*
     =======================
     REQUIREMENTS
     =======================
     */
    var config = modules.getModule('config'),Request=require('sdk/request').Request;
    /*
     =======================
     PRIVATE MEMBERS
     =======================
     */

    /**
     * @param url - unnecessary parameter, there is the server url where sending request
     * @param onSuccess - callback function for success request
     * @param onError - callback function which calls on error
     * @param method - HTTP method to be used
     */
    function sendRequest(url, onSuccess, onError, method) {
        method = method || 'GET';
        url = url || config.global.apiServer.serverUrl;
        var request= {};
        /*switch (method) {
            case 'GET': request.get();
                break;
            case 'GET': request.post();
        }*/
        // TODO: test code!
        if (url.indexOf('localhost:8004')) {
            if (onSuccess) {
                onSuccess(Json);
            }
        } else {
            if (onSuccess) {
                onSuccess(annotationsJson);
            }
        }
    }

    function optionsToUrlParams(options){
        var url='?';
        for(var key in options){
            if(options.hasOwnProperty(key)){
                url+=key+'='+options[key]+'&';
            }
        }
        return url.substring(0,url.length-1);
    }

    /*
     =======================
     PUBLIC MEMBERS
     =======================
     */

    /**
     * @param{String} imageUrl - url of image from page, there is a request param
     * @param{Function} onLoad - callback method which will be invoked on event onLoad data from site.
     * @param{Function} onError -      Callback method which will be called on event error requesting
     */
    this.lookupQuery = function (imageUrl, onLoad, onError) {
        var url = config.global.apiServer.serverUrl + '?uri=' + imageUrl;
        sendRequest(url, onLoad, onError);
    };
    /**
     *
     * @param url - there is url of the server where sending request (not uri of image!!!)
     * @param onLoad
     * @param onError
     * @param options - there is parameters of request;
     */
    this.annotationsQuery = function (url, onLoad, onError, options) {
        options = options || {include:'owner',fields:'annotations',annotations:'title.locator.policy'};
        url += optionsToUrlParams(options);
        sendRequest(url, onLoad, onError);
    };
    /**
     * This method returns data from 2 requests in callbacks:
     * 1 request - lookup request which getting json with lookup data
     * 2 request - annotation request which getting json with annotations for image
     * @param imageUrl - there is uri of image for lookup request
     * @param onLoad - callback which called when success
     * @param onError - callback which called when error
     * @param options - there is options of url request for annotation request
     */
    this.getAnnotationsForImage = function (imageUrl, onLoad, onError, options) {
        this.lookupQuery(imageUrl, function (data) {
            if (data[0].href) {
                self.annotationsQuery(data[0].href, function (data) {
                    if (onLoad) {
                        onLoad(data);
                    }
                }, onError, options);
            }
        }, onError);
    }
};