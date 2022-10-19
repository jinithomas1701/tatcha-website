'use strict';

/**
 * @function
 * @description Initializes the tooltip-content and layout
 */
exports.init = function () {
    $('.share-link').on('click', function (e) {
        e.preventDefault();
        var target = $(this).data('target');
        if (!target) {
            return;
        }
        $(target).toggleClass('active');
        $(target).slideToggle();
    });
};
