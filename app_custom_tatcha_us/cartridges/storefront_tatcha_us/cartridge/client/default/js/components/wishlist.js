var wishlist = {
    init: function () {
        $(document).on('keyup', '.wishlist-additem', function (event) {
            if (event.keyCode === 13) {
                event.preventDefault();
                $(this).trigger("click");
            }
        }).on('click', '.wishlist-additem', wishlist.addWishlist);

        $(document).on('keyup', '.wishlist-removeitem', function (event) {
            if (event.keyCode === 13) {
                event.preventDefault();
                $(this).trigger("click");
            }
        }).on('click', '.wishlist-removeitem', wishlist.removeWishlist);
    },
    addWishlist: function (e) {
        if (e) {
            e.preventDefault();
        }
        var url = $(this).data('url');
        var container = $(this).parents('.wishlist-btn-container');
        var pid = $(this).data('pid');
        $('.loader-preventive').show();
        $.getJSON(url, function (data) {
            if (data && data.success === true) {
                $('#wishlist-action-sr-' +pid).text('product added to wishlist');
                container.find('.wishlist-additem').hide();
                container.find('.wishlist-removeitem').show();
                // Update ritual page items
                var ritualContainer = $('.rec-prd-list-item[data-id="' + pid + '"]');
                if (ritualContainer.length) {
                    ritualContainer.find('.wishlist-additem').hide();
                    ritualContainer.find('.wishlist-removeitem').show();
                }
                $('.loader-preventive').hide();
            }
        });
    },
    removeWishlist: function (e) {
        if (e) {
            e.preventDefault();
        }
        var url = $(this).data('url');
        var container = $(this).parents('.wishlist-btn-container');
        var pid = $(this).data('pid');
        $('.loader-preventive').show();
        $.getJSON(url, function (data) {
            if (data && data.success === true) {
                $('#wishlist-action-sr-' + pid).text('product removed from wishlist');
                container.find('.wishlist-removeitem').hide();
                container.find('.wishlist-additem').show();
                    // Update ritual page items
                var ritualContainer = $('.rec-prd-list-item[data-id="' + pid + '"]');
                if (ritualContainer.length) {
                    ritualContainer.find('.wishlist-removeitem').hide();
                    ritualContainer.find('.wishlist-additem').show();
                }
                $('.loader-preventive').hide();
            }
        });
    }
};

module.exports = wishlist;

