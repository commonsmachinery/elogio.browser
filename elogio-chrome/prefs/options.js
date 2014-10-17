/**
 * Created by TEMA on 17.10.2014.
 */
// Saves options to chrome.storage
function save_options() {
    var deepScan = document.getElementById('deepScan').checked;
    var highlightRecognizedImages = document.getElementById('highlightRecognizedImages').checked;
    chrome.storage.sync.set({
        deepScan: deepScan,
        highlightRecognizedImages: highlightRecognizedImages
    }, function () {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(function () {
            status.textContent = '';
        }, 750);
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    // Use default value color = 'red' and likesColor = true.
    chrome.storage.sync.get({
        deepScan: true,
        highlightRecognizedImages: true
    }, function (items) {
        document.getElementById('deepScan').checked = items.deepScan;
        document.getElementById('highlightRecognizedImages').checked = items.highlightRecognizedImages;
    });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);