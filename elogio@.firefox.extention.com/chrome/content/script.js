/**
 * Created by TEMA on 04.09.2014.
 */
var TTElogioRunner = function() {

    var curVersion = "1.0";

    var showAlert = function(messageID) {
        var alertsService = Components.classes["@mozilla.org/alerts-service;1"].getService(Components.interfaces.nsIAlertsService);
        var stringBundle = document.getElementById("elogio-string-bundle");
        var title = stringBundle.getString("alert.title");
        var message = stringBundle.getString(messageID);
        alertsService.showAlertNotification('', title, message, false, '', null);
    };
    var installButton = function(toolbarId, id, afterId) {
        if (!document.getElementById(id)) {
            var toolbar = document.getElementById(toolbarId);

            // If no afterId is given, then append the item to the toolbar
            var before = null;
            if (afterId) {
                let elem = document.getElementById(afterId);
                if (elem && elem.parentNode == toolbar)
                    before = elem.nextElementSibling;
            }

            toolbar.insertItem(id, before);
            toolbar.setAttribute("currentset", toolbar.currentSet);
            document.persist(toolbar.id, "currentset");

            if (toolbarId == "addon-bar") {
                toolbar.collapsed = false;
            }
        }
    };

    return {
        run: function() {

            alert('hello world!')
        },
        init: function(extensions) {
            var firstrun = Services.prefs.getBoolPref("extensions.elogio@.firefox.extention.com.firstrun");

            if (firstrun) {
                Services.prefs.setBoolPref("extensions.elogio@.firefox.extention.com.firstrun", false);
                Services.prefs.setCharPref("extensions.elogio@.firefox.extention.com.installedVersion", curVersion);
                /* Code related to firstrun */
                installButton("nav-bar", "elogio-toolbar-button");
                // The "addon-bar" is available since Firefox 4
                installButton("addon-bar", "elogio-toolbar-button");
            } else {
                try {
                    var installedVersion = Services.prefs.getCharPref("extensions.elogio@.firefox.extention.com.installedVersion");
                    if (curVersion > installedVersion) {
                        Services.prefs.setCharPref("extensions.elogio@.firefox.extention.com.installedVersion", curVersion);
                        /* Code related to upgrade */
                    }
                } catch (ex) {
                    /* Code related to a reinstall */
                }
            }
        }
    };
}();

window.addEventListener("load", TTElogioRunner.init, false);
