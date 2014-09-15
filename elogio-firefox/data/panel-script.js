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
    var jsonTemplate = $('#json-template').html();
    Mustache.parse(template);
    Mustache.parse(jsonTemplate);
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
        $('#imageListView').show();
        addon.port.emit("addonSwitchOn");
        isExtensionEnabled = true;
        onButton.addClass("btn-success");
        offButton.removeClass("btn-danger");
    });
    offButton.click(function () {
        if (!isExtensionEnabled) {
            return;
        }
        $('#imageListView').hide();
        addon.port.emit("addonSwitchOff");
        isExtensionEnabled = false;
        offButton.addClass("btn-danger");
        onButton.removeClass("btn-success");
    });


    addon.port.emit("panelLoaded");
    addon.port.on('showPictureById', function (id) {
        var elem = $('#' + id);
        if (elem.offset()) {
            $('html, body').animate({
                scrollTop: elem.offset().top
            }, 500);
        }
        elem.find('.image-details').toggle();
    });
    addon.port.on("drawItems", function (items) {
            if (!isExtensionEnabled) {
                showMessage("Please enable extension");
                return;
            }
            if (items === null || items === undefined) {
                showMessage("Loading, please wait...");
                return;
            }
            imageList.empty();
            showImageListView();

            function toggleDetails(renderedItem) {
                addon.port.emit('getImageFromContent', renderedItem.attr('id'));
                //todo add request for image
                var jsonData = $(Mustache.render(jsonTemplate, {'data': 'from server'}));
                if(renderedItem.find('.json-details')!==null){
                    renderedItem.find('.json-details').remove();
                    renderedItem.find('.image-details').append(jsonData);
                }else{
                    renderedItem.find('.image-details').append(jsonData);
                }
                renderedItem.find('.image-details').toggle();
            }

            for (var i = 0; i < items.length; i++) {
                var element = items[i];
                var rendered = $(Mustache.render(template, {"imageURL": element.src, "guid": element.guid}));
                rendered.find('img').on('click', toggleDetails.bind(null, rendered));
                imageList.append(rendered);
            }
        }
    );
});
