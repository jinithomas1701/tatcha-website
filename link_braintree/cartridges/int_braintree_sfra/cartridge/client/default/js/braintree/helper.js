'use strict';
var $continueButton = document.querySelector('button.submit-payment');

function initWathcherCartUpdate() {
    var $grantTotal = document.querySelector('.grand-total');
    if ($grantTotal) {
        var currentGrantTotalValue = $grantTotal.textContent;
        $('body').on('cart:update', function () {
            var newGrantTotalValue = $grantTotal.textContent;
            if (newGrantTotalValue !== '' && newGrantTotalValue !== currentGrantTotalValue) {
                currentGrantTotalValue = newGrantTotalValue;
                var updateCartTotals = document.createEvent('Event');
                updateCartTotals.initEvent('updateCartTotals', true, true);
                document.querySelector('body').addEventListener('updateCartTotals', function () {
                    'braintree:updateCartTotals';
                }, false);
                document.querySelector('body').dispatchEvent(updateCartTotals);
            }
        });
    }
}

function continueButtonToggle(flag) {
    var stage = window.location.hash.substring(1);
    if (stage === 'placeOrder' || stage === 'shipping' || stage === null || stage === '') {
        return;
    }
    if (flag) {
        $continueButton.style.display = 'none';
    } else {
        $continueButton.style.display = '';
    }
}


function paymentMethodChangeHandle(currentTab) {
    document.querySelectorAll('.payment-options[role=tablist] a[data-toggle="tab"]').forEach(function (el) {
        var $tabContent = document.querySelector(el.getAttribute('href'));

        if (el === currentTab) {
            $tabContent.querySelectorAll('input, textarea, select').forEach(function (tab) {
                tab.removeAttribute('disabled', 'disabled');
            });
            $tabContent.querySelectorAll('select.no-disable').forEach(function (tab) {
                tab.setAttribute('disabled', 'disabled');
            });
            continueButtonToggle(JSON.parse($tabContent.getAttribute('data-paypal-is-hide-continue-button')));
        } else {
            $tabContent.querySelectorAll('input, textarea, select').forEach(function (tab) {
                tab.setAttribute('disabled', 'disabled');
            });
        }
    });
}

function getPaymentMethodToLowerCase(paymentMethodName) {
    var paymentMethod = paymentMethodName.split('_');
    if (paymentMethod.length === 1) {
        return paymentMethodName;
    }
    paymentMethod.forEach(function (element, index) {
        paymentMethod[index] = element.charAt(0) + element.slice(1).toLocaleLowerCase();
    });
    return paymentMethod[1] ?
        paymentMethod[0] + ' ' + paymentMethod[1] :
        paymentMethod[0];
}

function updateCheckoutView(e, data) {
    var $paymentSummary = document.querySelector('.summary-details .braintree-payment-details');
    var htmlToAppend = '';
    var order = data.order;

    if (order.billing.payment && order.billing.payment.selectedPaymentInstruments
        && order.billing.payment.selectedPaymentInstruments.length > 0) {
        htmlToAppend += '<div>' + getPaymentMethodToLowerCase(order.billing.payment.selectedPaymentInstruments[0].paymentMethod) + '</div>';
        if (order.billing.payment.selectedPaymentInstruments[0].maskedCreditCardNumber) {
            htmlToAppend += '<div>' + order.billing.payment.selectedPaymentInstruments[0].maskedCreditCardNumber + '</div>';
        }
        if (order.billing.payment.selectedPaymentInstruments[0].paymentMethod === 'PayPal') {
            htmlToAppend += '<div>' + order.billing.payment.selectedPaymentInstruments[0].braintreePaypalEmail + '</div>';
        }
        if (order.billing.payment.selectedPaymentInstruments[0].paymentMethod === 'Venmo') {
            htmlToAppend += '<div>' + order.billing.payment.selectedPaymentInstruments[0].braintreeVenmoUserId + '</div>';
        }
        if (order.billing.payment.selectedPaymentInstruments[0].type) {
            htmlToAppend += '<div>' + order.billing.payment.selectedPaymentInstruments[0].type + '</div>';
        }
        htmlToAppend += '<div>' + order.priceTotal.charAt(0) + order.billing.payment.selectedPaymentInstruments[0].amount + '</div>';
    }

    if ($paymentSummary) {
        $paymentSummary.innerHTML = htmlToAppend;
    }
}

function isValidInputField(field) {
    if (!field.checkValidity()) {
        if (!field.classList.contains('is-invalid')) {
            field.classList.add('is-invalid');
        }
        return false;
    }
    if (field.checkValidity() && field.classList.contains('is-invalid')) {
        field.classList.remove('is-invalid');
    }
    return true;
}
/*
    Adding *active* line to the tab-content class in a case if it isn't already active
    Use case: customer checkout from cart (page) and
    (under the place Order page) hit the 'edit' button
**/
function updatePaymentMethodTab() {
    let paymentMethodName = document.querySelectorAll('[data-braintree-payment-method]')[0].dataset.braintreePaymentMethod;
    let content = document.querySelector(`.js_braintree_${paymentMethodName.toLowerCase()}Content`).classList.contains('active');
    if (!content) {
        document.querySelectorAll(`[data-method-id=${paymentMethodName}]`)[0].children[0].click();
    }
}

/**
 * Gets Billing Address Form Values
 *
 * @returns {Object} with Billing Address
 */
function getBillingAddressFormValues() {
    return $('#dwfrm_billing').serialize().split('&')
        .map(function (el) {
            return el.split('=');
        })
        .reduce(function (accumulator, item) {
            var elem = item[0].lastIndexOf('_');
            if (elem < 0) {
                accumulator[item[0]] = item[1];
            } else {
                elem = item[0].substring(elem + 1);
                accumulator[elem] = item[1];
            }
            return accumulator;
        }, {});
}

/**
 * Gets Nonce depending on payment method name
 *
 * @param {string} paymentMethodName - payment method name
 * @returns {boolean} nonce exist
 */

function isNonceExist(paymentMethodName) {
    var $nonce = document.querySelector(`#braintree${paymentMethodName}Nonce`);
    if (!$nonce) return false;

    var nonceValue = $nonce.value;
    var $tab = document.querySelector(`.${paymentMethodName.toLowerCase()}-tab`);
    var isActiveTab;
    if ($tab) {
        isActiveTab = $tab.classList.contains('active');
    }

    return !isActiveTab && nonceValue;
}

var loaderInstance = require('./loaderHelper');
var accountsLoader;

function removeBtPayment(e) {
    let target = e.target;
    var $loaderContainter = document.querySelector('#' + target.getAttribute('data-loader'));
    accountsLoader = loaderInstance($loaderContainter);
    accountsLoader.show();

    $.get(target.getAttribute('data-url') + '?UUID=' + target.getAttribute('data-id'))
        .then((data => {
            $('#uuid-' + data.UUID).remove();
            if (data.newDefaultAccount) {
                document.querySelector('#uuid-' + data.newDefaultAccount + ' span').style.fontWeight = 'bold';
                document.querySelector('#uuid-' + data.newDefaultAccount + ' button.braintree-make-default-card').style.display = 'none';
            }
            accountsLoader.hide();
        }))
        .fail(() => {
            location.reload();
            accountsLoader.hide();
        });
}

/**
 * Create formData from fields data
 *
 * @param {Object} paymentFields - fields data values
 * @param {Object} fieldsData - fields data values
 * @returns {Object} cart billing form data
 */
function createPaymentFormData(paymentFields, fieldsData) {
    var paymentFieldsParsed = JSON.parse(paymentFields);

    return Object.entries(paymentFieldsParsed).reduce(function (formData, entry) {
        const [key, field] = entry;
        if (typeof field === 'object') {
            formData.append(field.name, fieldsData && fieldsData[key] !== null ? fieldsData[key] : field.value);
        }
        return formData;
    }, new FormData());
}

function setDefaultProperty(params) {
    return $.get(params.url + '?UUID=' + params.id + '&pmID=' + params.paymentMethodID)
            .then((data) => {
                document.querySelector('#uuid-' + data.newDefaultProperty + ' span').style.fontWeight = 'bold';
                document.querySelector('.braintree-make-default-card.uuid-' + data.newDefaultProperty).style.display = 'none';
                document.querySelector('#uuid-' + data.toRemoveDefaultProperty + ' span').style.fontWeight = 'normal';
                document.querySelector('.braintree-make-default-card.uuid-' + data.toRemoveDefaultProperty).style.display = 'inline';
                params.loader.hide();
            })
            .fail(() => {
                params.loader.hide();
            });
}

function initCardEvents() {
    if (document.querySelector('.braintreeAddNewCard')) {
        document.querySelector('.braintreeAddNewCard').addEventListener('click', function () {
            document.querySelector('.braintreeAddNewCard').style.display = 'none';
            document.querySelector('.braintreeAddNewCardBlock').style.display = 'block';
        });
    }
    document.querySelector('.creditCard-accounts').onclick = function (e) {
        if (e.target.classList.contains('remove-bt-payment')) {
            removeBtPayment(e);
        } else if (e.target.classList.contains('braintree-make-default-card')) {
            var target = e.target;
            var url = target.getAttribute('data-make-default-url');
            var id = target.getAttribute('data-id');
            var paymentMethodID = 'CARD';
            var $loaderContainter = document.querySelector('#' + target.getAttribute('data-loader'));
            var loader = loaderInstance($loaderContainter);
            loader.show();
            setDefaultProperty({
                url: url,
                id: id,
                paymentMethodID: paymentMethodID,
                loader: loader
            });
        }
    };
}

/**
 * Checks authenticated customer, account list for default Payment Method
 *
 * @param {string} selector - querySelector
 * @returns {Object} default data attribute or null
 */
function getOptionByDataDefault(selector) {
    if (!document.querySelector(selector)) { return null; }

    return Array.apply(null, document.querySelector(selector).options).find(function (el) {
        return el.getAttribute('data-default') ? JSON.parse(el.getAttribute('data-default')) : null;
    });
}

/**
 * Checks authenticated customer, account list for session Account
 *
 * @param {Object} params - querySelector + el.id
 * @returns {Object} session account object
 */
function getSessionAccountOption(params) {
    return Array.apply(null, document.querySelector(params.querySelector).options).find(function (el) {
        return el.id === params.id && JSON.parse(el.getAttribute('data-session-account'));
    });
}

/**
 * Remove Session Active Payment Method
 ** Use helpers to add more Payment Methods
 *
 * @returns {function}function call
 */
function removeActiveSessionPayment() {
    const activePaymentMethods = [];
    document.querySelectorAll('.payment-options[role=tablist] li').forEach(function (el) {
        if (el.dataset.methodId === 'CREDIT_CARD') {
            el.dataset.methodId = 'CreditCard';
        }
        activePaymentMethods.push(el.dataset.methodId);
    });
    var helpers = {
        PayPal: require('./paypal/paypalHelper'),
        Venmo: require('./venmo/venmoHelper'),
        GooglePay: require('./googlepay/googlepayHelper'),
        CreditCard: require('./creditcard/creditcardHelper'),
        SRC: require('./src/srcHelper'),
        ApplePay: require('./applepay/applepayHelper')

    };
    var activePM = activePaymentMethods.find(function (el) {
        return isNonceExist(el);
    });
    if (activePM) {
        return helpers[activePM].removeSessionNonce();
    }
}

function showCartErrorMsg(message) {
    $('.checkout-btn').addClass('disabled');
    $('.cart-error').append(
        `<div class="alert alert-danger alert-dismissible valid-cart-error fade show cartError" role="alert">
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
            ${message}
        </div>`
    );
    window.scrollTo(0, 0);
}

/**
 * Update Checkout Billing form values
 *
 * @param {Object} billingData - fields data values
 */
function updateBillingFormValues(billingData) {
    var $billingFormFields = document.querySelectorAll('.billing-address select, .billing-address input, .contact-info-block input');

    $billingFormFields.forEach(function (el) {
        if (billingData[el.name]) {
            el.value = billingData[el.name];
        }
    });
}

module.exports = {
    initWathcherCartUpdate,
    paymentMethodChangeHandle,
    continueButtonToggle,
    updateCheckoutView,
    isValidInputField,
    updatePaymentMethodTab,
    getBillingAddressFormValues,
    removeBtPayment,
    createPaymentFormData,
    initCardEvents,
    isNonceExist,
    setDefaultProperty,
    getOptionByDataDefault,
    removeActiveSessionPayment,
    getSessionAccountOption,
    showCartErrorMsg,
    updateBillingFormValues
};
