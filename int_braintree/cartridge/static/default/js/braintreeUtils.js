'use strict';

/* global braintree $ */
/* eslint no-console: 'off' */

(function () {
    var isDebugMode = true;
    if (console && isDebugMode) {
        var consoleLog = console.log;
        var consoleError = console.error;
        console.log = function () {
            consoleLog.apply(console, arguments);
            $('#paymentoverlay').hide();
        };
        console.error = function () {
            consoleError.apply(console, arguments);
            $('#paymentoverlay').hide();
        };
    } else {
        console = { // eslint-disable-line no-global-assign
            log: function () {},
            error: function () {}
        };
    }

    var bu = {
        pdpOnlickForAsignedPaypalPayment: function (url) {
            function appendParamToURL (url, name, value) {
                // quit if the param already exists
                if (url.indexOf(name + '=') !== -1) {
                    return url;
                }
                var separator = url.indexOf('?') !== -1 ? '&' : '?';
                return url + separator + name + '=' + encodeURIComponent(value);
            }

            var $form = $('.product-add-to-cart').closest('form');
            var $qty = $form.find('input[name="Quantity"]');
            var $config = $('.js_braintree_paypal_cart_button');
            $config = $config.data('braintreeConfig');
            
            if ($qty.length === 0 || isNaN($qty.val()) || parseInt($qty.val(), 10) === 0) {
                $qty.val('1');
            }

            var response = $.ajax({
                url: appendParamToURL($config.addProductToCart, 'format', 'ajax'),
                method: 'POST',
                async: false,
                data: $form.serialize()
            }).responseJSON;

            if (!response) {
                return false;
            }
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

        postData: function (uri, data) {
            var form = document.createElement('form');
            form.setAttribute('method', 'post');
            form.setAttribute('action', uri);
            form.style.display = 'none';

            for (var key in data) { // eslint-disable-line no-restricted-syntax
                if (Object.hasOwnProperty.call(data, key)) {
                    var hf = document.createElement('input');
                    hf.setAttribute('type', 'hidden');
                    hf.setAttribute('name', key);
                    hf.setAttribute('value', data[key]);
                    form.appendChild(hf);
                }
            }

            document.body.appendChild(form);
            form.submit();
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
                this.cb = typeof cb === 'function' ? cb : function () {};
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
                $(this.containerEl).show();
                $(this.containerEl).html(text);
            };
            Constructor.prototype.hide = function () {
                this.containerEl.innerHTML = '';
            };
            return new Constructor(callback);
        },

        loadersInstances: [],
        createLoaderInstance: function (containerElement) {
            if (!containerElement) {
                console.error('Braintree: No container for showing loaders');
            }
            function Constructor() {
                bu.loadersInstances.push(this);
                this.loaderCount = 0;
                this.containerEl = containerElement;
            }
            Constructor.prototype.show = function () {
                this.loaderCount++;
                this.setVisible(true);
            };
            Constructor.prototype.hide = function () {
                this.loaderCount--;
                if (this.loaderCount <= 0) {
                    this.setVisible(false);
                }
            };
            Constructor.prototype.setVisible = function (visible) {
                this.containerEl.style.display = visible ? 'block' : 'none';
            };
            return new Constructor();
        },
        clientToken: null
    };

    bu.console = console;
    window.braintreeUtils = bu;
}());
