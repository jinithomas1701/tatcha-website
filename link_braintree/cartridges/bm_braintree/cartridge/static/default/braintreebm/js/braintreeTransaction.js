/* global Ext jQuery braintreeHelper */

var braintreeAdmin = (function ($, helper) {
    var extWindows = {
        actionFormWindow: function (title, formContainerClass, html) {
            var modal = new Ext.Window({
                title: title,
                width: 600,
                height: 100,
                modal: true,
                autoScroll: true,
                cls: 'braintree_window_content ' + formContainerClass,
                resizable: false,
                listeners: {
                    activate: helper.removeModalWindowBodyScroll,
                    show: function () {
                        modal.insertContent(html);
                        initActionFormEvents(modal.getContentContainer().find('form'));
                    }
                },
                buttons: [{
                    text: braintreeAdmin.resources.submit,
                    handler: function () {
                        submitActionForm(modal.getContentContainer().find('form'));
                    }
                }, {
                    text: braintreeAdmin.resources.cancel,
                    handler: function () {
                        modal.close();
                    }
                }]
            });
            return modal;
        },
        detailWindow: function (title) {
            return new Ext.Window({
                title: title,
                width: 650,
                height: 100,
                modal: true,
                autoScroll: true,
                cls: 'braintree_window_content',
                resizable: false,
                listeners: {
                    activate: helper.removeModalWindowBodyScroll
                }
            });
        },
        newTransactionWindow: function () {
            var modal = new Ext.Window({
                title: braintreeAdmin.resources.newTransactionTitle,
                height: 100,
                width: 500,
                modal: true,
                autoScroll: true,
                cls: 'braintree_window_content ',
                resizable: false,
                listeners: {
                    activate: helper.removeModalWindowBodyScroll
                },
                buttons: [{
                    text: braintreeAdmin.resources.submit,
                    handler: function () {
                        var $form = modal.getContentContainer().find('form');
                        if ($('#braintreeCreateNewTransactionVault').size()) {
                            submitNewVaultTransactionForm($form);
                        } else if ($('#braintreeCreateTransaction').size()) {
                            submitCreateTransactionForm($form);
                        } else {
                            $('#newPaymentMethodSubmitButton').click();
                        }
                    }
                }, {
                    text: braintreeAdmin.resources.cancel,
                    handler: function () {
                        modal.close();
                    }
                }]
            });
            return modal;
        }
    };

    function initActionFormEvents($form) {
        $form.submit(function () {
            submitActionForm($(this));
            return false;
        });
    }

    function submitNewTransactionForm($form) {
        var modal = helper.getFormModalWindow($form);
        var data = helper.formDataToObject($form);
        if (data.customFields.length > 0) {
            var customFields = createCustomFields(data.customFields);
            if (!customFields) {
                $('.braintree_custom_fields_error').show();
            } else {
                data.customFields = customFields;
            }
        }
        helper.ajaxCall($form.attr('action'), data, function (data) { // eslint-disable-line no-shadow
            if (data.result === 'Success') {
                modal.close();
                helper.showSuccessMessage(braintreeAdmin.resources.success);
            } else {
                helper.showErrorMessage(data.message ? data.message : braintreeAdmin.resources.serverError);
            }
        });
    }

    function submitNewVaultTransactionForm($form) {
        if (!helper.isFormValid($form)) return false;
        $('.braintree_custom_fields_error').hide();
        var data = helper.formDataToObject($form);
        var modal = helper.getFormModalWindow($form);
        if (data.customFields.length > 0) {
            var customFields = createCustomFields(data.customFields);
            if (!customFields) {
                $('.braintree_custom_fields_error').show();
            } else {
                data.customFields = customFields;
            }
        }
        helper.ajaxCall($form.attr('action'), data, function (data) { // eslint-disable-line no-shadow
            if (data.result === 'Success') {
                modal.close();
                helper.showSuccessMessage(braintreeAdmin.resources.success);
            } else {
                helper.showErrorMessage(data.message ? data.message : braintreeAdmin.resources.serverError);
            }
        });
        return true;
    }

    function submitCreateTransactionForm($form) {
        if (!helper.isFormValid($form)) return false;
        var data = helper.formDataToObject($form);
        var modal = helper.getFormModalWindow($form);
        helper.ajaxCall($form.attr('action'), data, function (data) { // eslint-disable-line no-shadow
            if (data.result === 'Success') {
                modal.close();
                window.location.reload();
            } else {
                helper.showErrorMessage(data.message ? data.message : braintreeAdmin.resources.serverError);
            }
        });
        return true;
    }

    function createCustomFields(xmlString) {
        var pairs = xmlString.split(',');
        var i = 0;
        var l = pairs.length;
        var xml = '';
        var pair = null;
        for (i; i < l; i++) {
            pair = pairs[i].replace(/(\r\n|\n|\r)/gm, '').split(':');
            if (pair.length !== 2) {
                return undefined;
            }
            xml += '<' + pair[0] + '>' + pair[1] + '</' + pair[0] + '>';
        }
        return xml;
    }

    function submitActionForm($form) {
        if (!helper.isFormValid($form)) return false;

        var modal = helper.getFormModalWindow($form);
        var orderDetailsModal = helper.getFormModalWindow($('.js_braintree_order_detail'));

        helper.ajaxCall($form.attr('action'), helper.formDataToObject($form), function (data) {
            if (data.result === 'Success') {
                if ($form.selector !== '#braintreeUpdateAmount') {
                    modal.close();
                }
                helper.showSuccessMessage(braintreeAdmin.resources.success);
                reloadTransactionDetails({
                    transactionId: $('.js_braintree_order_transactions_ids option:selected').val(),
                    transactionType: $('.js_braintree_order_transactions_ids option:selected').attr('data-type'),
                    orderNo: orderDetailsModal.orderNo,
                    orderToken: orderDetailsModal.orderToken
                });
                // Update order payment status in orders list table.
                if (data.additionalData) {
                    var orderLink = [].slice.call(document.querySelectorAll('.braintree_transactions_list .table_detail a:not(.js_braintree_show_transaction_detail)')).find(el => {
                        return el.dataset.orderno === data.additionalData.orderNo;
                    });
                    orderLink.parentNode.parentNode.querySelector('.payment_status').innerHTML = data.additionalData.paymentStatus;
                }
            } else {
                helper.showErrorMessage(data.message ? data.message : braintreeAdmin.resources.serverError);
                if ($form.selector === '#braintreeUpdateAmount') {
                    var amt = $('#js_transaction_amount').text();
                    $form.find('input[name="amount"]').val(amt);
                }
            }
        });
        return true;
    }

    function reloadTransactionDetails(data) {
        helper.ajaxCall(braintreeAdmin.urls.orderTransaction, data, function (data) { // eslint-disable-line no-shadow
            helper.getFormModalWindow($('.js_braintree_order_detail')).insertContent(data);
            initOrderTransactionActions();
            initHistoryEvent();
            if (!$('.braintree_transaction_actions span').size()) {
                $('.braintree_transaction_actions').parents('tr').remove();
                helper.recalculateModalWindowSize();
            }
        }, 'html');
    }

    function initOrderTransactionActions() {
        $('.js_braintree_action').on('click', function () {
            var $button = $(this);
            var action = $button.data('action');
            var formHtml = $('#braintree_' + action + '_form').html();
            var formContainerClass = 'js_braintree_action_form_container_' + action;
            extWindows.actionFormWindow($button.data('title'), formContainerClass, formHtml).show();
            if ($button.data('id') && $button.data('amount')) {
                $('.js_braintree_void_id').val($button.data('id'));
                $('.js_braintree_void_amount').html($button.data('amount'));
                $('.js_braintree_void_title').html($button.data('title'));
                $('.js_braintree_void_action').val($button.data('updatepayment') ? 'void' : 'voidWithoutUpdate');
            }
        });

        $('.js_braintree_edit_amt').on('click', function () {
            $('.js_braintree_toggle').toggleClass('js_braintree_hide');
        });

        $('#braintreeUpdateAmount').on('submit', function (event) {
            event.preventDefault();
            var $form = $('#braintreeUpdateAmount');
            submitActionForm($form);
        });
    }

    function initHistoryEvent() {
        $('.js_braintree_order_transactions_ids').on('change', function () {
            var orderDetailsModal = helper.getFormModalWindow($('.js_braintree_order_detail'));
            reloadTransactionDetails({
                transactionId: $(this).val(),
                transactionType: $(this).find(':selected').attr('data-type'),
                orderNo: orderDetailsModal.orderNo,
                orderToken: orderDetailsModal.orderToken

            });
        });
    }

    function initEvents() {
        $('.js_braintree_show_transaction_detail').on('click', function () {
            var $button = $(this);
            var url = $button.attr('href');
            var modal = extWindows.detailWindow($button.attr('title'));

            modal.orderNo = $button.data('orderno');
            modal.orderToken = $button.data('ordertoken');
            modal.show();

            helper.ajaxCall(url, function (data) {
                modal.insertContent(data);
                initOrderTransactionActions();
                initHistoryEvent();
                if (!$('.braintree_transaction_actions span').size()) {
                    $('.braintree_transaction_actions').parents('tr').remove();
                    helper.recalculateModalWindowSize();
                }
                var paymentStatus = modal.body.dom.children[0].querySelector('.transaction_payment_status_value').innerText;
                $button.parent().parent().find('.payment_status').html(paymentStatus);
            }, 'html');

            return false;
        });

        $('.js_braintree_create_transaction').on('click', function () {
            var thisBtn = $(this);
            var data = {
                orderNo: thisBtn.data('orderno'),
                orderToken: thisBtn.data('ordertoken'),
                template: 'braintreebm/transactions/createtransaction'
            };
            var modal = extWindows.newTransactionWindow();
            modal.show();
            helper.ajaxCall(braintreeAdmin.urls.merchantView, data, function (data) { // eslint-disable-line no-shadow
                modal.insertContent(data);
            }, 'html');
        });

        $('.js_braintree_new_transaction_vault').on('click', function () {
            var data = {
                template: 'braintreebm/transactions/newtransactionvault'
            };
            var modal = extWindows.newTransactionWindow();
            modal.show();
            helper.ajaxCall(braintreeAdmin.urls.merchantView, data, function (data) { // eslint-disable-line no-shadow
                modal.insertContent(data);
            }, 'html');
        });

        $('.js_braintree_new_transaction').on('click', function () {
            var data = {
                template: 'braintreebm/transactions/newtransaction'
            };
            var modal = extWindows.newTransactionWindow($(this).attr('title'));
            modal.show();
            helper.ajaxCall(braintreeAdmin.urls.merchantView, data, function (data) { // eslint-disable-line no-shadow
                modal.insertContent(data);
                $('.js_braintree_credit_card_options').remove();
                helper.recalculateModalWindowSize();
                helper.initHostedFields(modal.getContentContainer().find('.js_braintree_hostedfileds_config').data(), submitNewTransactionForm);
            }, 'html');
        });

        $('.js_braintree_switch').on('click', function () {
            var $this = $(this);
            var $activeTab = $('.braintree_active_link');

            $activeTab.removeClass('braintree_active_link').addClass('switch_link');
            $this.removeClass('switch_link').addClass('braintree_active_link ');

            $($this.attr('href')).show();
            $($activeTab.attr('href')).hide();
            return false;
        });
    }

    return {
        init: function (config) {
            $.extend(this, config);
            $(document).ready(function () {
                initEvents();
                if ($('.js_braintree_order_detail').size()) {
                    initOrderTransactionActions();
                }
            });
        }
    };
}(jQuery, braintreeHelper));
