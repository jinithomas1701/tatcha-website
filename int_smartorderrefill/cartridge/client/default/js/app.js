/* eslint-disable no-useless-concat */
/* eslint-disable no-alert */
/* eslint-disable no-restricted-syntax, guard-for-in, no-param-reassign,*/
"use strict";
/* global SmartOrderRefillSettings, jQuery */
(function ($) {
    /**
     *  Property of OSF Global Services, Inc., (with its brand OSF Commerce). OSF remains the sole owner of all right, title and interest in the software.
     *  Do not copy, sell, reverse engineer or otherwise attempt to derive or obtain information about the functioning, manufacture or operation therein.
     */
    /* ***** Start of Util section ***** */
    /**
     * @description SmartOrderRefill constructor
     */
    function SmartOrderRefill() {}

    // Form Validation
    SmartOrderRefill.validateForm = function (element) {
        var formValid = true;
        element.find(".field-wrapper").each(function () {
            var fieldWrapper = $(this);
            var field = fieldWrapper.find("input, select");
            if (field.length > 0) {
                field.removeClass("error");
                fieldWrapper.find("label.error").addClass("hide");
                var validState = field[0].validity;

                if (!validState.valid) {
                    formValid = false;
                    field.addClass("error");
                    if (validState.valueMissing) {
                        fieldWrapper.find("label.error.missing-error").removeClass("hide");
                    } else {
                        fieldWrapper.find("label.error.value-error").removeClass("hide");
                    }
                }
            }
        });
        return formValid;
    };

    // Create Modal Up To Modal Type
    SmartOrderRefill.createModal = function (container, options) {
        if (options.buttons && Object.keys(options.buttons).length > 0) {
            var buttons = {};
            for (var key in options.buttons) {
                if (key.indexOf("SOR_GLOBAL_") > -1) {
                    buttons[SmartOrderRefillSettings.Resources[key]] = options.buttons[key];
                } else {
                    buttons[key] = options.buttons[key];
                }
            }
            options.buttons = buttons;
        }
        if (SmartOrderRefillSettings.ModalType === "dialog") {
            $(container).dialog(options);
        } else {
            SmartOrderRefill.bootstrapModal(container, options);
        }
    };

    // Generic Modal Close
    SmartOrderRefill.closeModal = function () {
        if (SmartOrderRefillSettings.ModalType === "dialog") {
            $(this).closest(".ui-dialog-content").dialog("close");
        } else {
            var modal = $(this).closest(".modal");
            if (modal.length === 0) {
                modal = $(this).find(".modal");
            }
            modal.modal("hide");
        }
    };

    // Bootstrap Modal
    SmartOrderRefill.bootstrapModal = function (container, options) {
        var buttonsMarkUp = "";
        var title = options.title ? options.title : "";
        var width = options.width ? "style=\"max-width:" + options.width + "!important;\"" : "";
        var buttons = options.buttons;
        if (buttons && Object.keys(buttons).length > 0) {
            buttonsMarkUp += "<div class=\"modal-footer\">";
            $(container).off("click", "#sorModalCenter button.action");
            for (var key in buttons) {
                buttonsMarkUp += "<button type=\"button\" class=\"btn btn-primary action\"  data-id=\"" + key + "\">" + key + "</button>";
                $(container).on("click", "#sorModalCenter button.action[data-id=\"" + key + "\"]", buttons[key]);
            }
            buttonsMarkUp += "<div>";
        }

        var bootstrap = `<div class="modal fade" id="sorModalCenter" tabindex="-1" role="dialog" aria-labelledby="sorModalCenter" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" ${width}  role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="exampleModalLongTitle">${title}</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${container.html()}
                    </div>
                    ${buttonsMarkUp}
                </div>
            </div>
        </div>`;
        container.html(bootstrap);
        container.find(".modal").on("shown.bs.modal", function () {
            var subscriptionModals = $("#subscriptionview, #orderview");
            if (subscriptionModals.length > 0 && !container.is(subscriptionModals)) {
                container.siblings(".modal-backdrop").last().css("z-index", "1060");
                container.find(".modal").css("z-index", "1070");
            }
        });
        container.find(".modal").modal({
            backdrop: "static"
        });
        container.find(".modal").modal("show");
        container.find(".modal").on("hidden.bs.modal", function () {
            container.remove();
            if ($("#subscriptionview, #orderview, #error-model").length > 0) {
                $("body").addClass("modal-open");
            }
        });
    };

    SmartOrderRefill.limitCharacters = function () {
        $("form").find("textarea[data-character-limit]").each(function () {
            var characterLimit = $(this).data("character-limit");
            var charCountHtml = String.format(SmartOrderRefillSettings.Resources.CHAR_LIMIT_MSG,
                    "<span class=\"char-remain-count\">" + characterLimit + "</span>",
                    "<span class=\"char-allowed-count\">" + characterLimit + "</span>");
            var charCountContainer = $(this).next("div.char-count");
            if (charCountContainer.length === 0) {
                charCountContainer = $("<div class=\"char-count\"/>").insertAfter($(this));
            }
            charCountContainer.html(charCountHtml);
            // trigger the keydown event so that any existing character data is calculated
            $(this).change();
        });
    };

    SmartOrderRefill.creatContainer = function (selector) {
        var $target;
        var id;
        if (jQuery.type(selector) === "string") {
            if (selector.indexOf("#") === 0) {
                $target = $(selector, document);
                $target.selector = selector;
            } else {
                $target = $("#" + selector, document);
                $target.selector = "#" + selector;
            }
        } else if (selector instanceof jQuery) {
            $target = selector;
        }

        if ($target && $target.length === 0) {
            if ($target.selector && $target.selector.indexOf("#") === 0) {
                id = $target.selector.substr(1);
                $target = $("<div>").attr("id", id).appendTo("body");
            }
        }
        return $target;
    };
    /**
     * @description get parameter value from url
     * @param {string} url url to pars
     * @param {string} name parameter to find
     * @returns {string} paramer value
     */
    function getURLParameter(url, name) {
        return (RegExp(name + "=" + "(.+?)(&|$)").exec(url) || [, null])[1]; //eslint-disable-line
    }

    /* ****** End of Util section ****** */


    /* ****** Start of Account section ******* */
    /**
     * @description fill Address Fields
     * @param {Object} address address object
     * @param {Object} $form form object
     */
    function fillAddressFields(address, $form) {
        for (var field in address) {
            if (field === "ID" || field === "UUID" || field === "key") {
                // eslint-disable-next-line no-continue
                continue;
            }
            $form.find("[name$=\"" + field.replace("Code", "") + "\"]").val(address[field]);

            if (field === "countryCode") {
                $form.find("[name$=\"country\"]").trigger("change");
                $form.find("[name$=\"state\"]").val(address.stateCode);
            }
        }
    }
    /**
     * @description filter product variation
     */
    function filterProductVariants() {
        $(document).on("click", "#dwfrm_addproduct_product", function (e) {
            e.preventDefault();
            var selectedProduct = $(this).children("option:selected").val();
            var variations = $("#dwfrm_addproduct_variation").children("option");
            variations.show();
            for (var i = 0; i < variations.length; i++) {
                var variants = variations[i];
                var variant = $(variants).data("master");
                if (selectedProduct !== variant) {
                    $("#dwfrm_addproduct_variation").children("option[data-master=" + "\"" + variant + "\"" + "]").hide();
                }
                if (selectedProduct === variant) {
                    $("#dwfrm_addproduct_variation").children("option").filter(function () {
                        return ($(this).data("master") === selectedProduct);
                    }).prop("selected", true);
                }
            }
        });
    }

    /**
    * @description filter product intervals
    */
    function filterProductRefill() {
        var periods = $("#dwfrm_addproduct_periodicity").children("option");

        if (periods.length > 1) {
            $("#dwfrm_addproduct_interval").children("option").filter(function () {
                return ($(this).data("periodicity") !== "week");
            }).hide();
        }

        $("#dwfrm_addproduct_periodicity").on("change", function () {
            var selectedPeriod = $(this).children("option:selected").val();
            var intervals = $("#dwfrm_addproduct_interval").children("option");
            intervals.show();
            for (var i = 0; i < intervals.length; i++) {
                var interval2 = intervals[i];
                var intervalPeriod = $(interval2).data("periodicity");
                if (selectedPeriod !== intervalPeriod) {
                    // eslint-disable-next-line no-useless-concat
                    $("#dwfrm_addproduct_interval").children("option[data-periodicity=" + "\"" + intervalPeriod + "\"" + "]").hide();
                }
            }
        });
    }

    SmartOrderRefill.initAddressChangeForm = function (target, urlview) {
        $(document).off("click", ".changeaddress").on("click", ".changeaddress", function (e) {
            /*if (!e.detail || e.detail === 1) {
                
                var url = $(this).attr("data-url");
                var $container = SmartOrderRefill.creatContainer("#addresschange");
                var options = SmartOrderRefill.ModalOptions.addressChangeFormOptions(target, urlview, $container);

                $container.load(url, function () {
                    SmartOrderRefill.createModal($container, options);
                    var $form = $("#editAddressForm");

                    $("select[name$=\"_changeaddress\"]", $form).on("change", function () {
                        var selected = $(this).children(":selected").first();
                        var selectedAddress = $(selected).data("address");
                        if (!selectedAddress) {
                            return;
                        }
                        fillAddressFields(selectedAddress, $form);
                        SmartOrderRefill.validateForm($form);
                    });
                });
            }*/ 
        	
            e.preventDefault();
         	$('.loader-preventive').show();
         	var url = $(this).attr('data-url');
         	$.get( url , function( data ) {
         	  $('#addressModal .modal-content').html(data);
         	  $('#addressModal').modal('show');
         	  $('.loader-preventive').hide();
         	});
        });
        
        $(document).on('click', 'input[name="dwfrm_changeaddress"]', function(){
			$('.radio-changeaddress').removeClass('selected');
			$(this).parents('.radio-changeaddress').addClass('selected');
		});
        
        $(document).on('submit', '#editAddressForm', function(e){
         	$('.loader-preventive').show();
         	var url = $(this).attr('action');
         	$.get( url , function( data ) {
         	  return ;
         	});
		});
        
        $(document).on('click', '#ad-update-payment', function(e){
         	$('.loader-preventive').show();
         	var url = $(this).attr('action');
         	if (SitePreferences.MPARTICLE_ENABLED) {
         		var currCard = $('#currCard').val();
         		var newCard = $("input[name=cardId]:checked").val();
         		if(newCard !== currCard) {
         			mParticleAutoDeliveryAction('edit payment');
         		}
            }
         	$.get( url , function( data ) {
         	  return ;
         	});
		});
    };

    /**
     * @private
     * @function
     * @description initialize dialog for order view
     */
    SmartOrderRefill.initOrderView = function () {
        $(".order.view").on("click", function (e) {
            if (!e.detail || e.detail === 1) {
                e.preventDefault();
                var url = $(this).attr("data-link");
                var $container = SmartOrderRefill.creatContainer("#orderview");

                $container.load(url, function () {
                    SmartOrderRefill.limitCharacters();
                    SmartOrderRefill.createModal($container, SmartOrderRefill.ModalOptions.orderViewOptions);
                    SmartOrderRefill.initAddressChangeForm("#orderview", url);
                });
            }
        });
    };

    /**
     * @private
     * @function
     * @description initialize dialog for subscription view
     */
    SmartOrderRefill.initSubscriptionView = function () {
        $(".subscription.view").on("click", function (e) {
            if (!e.detail || e.detail === 1) {
                e.preventDefault();
                var url = $(this).attr("data-link");
                var $container = SmartOrderRefill.creatContainer("#subscriptionview");

                $container.load(url, function () {
                    SmartOrderRefill.limitCharacters();
                    SmartOrderRefill.createModal($container, SmartOrderRefill.ModalOptions.subscriptionViewOptions);
                    SmartOrderRefill.initAddressChangeForm("#subscriptionview", url);
                    SmartOrderRefill.initUpdateCreditCardForm();
                    SmartOrderRefill.initAddProductForm();
                });
            }
        });
    };

    /**
     * @private
     * @function
     * @description initialize update product quantity
     */
    SmartOrderRefill.initUpdateProductQuantity = function () {
        $(document).on("click", ".update-item", function (e) {
            if (!e.detail || e.detail === 1) {
                e.preventDefault();

                var url = $(this).attr("data-link");
                var item = getURLParameter(url, "item");
                var quantity = $(this).parents(".order-section").find("#quantity_" + item).val();
                if (SitePreferences.MPARTICLE_ENABLED) {
            		var currQuantity = $('#currQuantity_'+item).val();
            		if(Math.round(quantity) !== parseInt(currQuantity)){
            			mParticleAutoDeliveryAction('edit quantity', item, $("#sorMonth-" + item).val());
            		}
                }
                $.ajax({
                    type: "POST",
                    url: url,
                    data: {
                        quantity: quantity
                    }
                }).done(function (response) {
                    if (response) {
                        if ($("#qtyError").length) {
                            $("#qtyError").remove();
                        }
                        if (response.success) {
                            window.location = SmartOrderRefillSettings.Urls.manageOrders;
                        } else if (!$("#qtyError").length) {
                            $("<label class=\"error\" id=\"qtyError\">" + response.message + "</label>").insertAfter("#quantity_" + item);
                        }
                    } else {
                        SmartOrderRefill.initErrorModal(SmartOrderRefillSettings.Resources.SOR_QUANTITY_ERROR, false);
                    }
                }).fail(function () {
                    SmartOrderRefill.initErrorModal(SmartOrderRefillSettings.Resources.SOR_UNEXPECTED_ERROR, false);
                });
            }
        });
    };

    /**
     * @private
     * @function
     * @description initialize remove product
     */
    SmartOrderRefill.initRemoveProduct = function () {
        $(document).on("click", ".remove-item", function (e) {
            if (!e.detail || e.detail === 1) {
                e.preventDefault();
                var url = $(this).attr("data-link");
                $.ajax({
                    type: "POST",
                    url: url
                }).done(function (response) {
                    if (response && response.success) {
                        window.location = SmartOrderRefillSettings.Urls.manageOrders;
                    } else {
                        SmartOrderRefill.initErrorModal(SmartOrderRefillSettings.Resources.SOR_QUANTITY_ERROR, false);
                    }
                }).fail(function () {
                    SmartOrderRefill.initErrorModal(SmartOrderRefillSettings.Resources.SOR_UNEXPECTED_ERROR, false);
                });
            }
        });
    };
 /**
     * @private
     * @function
     * @description initialize dialog for add product
     */
    SmartOrderRefill.initAddProductForm = function () {
        $(document).off("click", ".addproduct").on("click", ".addproduct", function (e) {
            if (!e.detail || e.detail === 1) {
                e.preventDefault();
                var url = $(this).attr("data-link");
                var $container = SmartOrderRefill.creatContainer("#addproduct");
                var options = SmartOrderRefill.ModalOptions.addProductOptions;
                $container.load(url, function () {
                    SmartOrderRefill.createModal($container, options);
                    filterProductVariants();
                    filterProductRefill();
                    $("#dwfrm_addproduct_product").trigger("click");
                });
            }
        });
    };

    /**
     * @private
     * @function
     * @description initialize change product form
     */
    SmartOrderRefill.initChangeProductForm = function () {
        $(document).off("click", ".change-item").on("click", ".change-item", function (e) {
            if (!e.detail || e.detail === 1) {
                e.preventDefault();
                var url = $(this).attr("data-link");
                var $container = SmartOrderRefill.creatContainer("#changeproduct");
                var options = SmartOrderRefill.ModalOptions.changeProductFormOptions;

                $container.load(url, function () {
                    SmartOrderRefill.createModal($container, options);
                });
            }
        });
    };

    /**
     * @private
     * @function
     * @description initialize dialog for update credit card view
     */
    SmartOrderRefill.initUpdateCreditCardForm = function () {
        $(document).off("click", ".update-card").on("click", ".update-card", function (e) {
            if (!e.detail || e.detail === 1) {
                e.preventDefault();
                var url = $(this).attr("data-link");
                var $container = SmartOrderRefill.creatContainer("#updatecreditcard");
                var options = SmartOrderRefill.ModalOptions.updateCreditCardFormOptions;

                $container.load(url, function () {
                    SmartOrderRefill.createModal($container, options);
                    $(".choose-card-item").on("click", function () {
                        $(this).find("input[type=\"radio\"]").prop("checked", true);
                    });
                    $("select[id$='_updatecard_expiration_month']").val(parseInt($("#updatecreditcard").find(".expiration-date-wrapper").attr("data-expmonth"), 10));
                    $("select[id$='_updatecard_expiration_year']").val($("#updatecreditcard").find(".expiration-date-wrapper").attr("data-expyear"));
                });
            }
        });
    };

    /**
     * @private
     * @function
     * @description initialize update refill
     */
    SmartOrderRefill.initUpdateRefill = function () {
        $(document).on("click", ".update-refill", function (e) {
            if (!e.detail || e.detail === 1) {
                e.preventDefault();
                var url = $(this).attr("data-link");
                var item = getURLParameter(url, "item");
                var periodicity = $("#select-everydelivery-" + item).val();
                var interval = (periodicity === "month") ? $("#sorMonth-" + item).val() : $("#sorWeek-" + item).val();
                var sorNextDate = $("#sorNextDate-" + item).val();
            	
                if (SitePreferences.MPARTICLE_ENABLED) {
                	var currNextDate = $('#currNextDate-' + item).val();
                    var currFrequency = $('#currFrequency-' + item).val();
                    if(interval !== currFrequency){
                    	mParticleAutoDeliveryAction('frequency update',item,interval);
                    }
                    if(sorNextDate !== currNextDate){
                    	mParticleAutoDeliveryAction('edit schedule',item,interval);
                    }
                }
            	
                $.ajax({
                    type: "POST",
                    url: url,
                    data: {
                        periodicity: periodicity,
                        interval: interval,
                        sorNextDate: sorNextDate
                    }
                }).done(function (response) {
                    if (response && response.success) {
                        window.location = SmartOrderRefillSettings.Urls.manageOrders;
                    } else {
                        SmartOrderRefill.initErrorModal(SmartOrderRefillSettings.Resources.SOR_QUANTITY_ERROR, false);
                    }
                }).fail(function () {
                    SmartOrderRefill.initErrorModal(SmartOrderRefillSettings.Resources.SOR_UNEXPECTED_ERROR, false);
                });
            }
        });
    };

    /**
     * @private
     * @function
     * @description initialize credit card expiration warning
     */
    SmartOrderRefill.initCreditCardExpirationWarning = function () {
        /**
         * @description determin if card expiration worning should be shown
         * @param {string} month month form element value
         * @param {string} year year form element value
         */
        function toggleExpirationWarning(month, year) {
            if (typeof month !== "undefined" && typeof year !== "undefined" && month && year) {
                var expirationDate = new Date(new Date(year, month).setDate(0));
                var currentDate = new Date();
                var nextYear = new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), currentDate.getDate() - 1);

                if ((expirationDate - nextYear) <= 0) {
                    $(".credit_card_expiration_warning").show();
                } else {
                    $(".credit_card_expiration_warning").hide();
                }
            }
        }

        $(document).on("change", ".pt_checkout [name$=\"creditCard_expiration_month\"], .pt_checkout [name$=\"creditCard_expiration_year\"]", function () {
            var month = $(".pt_checkout [name$=\"creditCard_expiration_month\"]").val();
            var year = $(".pt_checkout [name$=\"creditCard_expiration_year\"]").val();
            toggleExpirationWarning(month, year);
        });
        $(document).on("change", "#checkout-main [name$=\"creditCardFields_expirationMonth\"], #checkout-main [name$=\"creditCardFields_expirationYear\"]", function () {
            var month = $("#checkout-main [name$=\"creditCardFields_expirationMonth\"]").val();
            var year = $("#checkout-main [name$=\"creditCardFields_expirationYear\"").val();
            toggleExpirationWarning(month, year);
        });
    };

    /**
     * @private
     * @function
     * @description initialize reactivate order view
     */
    SmartOrderRefill.initReactivateOrderView = function () {
        $(document).off("click", ".order.reactivate").on("click", ".order.reactivate", function (e) {
            if (!e.detail || e.detail === 1) {
                e.preventDefault();
                var url = $(this).attr("data-link");
                var order = getURLParameter(url, "sid");
                $.ajax({
                    type: "POST",
                    url: url,
                    data: {
                        order: order
                    }
                }).done(function (response) {
                    if (response) {
                        if (!response.success) {
                            var $container = SmartOrderRefill.creatContainer("#reactivate-order");
                            $container.html("<h3>" + SmartOrderRefillSettings.Resources.SOR_REACTIVE_ORDER_MESSAGE + "</h3>");
                            SmartOrderRefill.createModal($container, SmartOrderRefill.ModalOptions.reactivateOrderViewOptions);
                        } else {
                            window.location = SmartOrderRefillSettings.Urls.manageOrders;
                        }
                    } else {
                        SmartOrderRefill.initErrorModal(SmartOrderRefillSettings.Resources.SOR_UNEXPECTED_ERROR, false);
                    }
                }).fail(function () {
                    SmartOrderRefill.initErrorModal(SmartOrderRefillSettings.Resources.SOR_UNEXPECTED_ERROR, false);
                });
            }
        });
    };

    /**
     * @private
     * @function
     * @description initialize reactivate subscription view
     */
    SmartOrderRefill.initReactivateSubscriptionView = function () {
        $(document).off("click", ".reactivatesubscription").on("click", ".reactivatesubscription", function (e) {
            if (!e.detail || e.detail === 1) {
                e.preventDefault();
                var url = $(this).attr("data-link");
                var $container = SmartOrderRefill.creatContainer("#reactivate-subscription");
                var options = SmartOrderRefill.ModalOptions.reactivateSubscriptionOptions;

                $container.load(url, function () {
                    SmartOrderRefill.createModal($container, options);
                });
            }
        });
    };
    /* ****** End of Account section ****** */

    /* ******* Start of Cart section ******* */

    SmartOrderRefill.initModifyRefill = function () {
        $(document).on("click", "#modifyRefill", function (e) {
            if (!e.detail || e.detail === 1) {
                e.preventDefault();
                var url = $(this).attr("data-link");
                var $container = SmartOrderRefill.creatContainer("#modify-smart-order-refill");

                $container.load(url, function () {
                    SmartOrderRefill.limitCharacters();
                    SmartOrderRefill.createModal($container, SmartOrderRefill.ModalOptions.modifyRefillOptions);
                    // force to load the selected value of sor subscriptions
                    $("[name=\"everyDelivery\"]").trigger("change");
                    $("#modify-smart-order-refill select").on("change", function () {
                        $("#multipleRefill").prop("checked", true);
                    });
                });
            }
        });
    };

    SmartOrderRefill.initRemoveRefill = function () {
        $(document).on("click", "#removeRefill", function (e) {
            if (!e.detail || e.detail === 1) {
                e.preventDefault();
                var url = $(this).attr("data-link");
                var cartShow = SmartOrderRefillSettings.Urls.cartShow;

                $.ajax({
                    type: "GET",
                    url: url,
                    success: function (response) {
                        if (response && response.success) {
                            window.location = cartShow;
                        } else {
                            SmartOrderRefill.initErrorModal(SmartOrderRefillSettings.Resources.SOR_UNEXPECTED_ERROR, false);
                        }
                    }
                });
            }
        });
    };

    SmartOrderRefill.initLoginFromCart = function () {
        $(document).on("click", "#message_wrapper a", function () {
            var $container = SmartOrderRefill.creatContainer("#sorlogin");
            var options = {
                modal: true,
                width: "50rem",
                open: function () {

                }
            };
            $container.load(SmartOrderRefillSettings.Urls.loginFromCartPage, function () {
                SmartOrderRefill.limitCharacters();
                SmartOrderRefill.createModal($container, options);
            });
        });
        $(document).on("click", "#sorlogin button", function (e) {
            if (!e.detail || e.detail === 1) {
                e.preventDefault();
                var form = $(this).parents("form:first");
                if (SmartOrderRefill.validateForm(form)) {
                    var url = form.attr("action");
                    var data = {};
                    form.serializeArray().forEach(function (param) {
                        data[param.name] = param.value;
                    });

                    $.ajax({
                        type: "POST",
                        url: url,
                        data: data,
                        success: function (response) {
                            if (!response) {
                                SmartOrderRefill.initErrorModal(SmartOrderRefillSettings.Resources.SOR_UNEXPECTED_ERROR, false);
                            } else if (response.success) {
                                if ($("#loginFromCartError").length) {
                                    $("#loginFromCartError").remove();
                                }
                                window.location = response.url;
                            } else if (!$("#loginFromCartError").length) {
                                form.prepend("<div id=\"loginFromCartError\" class=\"error-form\">" + SmartOrderRefillSettings.Resources.SOR_LOGINFROMCART_ERROR + "</div>");
                            }
                        }
                    });
                }
            }
        });
    };

    /* ******* End of Cart section ******* */

    /* ******* Start of Product section ******* */

    SmartOrderRefill.initializePdp = function () {
        /**
         * @description Show or hide the schedule select based on user selection.
         * @param {boolean} value form element value
         */
        function hideOrShowSchedules(value) {
            if (value === "true") {
                if (window.innerWidth < 568) {
                    $(".smart-order-refill-period").attr("style", "margin: 0.9375rem 1.25rem");
                }
                $(".smart-order-refill-period").attr("style", "display:inline-block");
                $("#addProductbtn").attr("style", "");
                $("#everyDelivery").trigger("change");
            } else {
                $(".or-cancel-edit-text").attr("style", "margin-top:0.625rem");
                $(".smart-order-refill-period").attr("style", "display:none");
                $("#addProductbtn").attr("style", "display:none");
            }
        }
        /**
         * @description initializa options
         */
        function initOptions() {
            if (!$(".smart-order-refill-options").data("sorOneTime")) {
                $(".smart-order-refill-options [for=\"OsfSorRefillProductNo\"], .smart-order-refill-options [for=\"OsfSorRefillProductYes\"]").hide();
                $("#OsfSorRefillProductYes").prop("checked", true);
            }
            if ($(".smart-order-refill-period p").data("disableDropdown")) {
                $("#SorDeliveryWeekInterval, #SorDeliveryMonthInterval").css({
                    display: "none"
                });
            }
        }

        initOptions();

        $(document).on("click", "#pdpMain .product-add-to-cart select#SorDeliveryMonthInterval", function () {
            $("input[name=\"hasSmartOrderRefill\"]").val(["true"]);
        });

        $("input[name=hasSmartOrderRefill]").change(function () {
            hideOrShowSchedules($(this).val());
        });

        $(document).on("change", "[name=\"everyDelivery\"]", function () {
            if ($(this).val() === "month") {
                $("select[name=SorDeliveryWeekInterval]").hide();
                $("select[name=SorDeliveryMonthInterval]").show();
                if ($(".smart-order-refill-period p").data("disableDropdown")) {
                    $("#SorDeliveryWeekInterval, #SorDeliveryMonthInterval").css({
                        display: "none"
                    });
                }
            } else if ($(this).val() === "week") {
                $("select[name=SorDeliveryMonthInterval]").hide();
                $("select[name=SorDeliveryWeekInterval]").show();
                if ($(".smart-order-refill-period p").data("disableDropdown")) {
                    $("#SorDeliveryWeekInterval, #SorDeliveryMonthInterval").css({
                        display: "none"
                    });
                }
            }
        });

        $("[name=\"everyDelivery\"], select[name=\"SorDeliveryWeekInterval\"], select[name=\"SorDeliveryMonthInterval\"]").on("change", function () {
            var everyDeliveryHasValueSelected = $("[name=\"everyDelivery\"]").val();
            var weekIntervalHasValueSelected = $("select[name=SorDeliveryWeekInterval]").val();
            var monthIntervalHasValueSelected = $("select[name=SorDeliveryMonthInterval]").val();
            var sorDataInformed = everyDeliveryHasValueSelected || (weekIntervalHasValueSelected || monthIntervalHasValueSelected);
            var variantSelected = $(".product-number span").text();
            var shouldEnableAddToCartButton = sorDataInformed && (variantSelected !== "undefined");
            var disabled = false;
            if ($(".add-to-cart").length !== 0) {
                if ($(".add-to-cart")[0].disabled) {
                    $(".addFromPDP").prop("disabled", true);
                    disabled = true;
                }
            } else if ($("#add-to-cart").length !== 0) {
                if ($("#add-to-cart")[0].disabled) {
                    $(".addFromPDP").prop("disabled", true);
                    disabled = true;
                }
            }
            if (shouldEnableAddToCartButton && !disabled) {
                $("#add-to-cart").removeAttr("disabled");
                $(".addFromPDP").prop("disabled", false);
                if ($("#OsfSorRefillProductYes").prop("checked")) {
                    var quantity;
                    if ($(".quantity input").length !== 0) {
                        if (Number($(".quantity input").val()) > 0) {
                            quantity = Number($(".quantity input").val());
                        } else {
                            $("#add-to-cart").attr("disabled", "disabled");
                            $(".addFromPDP").prop("disabled", true);
                        }
                    } else {
                        for (var q = 0; q < $(".quantity-select option").length; q++) {
                            var qut = $(".quantity-select option")[q];
                            if (qut.selected === true) {
                                quantity = $(".quantity-select option")[q].value;
                            }
                        }
                    }
                    $.ajax({
                        type: "POST",
                        url: SmartOrderRefillSettings.Urls.checkProductRefill,
                        data: {
                            hasSmartOrderRefill: $("[name=\"hasSmartOrderRefill\"]").filter(":checked").val(),
                            everyDelivery: $("[name=\"everyDelivery\"]").val(),
                            SorDeliveryWeekInterval: $("[name=\"SorDeliveryWeekInterval\"]").val(),
                            SorDeliveryMonthInterval: $("[name=\"SorDeliveryMonthInterval\"]").val(),
                            variantSelected: $("input[name=variantSelected]").val(),
                            pid: variantSelected,
                            quantity: quantity
                        }
                    }).done(function (data) {
                        if (data) {
                            if (data.success === true) {
                                $("#addProductbtn").removeClass("hide");
                                $(".addFromPDP").data("subIDs", data.subscriptionIDs);
                                $(".addFromPDP").data("pid", variantSelected);
                                $(".addFromPDP").data("interval", data.interval);
                                $(".addFromPDP").data("periodicity", data.periodicity);
                                $(".addFromPDP").data("quantity", quantity);
                            } else {
                                $("#addProductbtn").addClass("hide");
                                $(".or-cancel-edit-text").css("margin", "0 0 1rem 0rem");
                            }
                        }
                    });
                }
            } else {
                $("#addProductbtn").removeClass("hide");
                $("#add-to-cart").attr("disabled", "disabled");
                $(".addFromPDP").prop("disabled", true);
            }
        });
        $(".addFromPDP").on("click", function (e) {
            e.preventDefault();
            var link = $(this).attr("data-link");
            var subIDs = $(this).data("subIDs");
            var pid = $(this).data("pid");
            var interval = $(this).data("interval");
            var periodicity = $(this).data("periodicity");
            var quantity;
            if ($(".quantity input").length !== 0) {
                quantity = Number($(".quantity input").val());
            } else {
                quantity = $(this).data("quantity");
            }
            if (quantity > 0) {
                if (document.getElementById("errormsg-quantity") !== null) {
                    document.getElementById("errormsg-quantity").innerHTML = "<h4><h4>";
                }
                var $container = SmartOrderRefill.creatContainer("#addproductPDP");
                var options = SmartOrderRefill.ModalOptions.addProductPDPOptions;
                $.ajax({
                    type: "POST",
                    url: link,
                    data: {
                        subIDs: subIDs,
                        pid: pid,
                        interval: interval,
                        periodicity: periodicity,
                        quantity: quantity
                    }
                }).done(function (data) {
                    if (data) {
                        $container.html(data);
                        SmartOrderRefill.createModal($container, options);
                    }
                });
            } else {
                document.getElementById("errormsg-quantity").innerHTML = "<h4>Quantity must be a integer grater then 0<h4>";
            }
        });

        $("body").on("product:afterAddToCart", function (e, response) {
            if (response && !response.error && SmartOrderRefillSettings.Urls && SmartOrderRefillSettings.Urls.updateRefillData) {
                $.ajax({
                    type: "POST",
                    url: SmartOrderRefillSettings.Urls.updateRefillData,
                    data: {
                        action: "update",
                        hasSmartOrderRefill: $("[name=\"hasSmartOrderRefill\"]").filter(":checked").val(),
                        everyDelivery: $("[name=\"everyDelivery\"]").val(),
                        SorDeliveryWeekInterval: $("[name=\"SorDeliveryWeekInterval\"]").val(),
                        SorDeliveryMonthInterval: $("[name=\"SorDeliveryMonthInterval\"]").val(),
                        liuuid: response.pliUUID
                    }
                });
            }
        });
        $("body").on("product:afterAttributeSelect", function (e, response) {
            if (response.data && response.data.product && response.data.product.id) {
                $.ajax({
                    type: "GET",
                    url: SmartOrderRefillSettings.Urls.updatePDPOptions,
                    data: {
                        pid: response.data.product.id
                    },
                    success: function (successResponse) {
                        var refillOptions = $(successResponse).filter(".smart-order-refill-options");

                        var hasRefillId = "#" + refillOptions.find("[name=\"hasSmartOrderRefill\"]").filter(":checked").attr("id");
                        var everyDelivery = refillOptions.find("[name=\"everyDelivery\"]").val();
                        var weekInterval = refillOptions.find("[name=\"SorDeliveryWeekInterval\"]").val();
                        var monthInterval = refillOptions.find("[name=\"SorDeliveryMonthInterval\"]").val();

                        var sorPrice = refillOptions.find(".sor-price");
                        var sorPriceMessage = refillOptions.find(".sor-price-message");

                        $("[name=\"everyDelivery\"]").val(everyDelivery).change();
                        $("[name=\"SorDeliveryWeekInterval\"]").val(weekInterval).change();
                        $("[name=\"SorDeliveryMonthInterval\"]").val(monthInterval).change();
                        $(".smart-order-refill-options .sor-price").remove();
                        $(".smart-order-refill-options .sor-price-message").remove();
                        if (sorPrice.length) {
                            $(".smart-order-refill-options").append(sorPrice);
                            $(".smart-order-refill-options").append(sorPriceMessage);
                        }
                        $(hasRefillId).prop("checked", true).change();
                        initOptions();
                        hideOrShowSchedules($("input[name=hasSmartOrderRefill]:checked").val());
                    }
                });
            }
        });
        hideOrShowSchedules($("input[name=hasSmartOrderRefill]:checked").val());
    };

    
    // generic method for functions without Ajax calls
    SmartOrderRefill.initLinkModel = function () {
        $(document).off("click", ".sorshowmodal").on("click", ".sorshowmodal", function (e) {
            e.preventDefault();
            var url = $(this).attr("data-link");
            var title = $(this).attr("data-title");
            var content = $(this).attr("data-content");
            var yes = $(this).attr("data-yes");
            var no = $(this).attr("data-no");
            var $container = SmartOrderRefill.creatContainer("#link-model");
            var options = {
                autoOpen: true,
                modal: true,
                title: title,
                width: "25rem",
                buttons: {}
            };

            if (yes) {
                options.buttons[yes] = SmartOrderRefill.ButtonFunctions.linkModelYes.bind($container, url);
            }
            if (no) {
                options.buttons[no] = SmartOrderRefill.closeModal;
            }
            $container.html("<h3>" + content + "</h3>");

            SmartOrderRefill.createModal($container, options);
        });
    };

    // generic method for error messages
    SmartOrderRefill.initErrorModal = function (content, refresPage) {
        var $container = SmartOrderRefill.creatContainer("#error-model");
        var options = {
            autoOpen: true,
            modal: true,
            title: SmartOrderRefillSettings.Resources.SOR_ERROR_TITLE,
            width: "25rem",
            buttons: {
                SOR_GLOBAL_OK: SmartOrderRefill.ButtonFunctions.reloadDashboard.bind($container, refresPage)
            }
        };

        $container.html("<h3>" + content + "</h3>");
        SmartOrderRefill.createModal($container, options);
    };


    // ***** BUTTONS FUNCTIONS ******
    SmartOrderRefill.ButtonFunctions = {
        // reactivateSubscription
        reactivateSubscriptionSave: function () {
            var $form = $("#reactiveSubs");
            var formValid = SmartOrderRefill.validateForm($form);
            if ($form) {
                if (formValid) {
                    setTimeout(function () {
                        $.ajax({
                            type: "POST",
                            url: $form.attr("action"),
                            data: $form.serialize()
                        }).done(function (response) {
                            if (response && response.success) {
                                SmartOrderRefill.closeModal();
                                window.location = SmartOrderRefillSettings.Urls.manageOrders;
                            } else {
                                SmartOrderRefill.initErrorModal(SmartOrderRefillSettings.Resources.SOR_UNEXPECTED_ERROR, false);
                            }
                        }).fail(function () {
                            SmartOrderRefill.initErrorModal(SmartOrderRefillSettings.Resources.SOR_UNEXPECTED_ERROR, false);
                        });
                    }, 1000);
                }
            }
        },
        reloadDashboard: function (refresPage) {
            if (refresPage) {
                window.location = SmartOrderRefillSettings.Urls.manageOrders;
            }
        },
        // initReactivateOrderView
        reactivateOrderViewOk: function () {
            setTimeout(function () {
                $.ajax({
                    type: "POST",
                    url: SmartOrderRefillSettings.Urls.cancelOneOrder,
                    data: {
                        sid: order // eslint-disable-line no-undef
                    }
                }).done(function (response) {
                    if (response && response.success) {
                        SmartOrderRefill.closeModal();
                        window.location = SmartOrderRefillSettings.Urls.manageOrders;
                    } else {
                        SmartOrderRefill.initErrorModal(SmartOrderRefillSettings.Resources.SOR_UNEXPECTED_ERROR, false);
                    }
                }).fail(function () {
                    SmartOrderRefill.initErrorModal(SmartOrderRefillSettings.Resources.SOR_UNEXPECTED_ERROR, false);
                });
            }, 1000);
        },

        linkModelYes: function (url) {
            $.ajax({
                type: "GET",
                url: url,
                success: function (response) {
                    if (response) {
                        if (response.success) {
                            window.location = SmartOrderRefillSettings.Urls.manageOrders;
                        } else if (response.message) {
                            SmartOrderRefill.initErrorModal(response.message, true);
                        } else {
                            SmartOrderRefill.initErrorModal(SmartOrderRefillSettings.Resources.SOR_UNEXPECTED_ERROR, true);
                        }
                    }
                }
            });
            SmartOrderRefill.closeModal();
        },

        // initUpdateCreditCardForm
        updateCreditCardFormSave: function () {
            var $form = $("#editCreditCard");
            var formValid = SmartOrderRefill.validateForm($form);
            var today = new Date();
            today.setHours(0, 0, 0);
            var expirationDate = new Date();
            var year = parseInt($form.find("[name$='updatecard_expiration_year']").val(), 10);
            var month = parseInt($form.find("[name$='updatecard_expiration_month']").val(), 10);
            if (year && month) {
                expirationDate.setMonth(month - 1);
                expirationDate.setFullYear(year);
                expirationDate.setHours(0, 0, 0);
                if (expirationDate.getTime() <= today.getTime()) {
                    formValid = false;
                    alert(SmartOrderRefillSettings.Resources.SOR_CREDITCARD_ERROR); // NOSONAR
                }
            }

            if (formValid) {
                if ($form.find(".choose-card-wrapper").length >= 0) {
                    var $cardSelects = $("#editCreditCard").find("[name$=\"updatecard_confirm\"]");
                    if ($form.find("[name$=\"updatecard_confirm\"]").filter(":checked").length) {
                        $cardSelects.each(function () {
                            var $cardSelect = $(this);
                            if (!$cardSelect.prop("checked")) {
                                $cardSelect.parents(".choose-card-item").remove();
                            }
                        });
                    }
                    setTimeout(function () {
                        $.ajax({
                            type: "POST",
                            url: $form.attr("action"),
                            data: $form.serialize()
                        }).done(function (response) {
                            if (response && response.success) {
                                SmartOrderRefill.closeModal();
                                window.location = SmartOrderRefillSettings.Urls.manageOrders;
                            } else {
                                alert(SmartOrderRefillSettings.Resources.SOR_CREDITCARD_ERROR); // NOSONAR
                            }
                        }).fail(function () {
                            alert(SmartOrderRefillSettings.Resources.SOR_UNEXPECTED_ERROR); // NOSONAR
                        });
                    }, 1000);
                }
            }
        },
        addProductFormPDPSave: function () {
            var $form = $("#addProductPDPForm");
            var formValid = SmartOrderRefill.validateForm($form);
            var sid = $("input[name=sor-subs]:checked").val();
            var interval = $(".addFromPDP").data("interval");
            var periodicity = $(".addFromPDP").data("periodicity");
            var pid = $(".addFromPDP").data("pid");
            var quantity = $(".addFromPDP").data("quantity");
            if (formValid) {
                setTimeout(function () {
                    $.ajax({
                        type: "POST",
                        url: $form.attr("action"),
                        data: {
                            periodicity: periodicity,
                            interval: interval,
                            pid: pid,
                            quantity: quantity,
                            sid: sid
                        }
                    }).done(function (data) {
                        if (data) {
                            if (data.success === true) {
                                SmartOrderRefill.closeModal();
                                window.location = SmartOrderRefillSettings.Urls.manageOrders;
                            }
                        }
                    });
                }, 1000);
            }
        },
        addProductFormSave: function () {
            var $form = $("#addProductForm");
            var formValid = SmartOrderRefill.validateForm($form);
            var variation = $form.find("[name$='addproduct_variation']").val();
            var periodicity = $form.find("[name$='addproduct_periodicity']").val();
            var interval = $form.find("[name$='addproduct_interval']").val();
            var quantity = $form.find("[name$='addproduct_quantity']").val();
            if (formValid) {
                setTimeout(function () {
                    $.ajax({
                        type: "POST",
                        url: $form.attr("action"),
                        data: {
                            periodicity: periodicity,
                            interval: interval,
                            pid: variation,
                            quantity: quantity
                        }
                    }).done(function (data) {
                        if (data) {
                            if (data.success === true) {
                                SmartOrderRefill.closeModal();
                                window.location = SmartOrderRefillSettings.Urls.manageOrders;
                            }
                        }
                    });
                }, 1000);
            }
        },
        // initChangeProductForm
        changeProductFormSave: function () {
            var $form = $("#editProductForm");
            var product = $(".product-select").val();

            setTimeout(function () {
                $.ajax({
                    type: "POST",
                    url: $form.attr("action"),
                    data: {
                        newProduct: product
                    }
                }).done(function (response) {
                    if (response && response.success) {
                        SmartOrderRefill.closeModal.call($container); // eslint-disable-line no-undef
                        window.location = SmartOrderRefillSettings.Urls.manageOrders;
                    } else {
                        alert(SmartOrderRefillSettings.Resources.SOR_PRODUCT_ERROR); // NOSONAR
                    }
                }).fail(function () {
                    SmartOrderRefill.initErrorModal(SmartOrderRefillSettings.Resources.SOR_UNEXPECTED_ERROR, false);
                });
            }, 1000);
        },

        // initAddressChangeForm
        addressChangeFormSave: function () {
            var $form = $("#editAddressForm");
            var formValid = SmartOrderRefill.validateForm($form);
            var target = SmartOrderRefill.addressChangeInfo.target;
            var urlview = SmartOrderRefill.addressChangeInfo.urlview;
            var $container = SmartOrderRefill.addressChangeInfo.container;

            setTimeout(function () {
                if (!formValid) {
                    return;
                }
                $.ajax({
                    type: "POST",
                    url: $form.attr("action"),
                    data: $form.serialize()
                }).done(function (response) {
                    if (response) {
                        if (response.success) {
                            var bootstrapModalBody = $(target).find(".modal .modal-body");
                            if (bootstrapModalBody.length > 0) {
                                target = bootstrapModalBody;
                            }
                            $(target).load(urlview, function () {
                                SmartOrderRefill.limitCharacters();
                            });
                            SmartOrderRefill.closeModal.call($container);
                        } else if ($("input[name$=\"_postal\"]:invalid").length) {
                            $("input[name$=\"_postal\"]").parent().append("<label class=\"error\">" + SmartOrderRefillSettings.Resources.INVALID_ZIP + "</label>");
                        }
                    } else {
                        alert(SmartOrderRefillSettings.Resources.SOR_ADDRESS_ERROR); // NOSONAR
                    }
                }).fail(function () {
                    alert(SmartOrderRefillSettings.Resources.SOR_UNEXPECTED_ERROR); // NOSONAR
                });
            }, 1000);
        },

        modifyRefillUpdate: function () {
            var url = $("#modify-smart-order-refill form").attr("action");
            var data = {
                hasSmartOrderRefill: $("[name=\"hasSmartOrderRefill\"]").filter(":checked").val(),
                everyDelivery: $("[name=\"everyDelivery\"]").val(),
                SorDeliveryWeekInterval: $("[name=\"SorDeliveryWeekInterval\"]").val(),
                SorDeliveryMonthInterval: $("[name=\"SorDeliveryMonthInterval\"]").val()
            };
            $.ajax({
                type: "POST",
                url: url,
                data: data,
                success: function (response) {
                    if (response && response.success) {
                        window.location = SmartOrderRefillSettings.Urls.cartShow;
                    } else {
                        SmartOrderRefill.initErrorModal((SmartOrderRefillSettings.Resources? SmartOrderRefillSettings.Resources.SOR_UNEXPECTED_ERROR : ''), false);
                    }
                }
            });
        }
    };


    // ******  OPTIONS  *******

    SmartOrderRefill.ModalOptions = {
        // initaddProductPDPView
        addProductPDPOptions: {
            autoOpen: true,
            bgiframe: true,
            title: (SmartOrderRefillSettings.Resources && SmartOrderRefillSettings.Resources.SOR_ADD_PRODUCT_TITLE)? SmartOrderRefillSettings.Resources.SOR_ADD_PRODUCT_TITLE : null,
            modal: true,
            emptyOnClose: false,
            width: "25rem",
            buttons: {
                SOR_GLOBAL_CANCEL: SmartOrderRefill.closeModal,
                SOR_GLOBAL_SAVE: SmartOrderRefill.ButtonFunctions.addProductFormPDPSave
            }
        },
        // initReactivateSubscriptionView
        reactivateSubscriptionOptions: {
            autoOpen: true,
            bgiframe: true,
            title: (SmartOrderRefillSettings.Resources && SmartOrderRefillSettings.Resources.SOR_REACTIVE_SUBSCRIPTION_TITLE)? SmartOrderRefillSettings.Resources.SOR_REACTIVE_SUBSCRIPTION_TITLE : null,
            modal: true,
            emptyOnClose: false,
            width: "25rem",
            buttons: {
                SOR_GLOBAL_CANCEL: SmartOrderRefill.closeModal,
                SOR_GLOBAL_SAVE: SmartOrderRefill.ButtonFunctions.reactivateSubscriptionSave
            }
        },

        // initReactivateOrderView
        reactivateOrderViewOptions: {
            autoOpen: true,
            bgiframe: true,
            title: (SmartOrderRefillSettings.Resources && SmartOrderRefillSettings.Resources.SOR_REACTIVE_ORDER_TITLE)? SmartOrderRefillSettings.Resources.SOR_REACTIVE_ORDER_TITLE : null,
            modal: true,
            emptyOnClose: false,
            width: "25rem",
            buttons: {
                SOR_GLOBAL_OK: SmartOrderRefill.ButtonFunctions.reactivateOrderViewOk
            }
        },

        // initUpdateCreditCardForm
        updateCreditCardFormOptions: {
            autoOpen: true,
            bgiframe: true,
            title: (SmartOrderRefillSettings.Resources && SmartOrderRefillSettings.Resources.SOR_UPDATE_CREDIT_CARD_TITLE)? SmartOrderRefillSettings.Resources.SOR_UPDATE_CREDIT_CARD_TITLE : null,
            modal: true,
            emptyOnClose: false,
            width: "37.5rem",
            buttons: {
                SOR_GLOBAL_CANCEL: SmartOrderRefill.closeModal,
                SOR_GLOBAL_SAVE: SmartOrderRefill.ButtonFunctions.updateCreditCardFormSave
            }
        },
        // initAddProduct
        addProductOptions: {
            autoOpen: true,
            bgiframe: true,
            title: (SmartOrderRefillSettings.Resources && SmartOrderRefillSettings.Resources.SOR_ADD_PRODUCT_TITLE)? SmartOrderRefillSettings.Resources.SOR_ADD_PRODUCT_TITLE : null,
            modal: true,
            emptyOnClose: false,
            width: "25rem",
            buttons: {
                SOR_GLOBAL_CANCEL: SmartOrderRefill.closeModal,
                SOR_GLOBAL_SAVE: SmartOrderRefill.ButtonFunctions.addProductFormSave
            }
        },
        // initChangeProductForm
        changeProductFormOptions: {
            autoOpen: true,
            bgiframe: true,
            modal: true,
            emptyOnClose: false,
            width: "25rem",
            title: "Change product",
            buttons: {
                SOR_GLOBAL_CANCEL: SmartOrderRefill.closeModal,
                SOR_GLOBAL_SAVE: SmartOrderRefill.ButtonFunctions.changeProductFormSave
            }
        },
        // initSubscriptionView
        subscriptionViewOptions: {
            autoOpen: true,
            modal: true,
            dialogClass: "smart-order-refill-modal",
            width: "43.75rem",
            title: (SmartOrderRefillSettings.Resources && SmartOrderRefillSettings.Resources.SOR_DIALOG_SUBSCRIPTION)? SmartOrderRefillSettings.Resources.SOR_DIALOG_SUBSCRIPTION : null,
            buttons: {
                SOR_GLOBAL_CLOSE: SmartOrderRefill.closeModal
            }
        },
        // initOrderView
        orderViewOptions: {
            draggable: false,
            resizable: false,
            dialogClass: "smart-order-refill-modal",
            autoOpen: true,
            modal: true,
            width: "43.75rem",
            title: (SmartOrderRefillSettings.Resources && SmartOrderRefillSettings.Resources.SOR_DIALOG_ORDER)? SmartOrderRefillSettings.Resources.SOR_DIALOG_ORDER : null,
            buttons: {
                SOR_GLOBAL_CLOSE: SmartOrderRefill.closeModal
            }
        },
        modifyRefillOptions: {
            draggable: false,
            resizable: false,
            dialogClass: "smart-order-refill-modal",
            modal: true,
            title: (SmartOrderRefillSettings.Resources && SmartOrderRefillSettings.Resources.SOR_MODIFY_SMART_ORDER_REFILL)? SmartOrderRefillSettings.Resources.SOR_MODIFY_SMART_ORDER_REFILL : null,
            width: "37.5rem",
            buttons: {
                SOR_GLOBAL_UPDATE: SmartOrderRefill.ButtonFunctions.modifyRefillUpdate
            }
        },
        // initAddressChangeForm
        addressChangeFormOptions: function (target, urlview, $container) {
            SmartOrderRefill.addressChangeInfo = {
                target: target,
                urlview: urlview,
                container: $container
            };
            return {
                autoOpen: true,
                bgiframe: true,
                modal: true,
                emptyOnClose: false,
                width: "25rem",
                title: "Change address",
                buttons: {
                    SOR_GLOBAL_CANCEL: SmartOrderRefill.closeModal,
                    SOR_GLOBAL_SAVE: SmartOrderRefill.ButtonFunctions.addressChangeFormSave
                }
            };
        },
        linkModelYes: function (url) {
            $.ajax({
                type: "GET",
                url: url,
                success: function (response) {
                    if (response && response.success) {
                        window.location = SmartOrderRefillSettings.Urls.manageOrders;
                    } else {
                        SmartOrderRefill.initErrorModal(SmartOrderRefillSettings.Resources.SOR_UNEXPECTED_ERROR, false);
                    }
                }
            });
            SmartOrderRefill.closeModal(this);
        }

    };


    SmartOrderRefill.initAccountSorView = function () {
        $(".show-hide-orders").each(function () {
            $(this).on("click", function () {
                $(this).closest(".subscriptionSection").find(".subscriptionOrders").slideToggle("slow");
            });
        });
    };
    
    
    SmartOrderRefill.initSkipNextShipment = function (){
    	$(document).on("click", "#skipnextshipment", function (e) {
    		e.preventDefault();
    		var url = $(this).attr("data-link");
    		
    		if (SitePreferences.MPARTICLE_ENABLED) {
        		var item = $(this).data('pid');
        		var frequency = $("#sorMonth-" + item).val();
        		mParticleAutoDeliveryAction('skip', item, frequency);
            }
        	
    		$.ajax({
                type: "GET",
                url: url,
                success: function (response) {
                    if (response) {
                        if (response.success) {
                            window.location = SmartOrderRefillSettings.Urls.manageOrders;
                        } else if (response.message) {
                            SmartOrderRefill.initErrorModal(response.message, true);
                        } else {
                        	window.location = SmartOrderRefillSettings.Urls.manageOrders;
                        }
                    }
                }
            });
    	});
    };
    
    SmartOrderRefill.cancelSubscription = function (){
    	$(document).on("click", "#cancelsubscription", function (e) {
    		e.preventDefault();
    		var SorCancellationReason = $("input[name='SORCancelReason']:checked").val();
    		if(SorCancellationReason === 'Other'){
                SorCancellationReason = $('#SORCancelReasonText-'+$(this).data('sid')).val().trim();
            }
            if(!SorCancellationReason || SorCancellationReason === ''){
                $('.warning-message').removeClass('display-none');
                return;
            }
    		var url = $(this).attr("data-link");
    		if (SitePreferences.MPARTICLE_ENABLED) {
        		var item = $(this).data('pid');
        		var frequency = $("#sorMonth-" + item).val();
        		var sorDetails = {};
        		sorDetails.customerNo = (profileData)? profileData.customerNo : '';
                sorDetails.sid = $(this).data('sid');
                sorDetails.orderId = $(this).data('order');
                sorDetails.cancelReason = SorCancellationReason;
        		mParticleAutoDeliveryAction('cancel subscription', item, frequency, sorDetails);
            }
    		$.ajax({
                type: "GET",
                url: url,
                data:{
                    sorCancellationReason:SorCancellationReason
                },
                success: function (response) {
                    if (response) {
                        $('.warning-message').addClass('display-none');
                        if (response.success) {
                            window.location = SmartOrderRefillSettings.Urls.manageOrders;
                        } else if (response.message) {
                            SmartOrderRefill.initErrorModal(response.message, true);
                        } else {
                        	window.location = SmartOrderRefillSettings.Urls.manageOrders;
                        }
                    }
                }
            });
    	});
    };

    /**
     * @private
     * @function
     * @description Binds events to the cart page (edit item's details, bonus item's actions, coupon code entry)
     */
    SmartOrderRefill.initialize = function () {
        SmartOrderRefill.initSubscriptionView();
        SmartOrderRefill.initOrderView();
        SmartOrderRefill.initAddressChangeForm();
        SmartOrderRefill.initCreditCardExpirationWarning();
        SmartOrderRefill.initChangeProductForm();
        SmartOrderRefill.initReactivateSubscriptionView();
        SmartOrderRefill.initReactivateOrderView();
        SmartOrderRefill.initUpdateProductQuantity();
        SmartOrderRefill.initRemoveProduct();
        SmartOrderRefill.initUpdateRefill();
        SmartOrderRefill.initModifyRefill();
        SmartOrderRefill.initRemoveRefill();
        SmartOrderRefill.initLoginFromCart();
        SmartOrderRefill.initLinkModel();

        SmartOrderRefill.initializePdp();
        SmartOrderRefill.initAccountSorView();
        SmartOrderRefill.initSkipNextShipment();
        SmartOrderRefill.cancelSubscription();
    };

    $(document).on('click', 'button[name="sorDelete"]', function(){
        var sid = $(this).attr('data-sid');
        $("input[name='SORCancelReason']").prop('checked', false);
        $('.warning-message').addClass('display-none');
        var sorCancellReasons = $('#sorCancelReasonArray').val();
        var shuffledReasons = shuffle(JSON.parse(sorCancellReasons));
        var count = 1;
        for (var i=0; i<shuffledReasons.length; i++){
            $('#SORCancelReason'+count+'-'+sid).val(shuffledReasons[i]);
            $('.sorReason'+count+'-'+sid).empty();
            $('.sorReason'+count+'-'+sid).text(shuffledReasons[i]);
            count = count + 1;
        }
        $('#SORCancelReason'+count+'-'+sid).val('Other');
        $('.sorReason'+count+'-'+sid).empty();
        $('.sorReason'+count+'-'+sid).text('Other');

    });

    $(document).ready(function () {
        SmartOrderRefill.initialize();
        if (typeof $.fn.dialog !== "undefined") {
            SmartOrderRefillSettings.ModalType = "dialog";
        } else if (typeof $.fn.modal !== "undefined") {
            SmartOrderRefillSettings.ModalType = "modal";
        }

        $(".sorlink.visually-hidden").removeClass("visually-hidden");
        
        //initializing date picker
        $('.modifydatepicker').each(function(){
        	var defDate = new Date($(this).val());
        	var maxDate = new Date(defDate);
        	$(this).datepicker({
        		dateFormat: 'mm/dd/yy',
        		showOtherMonths: true,
                minDate: 2,
                maxDate: new Date(maxDate.setDate(maxDate.getDate() + 120)),
                dayNamesMin: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                defaultDate: defDate,
                //beforeShowDay: noWeekendsOrHolidays
            });
        });

        $( ".cancellation-textbox" ).keypress(function(e) {
            var k = e.keyCode;
            if (!((k > 64 && k < 91) || (k > 96 && k < 123) || k == 8 || k == 32)) {
                e.preventDefault();
            }
        });

        window.SmartOrderRefill = SmartOrderRefill;
    });

    function shuffle(array) {
        var currentIndex =  (typeof array !== "undefined")? array.length-1 : 0 ,  randomIndex;

        // While there remain elements to shuffle...
        while (currentIndex != 0) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            // And swap it with the current element.
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
        }

        return array;
    }

    function mParticleAutoDeliveryAction(actionType,productID,frequency, sorDetails){
    	var data = {};
		data.actionType = actionType;
		if(frequency){
			data.frequency = frequency;
		}
		data.pageSource = 'auto delivery page';
		if(productID){
			data.productID = productID;
		}
		if(sorDetails){
            data.cancellationReason = sorDetails.cancelReason;
		    data.subscriptionID = sorDetails.sid;
		    data.orderID = sorDetails.orderId;
		    data.customerNo = sorDetails.customerNo;
        }
    	window.mPartcleLogEvent('Auto-Delivery Action', data, 'Auto-Delivery');
    }
}(window.jQuery));
