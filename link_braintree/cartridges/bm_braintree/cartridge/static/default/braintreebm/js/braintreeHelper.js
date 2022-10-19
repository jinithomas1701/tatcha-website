/* global Ext jQuery braintree braintreeAdmin */

var braintreeHelper = (function ($) { // eslint-disable-line no-unused-vars
    var $window = $(window);
    var $body = $('body');

    var loadMask = new Ext.LoadMask(Ext.getBody());

    $window.resize(function () {
        recalculateModalWindowSize();
    });

    Ext.Window.prototype.getContentContainer = function () {
        return $('#' + this.body.id);
    };

    Ext.Window.prototype.insertContent = function (html) {
        this.getContentContainer().html(html);
        recalculateModalWindowSize();
    };

    function preventDefault(event) {
        if (event.preventDefault) {
            event.preventDefault();
        } else {
            event.returnValue = false; // eslint-disable-line no-param-reassign
        }
    }

    function showErrorMessage(text) {
        Ext.Msg.show({
            title: braintreeAdmin.resources.errorMsgTitle,
            msg: text,
            buttons: Ext.Msg.OK,
            icon: Ext.MessageBox.ERROR,
            cls: 'braintree_message'
        });
    }

    function showSuccessMessage(text) {
        Ext.Msg.show({
            title: braintreeAdmin.resources.successMsgTitle,
            msg: text,
            buttons: Ext.Msg.OK,
            icon: Ext.MessageBox.INFO,
            cls: 'braintree_message'
        });
    }

    function recalculateModalWindowSize(el) {
        var modalWindow;
        if (typeof el === 'undefined') {
            $('.x-window').each(function () {
                recalculateModalWindowSize($(this).attr('id'));
            });
            return;
        }
        if (el.ctype === 'Ext.Component') {
            modalWindow = el;
        }
        if (el.jquery) {
            el = el.parents('.x-window').attr('id'); // eslint-disable-line no-param-reassign
        }
        if (typeof el === 'string') {
            modalWindow = Ext.getCmp(el);
        }
        var windowHeight = $window.height() - 30;
        modalWindow.setHeight('auto');
        var modalWindowHeight = modalWindow.getSize().height;
        if (modalWindowHeight > windowHeight) {
            modalWindow.setHeight(windowHeight);
        }
        modalWindow.center();
    }

    function getFormModalWindow($form) {
        return Ext.getCmp($form.parents('.x-window').attr('id'));
    }

    return {
        loadMask: loadMask,
        recalculateModalWindowSize: recalculateModalWindowSize,
        showErrorMessage: showErrorMessage,
        showSuccessMessage: showSuccessMessage,

        formDataToObject: function ($form) {
            var data = {};
            $.map($form.serializeArray(), function (el) {
                if (!$form.find('[name=' + el.name + ']').parents('.js_braintree_not_submit_data').length) {
                    data[el.name] = el.value;
                }
            });
            return data;
        },

        ajaxCall: function (url) {
            var data = {};
            var dataType = 'json';
            var successCallback = function () { };

            for (var i = 1; i < arguments.length; i++) {
                var type = typeof arguments[i];
                switch (type) {
                    case 'object': data = arguments[i]; break;
                    case 'string': dataType = arguments[i]; break;
                    case 'function': successCallback = arguments[i]; break;
                    default: break;
                }
            }

            data = $.extend({
                format: 'ajax'
            }, data);

            var loadMask = null; // eslint-disable-line no-shadow
            var loadMaskParent = $('.x-window:last');
            if (loadMaskParent.length) {
                loadMask = new Ext.LoadMask(loadMaskParent[0]);
            } else {
                loadMask = new Ext.LoadMask(Ext.getBody());
            }
            loadMask.msg = braintreeAdmin.resources.pleaseWait;
            loadMask.show();

            $.ajax({
                url: url,
                data: data,
                dataType: dataType,
                error: function () {
                    loadMask.hide();
                    showErrorMessage(braintreeAdmin.resources.serverError);
                },
                success: function (data) { // eslint-disable-line no-shadow
                    loadMask.hide();
                    successCallback(data);
                }
            });
        },

        getFormModalWindow: getFormModalWindow,

        removeModalWindowBodyScroll: function (modal) {
            modal.addListener('show', function () {
                $body.addClass('braintree_noscroll');
            });
            modal.addListener('hide', function () {
                $body.removeClass('braintree_noscroll');
            });
        },

        isFormValid: function ($form) {
            var countErrors = 0;
            $form.find('.braintree_error_msg_box').hide();
            $form.find('.braintree_error_field').removeClass('braintree_error_field');
            $form.find('[data-validation]').each(function () {
                var $field = $(this);
                var rules = $field.data('validation').replace(/\s/g, '').split(',');
                var value = $field.val();
                $.each(rules, function (i, rule) {
                    switch (rule) {
                        case 'required':
                            if (!value.replace(/\s/, '').length) {
                                countErrors++;
                            }
                            break;
                        case 'float':
                            if (isNaN(parseFloat(value)) || !isFinite(value)) {
                                countErrors++;
                            }
                            break;
                        case 'greaterzero':
                            if (parseFloat(value) <= 0) {
                                countErrors++;
                            }
                            break;
                        case 'limit':
                            var max = $field.data('max');
                            if (parseFloat(value) > parseFloat(max)) {
                                countErrors++;
                            }
                            break;
                        default:
                            break;
                    }
                    if (countErrors) {
                        $field.parents('tr').addClass('braintree_error_field');
                        $form.find('.braintree_error_msg_box_' + $field.attr('name') + '_' + rule).show();
                        recalculateModalWindowSize();
                    }
                });
            });
            return !countErrors;
        },

        initHostedFields: function (config, callback) {
            if (!config) {
                $('.braintree-hosted-fields-iframe-container').addClass('js_braintree_hosted_field_disabled');
                return;
            }

            var $form = $('#' + config.formId);
            var modal = getFormModalWindow($form);

            var loadMask = new Ext.LoadMask(modal.getEl()); // eslint-disable-line no-shadow
            loadMask.msg = braintreeAdmin.resources.pleaseWait;
            loadMask.show();

            braintree.client.create({
                authorization: config.clientToken
            }, function (error, clientInstance) {
                loadMask.hide();
                if (error) {
                    showErrorMessage(error.message);
                    return;
                }
                loadMask.show();
                braintree.hostedFields.create({
                    client: clientInstance,
                    fields: {
                        number: {
                            selector: '#braintreeCardNumber'
                        },
                        expirationDate: {
                            selector: '#braintreeExpirationDate'
                        },
                        cvv: {
                            selector: '#braintreeCvv'
                        }
                    }
                }, function (error, hostedFieldsInstance) { // eslint-disable-line no-shadow
                    loadMask.hide();
                    if (error) {
                        showErrorMessage(error.message);
                        return;
                    }
                    hostedFieldsInstance.on('focus', function () {
                        $form.addClass('js_braintree_hosted_fields_focused');
                    });
                    $form.submit(function (formSubmitEvent) {
                        preventDefault(formSubmitEvent);
                        loadMask.show();

                        hostedFieldsInstance.tokenize(function (error, data) { // eslint-disable-line no-shadow
                            loadMask.hide();
                            if (error) {
                                var isAllFieldsEmpty = error.code === 'HOSTED_FIELDS_FIELDS_EMPTY';
                                if (isAllFieldsEmpty && config.allowEmptySubmit) {
                                    $form.addClass('js_braintree_hosted_fields_empty');
                                    callback($form);
                                    return;
                                }
                                $form.removeClass('js_braintree_hosted_fields_empty');
                                showErrorMessage(error.message);

                                return;
                            }
                            $('#newPaymentMethodNonce').val(data.nonce);
                            callback($form);
                        });
                    });
                });
            });
        }
    };
}(jQuery));
