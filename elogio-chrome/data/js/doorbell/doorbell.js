(function () {
    'use strict';
    window.doorbellOptions = {
        hideButton: true,
        appKey: 'yuKV0gmIM91d4crYqSTyTVwXi79UH564JAOJ575IkgywVFFCnPbScIGhsp1yipeM'
    };
    var doorBellScriptTag = document.createElement("script");
    doorBellScriptTag.id = 'doorbellScript';
    doorBellScriptTag.type = 'text/x-template';
    doorBellScriptTag.src = "https://doorbell.io/";
    document.body.appendChild(doorBellScriptTag);

    var Doorbell = function () {
        var options = {}, host = null, submitting = false, isPostmessageIframeLoaded = false, properties = {}, name = null, screenshot = '', option = function (o) {
            if (typeof options[o] !== 'undefined') {
                return options[o];
            } else {
                return null;
            }
        }, installed = function () {
            return!!1;
        }, getAppId = function () {
            return'423';
        }, getApiToken = function () {
            return'EONyrxKmap0KYOyoK1N7RC5o3HtdxI3MkhUrz49wZhT22C16dbrnxT9GI3V2HhD8';
        }, getAppKey = function () {
            return options.appKey;
        }, disableButton = function (text) {
            var button = el('doorbell-submit-button');
            button.className += ' disabled';
            button.disabled = true;
            var currentText = button.innerHTML;
            button.setAttribute('data-original-text', currentText);
            button.innerHTML = text;
        }, enableButton = function () {
            var button = el('doorbell-submit-button');
            button.className = button.className.replace('disabled', '');
            button.disabled = false;
            button.innerHTML = button.getAttribute('data-original-text');
        }, showForm = function () {
            var onShowCallback = option('onShow');
            if (typeof onShowCallback === 'function') {
                if (onShowCallback() === false) {
                    return;
                }
            }
            if (typeof html2canvas === 'function' && isPostmessageIframeLoaded === true) {
                var doorbellButton = el('doorbell-button');
                if (doorbellButton) {
                    doorbellButton.style.display = 'none';
                }
                try {
                    html2canvas([document.body], {onrendered: function (canvas) {
                        var dataUri = canvas.toDataURL();
                        screenshot = dataUri;
                        if (doorbellButton) {
                            doorbellButton.style.display = 'block';
                        }
                        openForm();
                    }});
                } catch (e) {
                    if (doorbellButton) {
                        doorbellButton.style.display = 'block';
                    }
                    openForm();
                }
            } else {
                openForm();
            }
        }, getScroll = function () {
            if (window.pageYOffset != undefined) {
                return[pageXOffset, pageYOffset];
            } else {
                var sx, sy, d = document, r = d.documentElement, b = d.body;
                sx = r.scrollLeft || b.scrollLeft || 0;
                sy = r.scrollTop || b.scrollTop || 0;
                return[sx, sy];
            }
        }, getYScroll = function () {
            return getScroll()[1];
        }, openForm = function () {
            var emailField = el('doorbell-email');
            if (option('hideEmail')) {
                emailField.style.display = 'none';
            } else {
                emailField.style.display = 'block';
            }
            if (option('email') !== null) {
                emailField.value = option('email');
            }
            var attachScreenshotCheckboxWrapper = el('doorbell-attach-screenshot-wrapper');
            if (attachScreenshotCheckboxWrapper) {
                if (screenshot.length > 0) {
                    attachScreenshotCheckboxWrapper.style.display = 'block';
                } else {
                    attachScreenshotCheckboxWrapper.style.display = 'none';
                }
            }
            formOpened();
            el('doorbell-background').style.display = 'block';
            el('doorbell').style.top = getYScroll() + 100 + 'px';
            el('doorbell').style.display = 'block';
            el('doorbell-feedback').focus();
            var onShownCallback = option('onShown');
            if (typeof onShownCallback === 'function') {
                onShownCallback();
            }
        }, el = function (id) {
            return document.getElementById(id);
        }, hideForm = function () {
            if (el('doorbell').style.display === 'none') {
                return;
            }
            var onHideCallback = option('onHide');
            if (typeof onHideCallback === 'function') {
                if (onHideCallback() === false) {
                    return;
                }
            }
            el('doorbell-success').style.display = 'none';
            el('doorbell-error').style.display = 'none';
            el('doorbell-background').style.display = 'none';
            el('doorbell').style.display = 'none';
            screenshot = '';
            var onHiddenCallback = option('onHidden');
            if (typeof onHiddenCallback === 'function') {
                onHiddenCallback();
            }
        }, showSuccessMessage = function (message) {
            var successElement = el('doorbell-success');
            var successMessage = option('successMessage');
            if (!successMessage) {
                successMessage = message;
            }
            successElement.innerHTML = successMessage;
            successElement.style.display = 'block';
            setTimeout(function () {
                hideForm();
            }, 2000);
        }, getEmail = function () {
            return el('doorbell-email').value;
        }, submit = function (customMessage, customEmail) {
            if (submitting) {
                return false;
            }
            submitting = true;
            disableButton('Sending...');
            var errorContainer = el('doorbell-error');
            errorContainer.style.display = 'none';
            try {
                var screenResolution = screen.width + 'x' + screen.height;
                addProperty('Screen resolution', screenResolution);
            } catch (e) {
            }
            try {
                var w = window, d = document, e = d.documentElement, g = d.getElementsByTagName('body')[0], x = w.innerWidth || e.clientWidth || g.clientWidth, y = w.innerHeight || e.clientHeight || g.clientHeight;
                var browserSize = x + 'x' + y;
                addProperty('Browser size', browserSize);
            } catch (e) {
            }
            var feedback = el('doorbell-feedback').value;
            var email = getEmail();
            if (typeof customMessage !== 'undefined') {
                feedback = customMessage;
            }
            if (typeof customEmail !== 'undefined') {
                email = customEmail;
            }
            var serializedProperties;
            try {
                serializedProperties = JSON.stringify(properties);
            } catch (e) {
                log('Failed to serialize the properties');
                serializedProperties = properties;
            }
            var data = 'message=' + encodeURIComponent(feedback) + '&email=' + encodeURIComponent(email) + '&properties=' + encodeURIComponent(serializedProperties);
            if (name !== null) {
                data += '&name=' + encodeURIComponent(name);
            }
            ajax({url: host + '/api/applications/' + getAppId() + '/submit', data: data, success: function () {
                el('doorbell-feedback').value = '';
                var onSuccessCallback = option('onSuccess');
                if (typeof onSuccessCallback === 'function') {
                    onSuccessCallback();
                }
                showSuccessMessage('Feedback sent!');
            }, error: function (error) {
                errorContainer.innerHTML = error;
                errorContainer.style.display = 'block';
            }, complete: function () {
                submitting = false;
                enableButton();
            }});
        }, formOpened = function () {
            ajax({url: host + '/api/applications/' + getAppId() + '/open', success: function (data) {
            }, error: function (error) {
            }});
        }, ping = function () {
            if (installed()) {
                return;
            }
            ajax({url: host + '/api/applications/' + getAppId() + '/ping', success: function (data) {
            }, error: function (error) {
            }});
        }, log = function (message) {
            if (typeof console !== 'undefined' && typeof console.log !== 'undefined') {
                console.log(message);
            }
        }, addProperty = function (name, value) {
            properties[name] = value;
        }, createCORSRequest = function (method, url) {
            return null;
            var xhr = new XMLHttpRequest();
            if ("withCredentials"in xhr) {
                xhr.open(method, url, true);
            } else if (typeof XDomainRequest != "undefined") {
                xhr = new XDomainRequest();
                xhr.open(method, url);
            } else {
                xhr = null;
            }
            return xhr;
        }, ajax = function (params) {
            var url = params.url;
            var method = 'POST';
            var xhr = createCORSRequest(method, url);
            if (typeof params.data === 'undefined') {
                params.data = '';
            }
            if (params.data.length > 0) {
                params.data += '&';
            }
            params.data += 'key=' + getAppKey() + '&_token=' + getApiToken() + '&library=javascript';
            var timestamp = option('timestamp');
            if (timestamp) {
                params.data += '&timestamp=' + timestamp;
            }
            var token = option('token');
            if (token) {
                params.data += '&token=' + token;
            }
            var signature = option('signature');
            if (signature) {
                params.data += '&signature=' + signature;
            }
            if (xhr !== null) {
                makeCorsCall(xhr, params);
            } else if (isPostmessageIframeLoaded) {
                if (el('doorbell-attach-screenshot') && el('doorbell-attach-screenshot').checked && screenshot.length > 0) {
                    params.data += '&screenshot=' + screenshot;
                }
                params.referrer = window.location.href;
                makePostmessageCall(params);
            } else {
                makeJsonpCall(params);
            }
        }, ajaxCallback = function (data, code, params) {
            if (code >= 200 && code < 300) {
                if (typeof params.success !== 'undefined') {
                    params.success(data);
                }
            } else {
                if (typeof params.error !== 'undefined') {
                    params.error(data);
                }
            }
            if (typeof params.complete !== 'undefined') {
                params.complete(data);
            }
            if (typeof params.callback !== 'undefined') {
                var callback = params.callback;
                var scriptTag = el('doorbell-' + callback);
                if (scriptTag) {
                    removeElement('doorbell-' + callback);
                    try {
                        delete window[callback];
                    } catch (e) {
                        window[callback] = undefined;
                    }
                }
            }
        }, makeCorsCall = function (xhr, params) {
            xhr.onload = function () {
                ajaxCallback(xhr.responseText, xhr.status, params);
            };
            xhr.onerror = function () {
                log('Error executing CORS request');
                ajaxCallback(xhr.responseText, 400, params);
            };
            xhr.onprogress = function () {
            };
            xhr.ontimeout = function () {
                ajaxCallback("timeout", 0, params);
            };
            xhr.send(params.data);
        }, makePostmessageCall = function (params) {
            var callback = 'jsonp' + (new Date().getTime());
            params.callback = callback;
            window[callback] = function (response) {
                ajaxCallback(response.data, response.code, params);
            };
            if (typeof doorbellpm !== 'undefined') {
                doorbellpm({target: window.frames["doorbellIframe"], type: "doorbellSend", data: params});
            }
        }, makeJsonpCall = function (params) {
            var callback = 'jsonp' + (new Date().getTime());
            params.callback = callback;
            params.data += '&callback=' + params.callback;
            window[callback] = function (response) {
                ajaxCallback(response.data, response.code, params);
            };
            var head = document.getElementsByTagName('head')[0];
            var script = document.createElement('script');
            script.id = 'doorbell-' + callback;
            script.src = params.url + '?' + params.data;
            script.onerror = function () {
                removeElement('doorbell-' + callback);
                log('Error loading JSONP script: ' + script.src);
            };
            head.appendChild(script);
        }, removeElement = function (id) {
            var removeEl = el(id);
            if (removeEl) {
                try {
                    removeEl.parentNode.removeChild(removeEl);
                } catch (e) {
                }
            }
        };
        return{init: function (opts) {
            options = opts;
            var onLoadCallback = option('onLoad');
            if (typeof onLoadCallback === 'function') {
                onLoadCallback();
            }
            var isHttps = (window.location.protocol === "https:");
            var script = el('doorbellScript');
            host = script.src.substr(0, script.src.indexOf('/', 8));
            host = host.replace('https://', 'http://');
            if (isHttps) {
                host = host.replace('http://', 'https://');
            }
            var hideButton = option('hideButton');
            if (hideButton === null || hideButton === false) {
                var button = document.createElement('button');
                button.id = 'doorbell-button';
                button.onclick = showForm;
                button.style.visibility = 'hidden';
                button.innerHTML = 'Feedback';
                document.body.appendChild(button);
            }
            var stylesheet = document.createElement('link');
            stylesheet.href = host + '/css/doorbell.css?v=1413374505';
            stylesheet.rel = 'stylesheet';
            stylesheet.type = 'text/css';
            var head = document.getElementsByTagName('head')[0];
            head.insertBefore(stylesheet, head.firstChild);
            var initProperties = option('properties');
            if (typeof initProperties === 'object' && initProperties !== null) {
                properties = initProperties;
            }
            var initName = option('name');
            if (typeof initName === 'string' && initName !== null) {
                name = initName;
            }
            var emailField = '<input type="email" id="doorbell-email" class="form-control" placeholder="Your email address" value="" />';
            if (typeof doorbellpm !== 'undefined') {
                doorbellpm.bind("doorbellIframeloaded", function () {
                    isPostmessageIframeLoaded = true;
                    return true;
                });
                doorbellpm.bind("doorbellSuccess", function (data) {
                    window[data.callback](data);
                    return true;
                });
                doorbellpm.bind("doorbellError", function (data) {
                    window[data.callback](data);
                    return true;
                });
            }
            var postMessageIframe;
            var attachScreenshotCheckbox;
            if (typeof html2canvas !== 'undefined' && typeof doorbellpm !== 'undefined') {
                postMessageIframe = '<iframe name="doorbellIframe" id="doorbellIframe" src="' + host + '/api/form' + '" style="display: none!important;"></iframe>';
                attachScreenshotCheckbox = '<div class="checkbox" id="doorbell-attach-screenshot-wrapper"><label><input type="checkbox" id="doorbell-attach-screenshot" value="1" /> Attach a screenshot</label></div>';
            } else {
                postMessageIframe = '';
                attachScreenshotCheckbox = '';
            }
            var formHtml = '<div id="doorbell-container"><button id="doorbell-close" title="Close" class="close">&times;</button><form id="doorbell-form" class="">        <fieldset>            <legend>Feedback</legend>            <div id="doorbell-success" class="alert alert-success">Feeback sent, thank you!</div>            <div id="doorbell-error" class="alert alert-error alert-danger">Oops!</div>                        <textarea placeholder="Send us your comments or suggestions..." class="form-control" id="doorbell-feedback"></textarea>            ' + emailField + '            ' + attachScreenshotCheckbox + '            <div class="buttons"><button class="btn btn-primary" id="doorbell-submit-button">Send</button></div>        </fieldset>        <a href="https://doorbell.io" target="_blank" id="doorbell-powered-by">Powered by Doorbell.io</a>        ' + postMessageIframe + '    </form></div>';
            var background = document.createElement('div');
            background.id = 'doorbell-background';
            background.className = '';
            background.style.display = 'none';
            document.body.appendChild(background);
            var container = document.createElement('div');
            container.id = 'doorbell';
            container.innerHTML = formHtml;
            container.style.display = 'none';
            document.body.appendChild(container);
            el('doorbell-background').onclick = function (e) {
                var evt = (e) ? e : window.event;
                if (evt != null && evt.target != null && evt.target.id == 'doorbell-background') {
                    hideForm();
                }
            };
            el('doorbell-close').onclick = function () {
                hideForm();
            };
            el('doorbell-form').onsubmit = function () {
                submit();
                return false;
            };
            el('doorbell-feedback').onkeydown = function (e) {
                var evt = (e) ? e : window.event;
                if ((evt.ctrlKey || evt.metaKey) && evt.keyCode == 13) {
                    submit();
                    evt.preventDefault();
                    evt.stopPropagation();
                    return false;
                }
            };
            document.onkeydown = function (evt) {
                evt = evt || window.event;
                if (evt.keyCode == 27) {
                    hideForm();
                }
            };
            ping();
        }, getProperty: function (name) {
            if (typeof properties[name] !== 'undefined') {
                return properties[name];
            } else {
                return null;
            }
        }, setProperty: function (name, value) {
            addProperty(name, value);
        }, getOption: function (o) {
            return option(o);
        }, setOption: function (option, value) {
            options[option] = value;
        }, setName: function (newName) {
            name = newName;
        }, show: function () {
            showForm();
        }, hide: function () {
            hideForm();
        }, send: function (message, email) {
            submit(message, email);
        }};
        if (typeof JSON !== 'object') {
            JSON = {};
        }
        (function () {
            'use strict';
            function f(n) {
                return n < 10 ? '0' + n : n;
            }

            if (typeof Date.prototype.toJSON !== 'function') {
                Date.prototype.toJSON = function () {
                    return isFinite(this.valueOf()) ? this.getUTCFullYear() + '-' +
                        f(this.getUTCMonth() + 1) + '-' +
                        f(this.getUTCDate()) + 'T' +
                        f(this.getUTCHours()) + ':' +
                        f(this.getUTCMinutes()) + ':' +
                        f(this.getUTCSeconds()) + 'Z' : null;
                };
                String.prototype.toJSON = Number.prototype.toJSON = Boolean.prototype.toJSON = function () {
                    return this.valueOf();
                };
            }
            var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g, escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g, gap, indent, meta = {'\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"': '\\"', '\\': '\\\\'}, rep;

            function quote(string) {
                escapable.lastIndex = 0;
                return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
                    var c = meta[a];
                    return typeof c === 'string' ? c : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                }) + '"' : '"' + string + '"';
            }

            function str(key, holder) {
                var i, k, v, length, mind = gap, partial, value = holder[key];
                if (value && typeof value === 'object' && typeof value.toJSON === 'function') {
                    value = value.toJSON(key);
                }
                if (typeof rep === 'function') {
                    value = rep.call(holder, key, value);
                }
                switch (typeof value) {
                    case'string':
                        return quote(value);
                    case'number':
                        return isFinite(value) ? String(value) : 'null';
                    case'boolean':
                    case'null':
                        return String(value);
                    case'object':
                        if (!value) {
                            return'null';
                        }
                        gap += indent;
                        partial = [];
                        if (Object.prototype.toString.apply(value) === '[object Array]') {
                            length = value.length;
                            for (i = 0; i < length; i += 1) {
                                partial[i] = str(i, value) || 'null';
                            }
                            v = partial.length === 0 ? '[]' : gap ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' : '[' + partial.join(',') + ']';
                            gap = mind;
                            return v;
                        }
                        if (rep && typeof rep === 'object') {
                            length = rep.length;
                            for (i = 0; i < length; i += 1) {
                                if (typeof rep[i] === 'string') {
                                    k = rep[i];
                                    v = str(k, value);
                                    if (v) {
                                        partial.push(quote(k) + (gap ? ': ' : ':') + v);
                                    }
                                }
                            }
                        } else {
                            for (k in value) {
                                if (Object.prototype.hasOwnProperty.call(value, k)) {
                                    v = str(k, value);
                                    if (v) {
                                        partial.push(quote(k) + (gap ? ': ' : ':') + v);
                                    }
                                }
                            }
                        }
                        v = partial.length === 0 ? '{}' : gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' : '{' + partial.join(',') + '}';
                        gap = mind;
                        return v;
                }
            }

            if (typeof JSON.stringify !== 'function') {
                JSON.stringify = function (value, replacer, space) {
                    var i;
                    gap = '';
                    indent = '';
                    if (typeof space === 'number') {
                        for (i = 0; i < space; i += 1) {
                            indent += ' ';
                        }
                    } else if (typeof space === 'string') {
                        indent = space;
                    }
                    rep = replacer;
                    if (replacer && typeof replacer !== 'function' && (typeof replacer !== 'object' || typeof replacer.length !== 'number')) {
                        throw new Error('JSON.stringify');
                    }
                    return str('', {'': value});
                };
            }
            if (typeof JSON.parse !== 'function') {
                JSON.parse = function (text, reviver) {
                    var j;

                    function walk(holder, key) {
                        var k, v, value = holder[key];
                        if (value && typeof value === 'object') {
                            for (k in value) {
                                if (Object.prototype.hasOwnProperty.call(value, k)) {
                                    v = walk(value, k);
                                    if (v !== undefined) {
                                        value[k] = v;
                                    } else {
                                        delete value[k];
                                    }
                                }
                            }
                        }
                        return reviver.call(holder, key, value);
                    }

                    text = String(text);
                    cx.lastIndex = 0;
                    if (cx.test(text)) {
                        text = text.replace(cx, function (a) {
                            return'\\u' +
                                ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                        });
                    }
                    if (/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
                        j = eval('(' + text + ')');
                        return typeof reviver === 'function' ? walk({'': j}, '') : j;
                    }
                    throw new SyntaxError('JSON.parse');
                };
            }
        }());
    };
    if (typeof window.html2canvas === 'undefined') {
    }
    (function () {
        var options;
        if (typeof window.doorbellOptions === 'undefined') {
            return;
        } else if (typeof window.doorbellOptions.appKey === 'undefined') {
            return;
        } else {
            options = window.doorbellOptions;
        }
        window.doorbell = new Doorbell();
        window.doorbell.init(options);
    })();
})();
