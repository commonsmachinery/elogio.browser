/**
 * Created by TEMA on 17.10.2014.
 */
// Saves options to chrome.storage
function saveOptions() {
    var deepScan = $('#deepScan')[0].checked;
    var highlightRecognizedImages = $('#highlightRecognizedImages')[0].checked;
    var serverUrl = $('#serverUrl').attr('serverUrl');
    chrome.storage.sync.set({
        deepScan: deepScan,
        highlightRecognizedImages: highlightRecognizedImages,
        serverUrl: serverUrl
    }, function () {
        // Update status to let user know options were saved.
        var status = $('#status');
        status.show();
        setTimeout(function () {
            status.hide();
        }, 750);
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {

    $('#deepScanLabel')[0].innerHTML = chrome.i18n.getMessage('deepScan');
    $('#highlightRecognizedImagesLabel')[0].innerHTML = chrome.i18n.getMessage('highlightRecognizedImages');
    var serverUrl = $('#serverUrl').attr('serverUrl');
    chrome.storage.sync.get({
        deepScan: true,
        highlightRecognizedImages: false,
        serverUrl: serverUrl
    }, function (items) {
        $('#deepScan')[0].checked = items.deepScan;
        $('#highlightRecognizedImages')[0].checked = items.highlightRecognizedImages;
        $('#serverUrl').attr('serverUrl', items.serverUrl);
    });
}
$(document).ready(restoreOptions);
$('#save').on('click', saveOptions);