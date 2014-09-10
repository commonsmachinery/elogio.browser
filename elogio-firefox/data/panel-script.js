$(document).ready(function () {
    'use strict';

    var isExtensionEnabled = true;

    var onButton = $("#on");
    var offButton = $("#off");
    var imageListView = $("#imageListView");
    var imageList = imageListView.find("#imageList");
    var messageView = $("#messageView");
    var messageLabel = $("#messageText");
    var template = $("#image-template").html();
    Mustache.parse(template);

    function showMessage(messageText) {
        messageView.show();
        imageListView.hide();
        messageLabel.text(messageText);
    }

    function showImageListView() {
        imageListView.show();
        messageView.hide();
    }

    onButton.click(function () {
        if (isExtensionEnabled) {
            return;
        }
        isExtensionEnabled = true;
        onButton.addClass("btn-success");
        offButton.removeClass("btn-danger");
    });
    offButton.click(function () {
        if (!isExtensionEnabled) {
            return;
        }
        isExtensionEnabled = false;
        offButton.addClass("btn-danger");
        onButton.removeClass("btn-success");
    });


    addon.port.emit("panelLoaded");
    addon.port.on("drawItems", function (items) {
            if (items === null || items === undefined) {
                showMessage("Loading, please wait...");
                return;
            }
            imageList.empty();
            showImageListView();

            function toggleDetails(renderedItem) {
                renderedItem.find('.image-details').toggle();
            }

            for (var i = 0; i < items.length; i++) {
                var element = items[i];
                var rendered = $(Mustache.render(template, {"imageURL": element}));
                rendered.find('img').on('click', toggleDetails.bind(null, rendered));
                imageList.append(rendered);
            }
        }
    );
});
