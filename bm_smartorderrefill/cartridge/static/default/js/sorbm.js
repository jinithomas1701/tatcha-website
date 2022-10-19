/* eslint-disable no-useless-concat */
/**
 *  Property of OSF Global Services, Inc., (with its brand OSF Commerce). OSF remains the sole owner of all right, title and interest in the software.
 *  Do not copy, sell, reverse engineer or otherwise attempt to derive or obtain information about the functioning, manufacture or operation therein.
 */
/* global $ */
"use strict";

/**
 * @description date parsing
 * @param {Object} element form element
 * @returns {Date} parsed date
 */
function getDate(element) {
    var dateFormat = "mm/dd/yy";
    var date;
    try {
        date = $.datepicker.parseDate(dateFormat, element.value);
    } catch (error) {
        date = null;
    }

    return date;
}
/**
 * @description unEscapeUrl replaces the "&amp;" from the url with "&"
 * @param {string} inputString input string
 * @returns {outputString} the string after it is replace on the url the "&amp;"
 */
function unEscapeUrl(inputString) {
    var outputString = inputString;
    outputString = outputString.replaceAll("&amp;", "&");
    return outputString;
}

/**
 * @description initializae date picker
 */
function initDatePicker() {
    var from = $("#date_from input")
        .datepicker({
            defaultDate: "+1w",
            changeMonth: true,
            changeYear: true,
            numberOfMonths: 1
        })
        .on("change", function () {
            to.datepicker("option", "minDate", getDate(this)); // eslint-disable-line
        });
    var to = $("#date_to input")
        .datepicker({
            defaultDate: "+1w",
            changeMonth: true,
            changeYear: true,
            numberOfMonths: 1
        })
        .on("change", function () {
            from.datepicker("option", "maxDate", getDate(this));
        });
}

/**
 * @description initialize events
 */
function initEvents() {
    $(".toggle-visibility").click(function () {
        $(".report_q_table").toggle("slow");
    });
}

/**
 * @description aligne search filter labels
 */
function alignFilterLabels() {
    var labelWidth = [];
    $(".sor-module__filter_table tr").each(function () {
        var $tds = $(this).find("td");
        $tds.each(function (index) {
            var $label = $(this).find("label");
            if ($label.length > 0 && ($label.width() > labelWidth[index] || typeof labelWidth[index] === "undefined")) {
                labelWidth[index] = $label.width();
            }
        });
    });
    $(".sor-module__filter_table tr").each(function () {
        var $tds = $(this).find("td");
        $tds.each(function (index) {
            $(this).find("label").width(labelWidth[index] + 5);
        });
    });
}

/**
 * @description build modal container
 * @param {string} body modal body
 * @param {string} id modal id
 * @returns {string} modal content
 */
function modalContainer(body, id) {
    var ID = id || "sorModal";
    var bootstrap = `<div class="modal fade" id="${ID}" tabindex="-1" role="dialog" aria-labelledby="sorModalTitle"
    aria-hidden="true" data-backdrop="static" data-keyboard="false">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
            </div>
            <div class="modal-body">
                ${body}
            </div>
      </div>
    </div>
  </div>`;
    return bootstrap;
}

/**
 * @description add product variants
 */
function addProductVariants() {
    $(document).on("click", "#dwfrm_addproductToBM_product", function (e) {
        e.preventDefault();
        var selectedProduct = $(this).children("option:selected").val().toString();
        var variations = $("#dwfrm_addproductToBM_variation").children("option");
        variations.show();
        for (var i = 0; i < variations.length; i++) {
            var variants = variations[i];
            var variant = $(variants).data("master").toString();
            if (selectedProduct !== variant) {
                $("#dwfrm_addproductToBM_variation").children("option[data-master=" + "\"" + variant + "\"" + "]").hide();
            }
            if (selectedProduct === variant) {
                $("#dwfrm_addproductToBM_variation").children("option").filter(function () {
                    return ($(this).data("master").toString() === selectedProduct);
                }).prop("selected", true);
            }
        }
    });
}

/**
 * @description add product periodicity and interval
 */
function addProductRefill() {
    var periods = $("#dwfrm_addproductToBM_periodicity").children("option");

    if (periods.length > 1) {
        $("#dwfrm_addproductToBM_interval").children("option").filter(function () {
            return ($(this).data("periodicity") !== "week");
        }).hide();
    }

    $(document).on("click", "#dwfrm_addproductToBM_periodicity", function (e) {
        e.preventDefault();
        var selectedPeriod = $(this).children("option:selected").val();
        var intervals = $("#dwfrm_addproductToBM_interval").children("option");
        intervals.show();
        for (var i = 0; i < intervals.length; i++) {
            var interval2 = intervals[i];
            var intervalPeriod = $(interval2).data("periodicity");
            if (selectedPeriod !== intervalPeriod) {
                $("#dwfrm_addproductToBM_interval").children("option[data-periodicity=" + "\"" + intervalPeriod + "\"" + "]").hide();
            }
        }
    });
}
/**
 * @description sor modal event handler function
 * @param {Object} e parameter url or event
 */
function sorModal(e) {
    var url;
    if (typeof e === "string") {
        url = e;
    } else {
        e.preventDefault();
        e.stopImmediatePropagation();
        url = $(this).data("link");
    }

    if (!$("#sorModal").length) {
        $("body").append(modalContainer(""));
    }

    $.get(url, function (data) {
        $("#sorModal .modal-body").html(data);
    });

    if ($("#sorModal.show").length === 0) {
        window.SorModal = $("#sorModal").modal("show");

        $("#sorModal").on("hidden.bs.modal", function () {
            if ($("body").hasClass("reloadPage")) {
                window.location.reload();
            }
        });
    }
}

/**
 * @description initialize sor modal events
 */
function initModal() {
    $(".memberSubscription").on("click", sorModal);
    $(".subscription-section .sor-table-order").on("click", sorModal);
    $(".back-from-fee").on("click", sorModal);
}

/**
 * @description confirmation modal builder
 * @param {string} title modal title
 * @param {string} body modal content
 * @param {string} yes yes button name
 * @param {string} no no button name
 * @param {Function} func callback function
 */
function confirmationModal(title, body, yes, no, func) {
    var header = `<h4 class="modal-title">${title}</h4>`;
    var yesButton = yes ? `<button type="button" class="btn-yes" id="confirm_yes">${yes}</button>` : "<input type=\"hidden\" value=\"true\">";
    var buttons =
        `<div class="modal-footer">
            ${yesButton}
            <button type="button" class="btn" data-dismiss="modal">${no}</button>
        </div>`;
    var modalHeader =
        `<div class="modal-header">
        </div>`;
    if (!$("#confirmModal").length) {
        $("body").append(modalContainer("", "confirmModal"));
        $("#confirmModal").addClass("confirm_alert");
        $("#confirmModal .modal-body").html(body);
        $("#confirmModal .modal-content").append(buttons);
        $("#confirmModal .modal-content .modal-header").prepend(header);
    } else {
        $("#confirmModal .modal-content").html(modalHeader);

        $("#confirmModal .modal-content .modal-header").prepend(header);
        $("#confirmModal .modal-content").append("<div class=\"modal-body\">" + body + "</div>");
        $("#confirmModal .modal-content").append(buttons);
    }

    if ($("#confirmModal.show").length === 0) {
        if (window.SorModal) {
            window.SorModal.modal("hide");
        }
        setTimeout(function () {
            $("#confirmModal").modal("show");
        }, 1000);
    }
    $("#confirm_yes").on("click", function () {
        $("#confirmModal").modal("hide");
        func();
    });

    $("#confirmModal").on("hidden.bs.modal", function () {
        window.SorModal.modal("show");
        $("body").addClass("modal-open");
    });
}
/**
 * @description initialize submit commitment fee event
 */
function commitmentFeeSubmit() {
    $("#confirm_fee").on("click", function () {
        var fee = $(this).parents("form").first().find("#dwfrm_cancelationfee_fee")
        .val();
        var url = $(this).data("link");
        url = url + "&dwfrm_cancelationfee_fee=" + fee;
        url += "&dwfrm_cancelationfee_save=true";
        $.get(url, function (res) {
            if (res.reloadUrl) {
                $.get(unEscapeUrl(res.reloadUrl), function (subsData) {
                    $("#sorModal .modal-body").html(subsData);
                });
            } else {
                window.location.reload();
            }
        });
    });
}
/**
 * @description initialize reactivate renewal event
 */
function reactivateRenewal() {
    $(".reactivate.renewal").on("click", function () {
        var url = $(this).data("link");
        $.get(url, function (res) {
            $.get(unEscapeUrl(res.reloadUrl), function (data) {
                $("#sorModal .modal-body").html(data);
            });
        });
    });
}

/**
 * @description initialize cancel renewal event
 */
function cancelRenewal() {
    $(".cancel.renewal").on("click", function () {
        var url = $(this).data("link");
        /**
         * @description cancel renewal modal callback
         */
        function cancelRen() {
            $.get(url, function (res) {
                $.get(unEscapeUrl(res.reloadUrl), function (data) {
                    $("#sorModal .modal-body").html(data);
                });
            });
        }
        confirmationModal(window.sor_resources.cancelRenewal_header, window.sor_resources.cancelRenewal_message, window.sor_resources.yes, window.sor_resources.no, cancelRen);
    });
}

/**
 * @description initialize pause subscription event
 */
function pauseSubscription() {
    $(".pause.subscription").on("click", function () {
        var url = $(this).data("link");
        /**
         * @description pause subscription modal callback
         */
        function pauseSubs() {
            $.get(url, function (res) {
                $.get(unEscapeUrl(res.reloadUrl), function (data) {
                    $("#sorModal .modal-body").html(data);
                });
            });
        }
        confirmationModal(window.sor_resources.pause_subscription_header, window.sor_resources.pause_subscription_message, window.sor_resources.yes, window.sor_resources.no, pauseSubs);
    });
}

/**
 * @description initialize reactivate subscription  event
 */
function reactivateSubscription() {
    $(".reactivate.subscription").on("click", function () {
        var url = $(this).data("link");
        /**
         * @description reactivate subscription modal callback
         */
        function reactivateSubs() {
            var action = $("#reactivatePeriodForm").data("link");
            $.ajax({
                type: "POST",
                url: action,
                data: $(this).serialize(),
                success: function (res) {
                    $.get(unEscapeUrl(res.reloadUrl), function (page) {
                        $("#sorModal .modal-body").html(page);
                    });
                }
            });
        }
        $.get(url, function (body) {
            confirmationModal(window.sor_resources.reactivate_subscription_header, body, window.sor_resources.save, window.sor_resources.cancel, reactivateSubs);
        });
    });
}

/**
 * @description initialize pause order event
 */
function pauseOrder() {
    $(".order.pause").on("click", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var url = $(this).data("link");
        var reloadUrl = $(this).data("reload");
        /**
         * @description pause order modal callback
         */
        function pause() {
            $.get(url, function () {
                $.get(unEscapeUrl(reloadUrl), function (data) {
                    $("#sorModal .modal-body").html(data);
                    $("body").addClass("reloadPage");
                });
            });
        }
        confirmationModal(window.sor_resources.pause_order_header, window.sor_resources.pause_order_message, window.sor_resources.yes, window.sor_resources.no, pause);
    });
}

/**
 * @description initialize reactivate order event
 */
function reactivateORder() {
    $(".order.reactivate").on("click", function () {
        var url = $(this).data("link");
        var reloadUrl = $(this).data("reload");
        $.get(url, function () {
            $.get(unEscapeUrl(reloadUrl), function (data) {
                $("#sorModal .modal-body").html(data);
                $("body").addClass("reloadPage");
            });
        });
    });
}
/**
 * @description initialize close event
 */
function closeModal() {
    $(".order.closeOrder").on("click", function (e) {
        e.preventDefault();
        $.ajax({
            type: "POST",
            success: function () {
                window.location.reload();
            }
        });
    });

    $(".closeSubscription").on("click", function (e) {
        e.preventDefault();
        $.ajax({
            type: "POST",
            success: function () {
                window.location.reload();
            }
        });
    });
}

/**
 * @description initialize skip order event
 */
function skipOrder() {
    $(".button.order.skip").on("click", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var url = $(this).data("link");
        /**
         * @description skip order modal callback
         */
        function skip() {
            $.get(url, function (res) {
                if (res.reloadUrl) {
                    $.get(unEscapeUrl(res.reloadUrl), function (data) {
                        $("#sorModal .modal-body").html(data);
                        commitmentFeeSubmit();
                    });
                } else {
                    window.location.reload();
                }
            });
        }
        var isLast = $(this).data("last");
        if (isLast <= 1) {
            confirmationModal(window.sor_resources.skip_order_header, window.sor_resources.skip_order_lastorder, "", window.sor_resources.ok, skip);
        } else {
            confirmationModal(window.sor_resources.skip_order_header, window.sor_resources.skip_order_message, window.sor_resources.yes, window.sor_resources.no, skip);
        }
    });
}
/**
 * @description initialize cancel subscription event
 */
function cancelSubscription() {
    $(".button.cancel.subscription").on("click", function (e) {
        e.preventDefault();
        var url = $(this).data("link");
        /**
         * @description skip order modal callback
         */
        function cancel() {
            $.get(url, function (res) {
                if (res.reloadUrl) {
                    $.get(unEscapeUrl(res.reloadUrl), function (data) {
                        $("#sorModal .modal-body").html(data);
                        $(".cancelationfeeclose-btn").on("click", function () {
                            $.ajax({
                                type: "POST",
                                success: function () {
                                    window.location.reload();
                                }
                            });
                        });
                        commitmentFeeSubmit();
                    });
                }
            });
        }
        confirmationModal(window.sor_resources.cancel_subscription_header, window.sor_resources.cancel_subscription_message, window.sor_resources.yes, window.sor_resources.no, cancel);
    });
}


/**
 * @description initialize remove product event
 */
function removeProduct() {
    $("#subscription-details .remove_product .button").on("click", function (e) {
        e.preventDefault();
        var url = $(this).data("link");
        e.stopImmediatePropagation();
        /**
         * @description skip remove product callback
         */
        function remove() {
            $.get(url, function (res) {
                if (res.reloadUrl) {
                    $.get(unEscapeUrl(res.reloadUrl), function (data) {
                        if (res.commitment === true) {
                            $("body").append(modalContainer(data));
                            $("#sorModal").modal("show");
                            $(".cancelationfeeclose-btn").on("click", function () {
                                $.ajax({
                                    type: "POST",
                                    success: function () {
                                        window.location.reload();
                                    }
                                });
                            });
                            commitmentFeeSubmit();
                        } else {
                            window.location.reload();
                        }
                    });
                } else {
                    window.location.reload();
                }
            });
        }
        confirmationModal(window.sor_resources.removeProd_header, window.sor_resources.removeProd_message, window.sor_resources.yes, window.sor_resources.no, remove);
    });
}

/**
 * @description initialize add product event
 */
function addProduct() {
    $(".btnadd").on("click", function () {
        var url = $(this).attr("data-link");
        /**
         * @description skip add product callback
         */
        function add() {
            var form = $("#addProductToBMForm");
            $.ajax({
                type: "POST",
                url: form.attr("action"),
                data: form.serialize(),
                success: function (data) {
                    $("body").append(modalContainer(data));
                    $("#sorModal").modal("show");
                    $("button").css({ display: "none" });
                    addProductVariants();
                    addProductRefill();
                    $("#dwfrm_addproductToBM_product").trigger("click");
                }
            });
        }
        $.get(url, function (body) {
            confirmationModal(window.sor_resources.addproduct_header, body, window.sor_resources.save, window.sor_resources.cancel, add);
        });
    });

    $(document).on("click", "#addPButton", function (e) {
        e.preventDefault();
        var pid = $("#dwfrm_addproductToBM_variation").val();
        var periodicity = $("#dwfrm_addproductToBM_periodicity").val();
        var interval = $("#dwfrm_addproductToBM_interval").val();
        var quantity = $("#dwfrm_addproductToBM_quantity").val();
        var product = $("#dwfrm_addproductToBM_product").val();
        var url = $(this).attr("href");
        $.ajax({
            type: "POST",
            url: url,
            data: {
                pid: pid,
                periodicity: periodicity,
                interval: interval,
                quantity: quantity,
                product: product
            },
            success: function () {
                window.location.reload();
            }
        });
    });

    $(document).on("click", "#cancelButton", function (e) {
        e.preventDefault();
        $.ajax({
            type: "POST",
            success: function () {
                window.location.reload();
            }
        });
    });
}

/**
 * @description initialize redirect to details event
 */
function redirectToDetails() {
    $(".orderSummary, .subscriptionSummary").on("click", function () {
        window.location.replace($(this).data("link"));
    });
}

/**
 * @description update reports table
 */
function change() {
    $(".sor-filter-checkbox .form-row").each(function () {
        var label = $(this).children()[0];
        var input = $(this).children()[1];
        $(this).html(input).append(label);
    });

    var tableWidth = $(".report_table_container").width();
    $(".report_table_container+table").width(tableWidth);
}

/**
 * @description initialize form reset event
 */
function resetOrderSummaryForm() {
    $("#reset-button").on("click", function () {
        $("#ordersummary-form input[type=text]").each(function () {
            $(this).val("");
        });
        $("#ordersummary-form input[type=checkbox]").each(function () {
            $(this).prop("checked", false);
        });
    });
}

/**
 * @description initialize show details event
 */
function detailsRoute() {
    $("#subscription-details-nav span").on("click", function () {
        var customClass = this.classList[0];
        $("#subscription-details-nav span").each(function () {
            if ($(this).hasClass("selected")) {
                $(this).removeClass("selected");
            }
        });

        $(this).addClass("selected");
        $("#subscription-details .order-section").each(function (key, val) {
            if (!($(val).hasClass("visualy-hidden")) && !($(val).hasClass(customClass))) {
                $(val).addClass("visualy-hidden");
            }
            if ($(val).hasClass(customClass)) {
                $(val).removeClass("visualy-hidden");
            }
        });
    });
}

/**
 * @description filter product varian
 */
function filterProductVariants() {
    var selectedProductID = $("input[name=\"selectedProductID\"").val();
    var selectedVariationID = $("input[name=\"selectedVariationID\"").val();

    $("#dwfrm_editproduct_product").children("option").filter(function () {
        return ($(this).val() === selectedProductID);
    }).prop("selected", true);

    $("#dwfrm_editproduct_variation").children("option").filter(function () {
        return ($(this).val() === selectedVariationID);
    }).prop("selected", true);

    $("#dwfrm_editproduct_variation").children("option").filter(function () {
        return ($(this).data("master") !== selectedProductID);
    }).hide();

    $("#dwfrm_editproduct_product").on("change", function () {
        var selectedProduct = $(this).children("option:selected").val();
        var variations = $("#dwfrm_editproduct_variation").children("option");
        variations.show();
        for (var i = 0; i < variations.length; i++) {
            var variants = variations[i];
            var variant = $(variants).data("master");
            if (selectedProduct !== variant) {
                $("#dwfrm_editproduct_variation").children("option[data-master=" + "\"" + variant + "\"" + "]").hide();
            }
            if (selectedProduct === variant) {
                $("#dwfrm_editproduct_variation").children("option").filter(function () {
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
    var periodicity = $("input[name=\"selectedPeriodicity\"").val();
    var interval = $("input[name=\"selectedInterval\"").val();
    var periods = $("#dwfrm_editproduct_periodicity").children("option");

    $("#dwfrm_editproduct_periodicity").children("option").filter(function () {
        return ($(this).val() === periodicity);
    }).prop("selected", true);

    $("#dwfrm_editproduct_interval").children("option").filter(function () {
        return ($(this).val() === interval);
    }).prop("selected", true);

    if (periods.length > 1) {
        $("#dwfrm_editproduct_interval").children("option").filter(function () {
            return ($(this).data("periodicity") !== periodicity);
        }).hide();
    }

    $("#dwfrm_editproduct_periodicity").on("change", function () {
        var selectedPeriod = $(this).children("option:selected").val();
        var intervals = $("#dwfrm_editproduct_interval").children("option");
        intervals.show();
        for (var i = 0; i < intervals.length; i++) {
            var interval2 = intervals[i];
            var intervalPeriod = $(interval2).data("periodicity");
            if (selectedPeriod !== intervalPeriod) {
                $("#dwfrm_editproduct_interval").children("option[data-periodicity=" + "\"" + intervalPeriod + "\"" + "]").hide();
            }
        }
    });
}


$(document).ready(function () {
    initDatePicker();
    initEvents();
    alignFilterLabels();
    change();
    detailsRoute();
    resetOrderSummaryForm();
    initModal();
    skipOrder();
    pauseOrder();
    removeProduct();
    reactivateORder();
    cancelSubscription();
    reactivateSubscription();
    pauseSubscription();
    redirectToDetails();
    cancelRenewal();
    reactivateRenewal();
    filterProductVariants();
    filterProductRefill();
    addProduct();
    closeModal();
});
