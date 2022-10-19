'use strict';

/* global braintree $ */
/* eslint no-console: 'off' */

var isDebugMode = true;
if (console && isDebugMode) {
    var consoleLog = console.log;
    var consoleError = console.error;
    console.log = function () {
        consoleLog.apply(console, arguments);
    };
    console.error = function () {
        consoleError.apply(console, arguments);
    };
} else {
    console = { // eslint-disable-line no-global-assign
        log: function () { },
        error: function () { }
    };
}

var bu = {
    pdpOnlickForAsignedPaypalPayment: function () {
        var $bundleItem = $('.bundle-item');
        function getOptions($productContainer) {
            var options = $productContainer
                .find('.product-option')
                .map(function () {
                    var $elOption = $(this).find('.options-select');
                    var urlValue = $elOption.val();
                    var selectedValueId = $elOption.find('option[value="' + urlValue + '"]')
                        .data('value-id');
                    return {
                        optionId: $(this).data('option-id'),
                        selectedValueId: selectedValueId
                    };
                }).toArray();

            return JSON.stringify(options);
        }

        var pid = $('.product-detail:not(".bundle-item")').data('pid');
        var $btn = $('.braintree_pdp_button');
        var $productContainer = $btn.closest('.product-detail');

        var form = {
            pid: pid,
            quantity: $('.quantity-select').val()
        };

        if (!$bundleItem.length) {
            form.options = getOptions($productContainer);
        } else {
            var items = $bundleItem.map(function () {
                return {
                    pid: $(this).find('.product-id').text(),
                    quantity: parseInt($(this).find('label.quantity').data('quantity'), 10)
                };
            });
            form.childProducts = JSON.stringify(items.toArray());
        }
        var response = $.ajax({
            url: $('.add-to-cart-url').val(),
            method: 'POST',
            async: false,
            data: form
        }).responseJSON;
        response.pid = pid;
        return response;
    },

    getSelectedData: function (selectEl) {
        if (!selectEl) {
            return null;
        }
        var options = selectEl.getElementsByTagName('option');
        var option = null;
        for (var i = 0; i < options.length; i++) {
            option = options[i];
            if (option.selected) {
                break;
            }
        }
        return option.attributes;
    },

    postData: function (url, data) {
        var formData = new FormData();

        for (var key in data) {
            formData.append(key, data[key]);
        }
        $.ajax({
            url: url,
            data: formData,
            processData: false,
            contentType: false,
            type: 'POST',
            success: function (res) {
                window.location.href = res.redirectUrl;
            },
            error: function () {
                location.reload();
            }
        });
    },

    messages: {},

    errorInstances: [],
    createErrorInstance: function (containerElement, callback) {
        if (!containerElement) {
            console.error('Braintree: No container for showing erros');
        }
        function Constructor(cb) {
            bu.errorInstances.push(this);
            this.containerEl = containerElement;
            this.cb = typeof cb === 'function' ? cb : function () { };
        }
        Constructor.prototype.show = function (error) {
            var text = '';
            if (typeof error === 'string') {
                text = error;
            }
            if (typeof error === 'object') {
                var msg = bu.messages[error.code];
                text = msg || error.message;
                this.cb(this, error);
                if (error.code === 'PAYPAL_POPUP_CLOSED') {
                    return;
                }
            }
            this.containerEl.style.display = '';
            this.containerEl.innerHTML = text;
        };
        Constructor.prototype.hide = function () {
            this.containerEl.innerHTML = '';
        };
        return new Constructor(callback);
    },
    clientToken: null
};

bu.console = console;

module.exports = bu;

