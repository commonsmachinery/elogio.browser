/*
 * Elogio sidebar
 *
 */
/**
 * Created by TEMA on 08.10.2014.
 */
(function ($) {
    'use strict';

    var $body = $('body'),
        isSliding = false,
        attachedElement,
        elogioDefaults = {
            side: 'left',
            duration: 200,
            clickClose: true // If true closes panel when clicking outside it
        };


    function slideInThePage(panel, options) {
        var panelWidth = panel.outerWidth(true),
            bodyAnimation = {},
            panelAnimation = {},
            attachedAnimation = {};

        if (panel.is(':visible') || isSliding) {
            return;
        }

        isSliding = true;

        panel.addClass('elogio-active-panel').css({
            position: 'fixed',
            top: 0,
            height: '100%',
            'z-index': 999999
        });
        panel.data(options);
        switch (options.side) {
            case 'left':
                panel.css({
                    left: '-' + panelWidth + 'px',
                    right: 'auto'
                });
                panelAnimation.left = '+=' + panelWidth;
                attachedAnimation.left = '+=' + panelWidth;
                break;

            case 'right':
                panel.css({
                    left: 'auto',
                    right: '-' + panelWidth + 'px'
                });
                panelAnimation.right = '+=' + panelWidth;
                attachedAnimation.right = '+=' + panelWidth;
                break;
        }

        $body.animate(bodyAnimation, options.duration);
        attachedElement.animate(attachedAnimation, options.duration);
        panel.show().animate(panelAnimation, options.duration, function () {
            isSliding = false;
        });
    }

    $.elogioSidebar = function (element, options) {
        var active = $('.elogio-active-panel');

        options = $.extend({}, elogioDefaults, options);
        // If another panel is opened, close it before opening the new one
        if (active.is(':visible') && active[0] !== element[0]) {
            $.elogioSidebar.close(function () {
                slideInThePage(element, options);
            });
        } else if (!active.length || active.is(':hidden')) {
            slideInThePage(element, options);
        }
    };

    $.elogioSidebar.close = function (callback) {
        var active = $('.elogio-active-panel'),
            duration = active.data('duration'),
            panelWidth = active.outerWidth(true),
            bodyAnimation = {},
            panelAnimation = {},
            attachedAnimation = {};

        if (!active.length || active.is(':hidden') || isSliding) {
            return;
        }
        isSliding = true;

        switch (active.data('side')) {
            case 'left':
                bodyAnimation['margin-left'] = '-=' + 0;
                panelAnimation.left = '-=' + panelWidth;
                attachedAnimation.left = '-=' + panelWidth;
                break;

            case 'right':
                bodyAnimation['margin-left'] = '+=' + 0;
                panelAnimation.right = '-=' + panelWidth;
                attachedAnimation.right = '-=' + panelWidth;
                break;
        }

        active.animate(panelAnimation, duration);
        attachedElement.animate(attachedAnimation, duration);
        $body.animate(bodyAnimation, duration, function () {
            active.hide();
            active.removeClass('elogio-active-panel');
            isSliding = false;

            if (callback) {
                callback();
            }
        });
    };

    // Bind click outside panel and ESC key to close panel if clickClose is true
    $(document).bind('keyup', function (e) {
        var active = $('.elogio-active-panel');
        if (e.type === 'keyup' && e.keyCode !== 27) {
            return;
        }
        if (active.is(':visible') && active.data('clickClose')) {
            $.elogioSidebar.close();
        }
    });

    // Prevent click on panel to close it
    $(document).on('click', '.elogio-active-panel', function (e) {
        e.stopPropagation();
    });

    $.fn.elogioSidebar = function (options) {
        this.click(function (e) {
            var active = $('.elogio-active-panel'),
                panel = $(this.getAttribute('href'));
            attachedElement = $(this);
            // Close panel if it is already opened otherwise open it
            if (active.is(':visible') && panel[0] === active[0]) {
                $.elogioSidebar.close();
            } else {
                $.elogioSidebar(panel, options);
            }
            e.preventDefault();
            e.stopPropagation();
        });
        return this;
    };
})(jQuery);
