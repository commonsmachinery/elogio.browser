/**
 * Created by TEMA on 04.09.2014.
 */
var TTElogioRunner = function() {
    var showAlert = function(messageID) {
        var alertsService = Components.classes["@mozilla.org/alerts-service;1"].getService(Components.interfaces.nsIAlertsService);
        var stringBundle = document.getElementById("elogio-string-bundle");
        var title = stringBundle.getString("alert.title");
        var message = stringBundle.getString(messageID);
        alertsService.showAlertNotification('', title, message, false, '', null);
    };

    return {
        run: function() {
           showAlert('error1');
        },
        onPageLoad:function(aEvent){
            var doc = aEvent.originalTarget;
            if (doc.nodeName == "#document") {
                var images=doc.getElementsByTagName('img');
                for(var i=0;i<images.length;i++){
                    images[i].style.border = "5px solid red";
                }
            }
        },
        onWindowLoad:function(){
            var appcontent = document.getElementById("appcontent");
            if (appcontent)
                appcontent.addEventListener("load", TTElogioRunner.onPageLoad, true);
        }
    };
}();

window.addEventListener("load", TTElogioRunner.onWindowLoad, false);
