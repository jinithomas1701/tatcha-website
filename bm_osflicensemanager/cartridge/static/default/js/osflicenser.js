/* eslint-disable no-alert */

"use strict";

/* global jQuery */
jQuery(document).ready(function () {
    var $errorMessage = jQuery("#errorMessage");
    var $loader = jQuery(".loader-wrapper");

    /**
     *
     * @param {string} activationKey activationKey
     * @param {string} email email
     * @returns {boolean} validation status
     */
    function validateSoracoInformation(activationKey, email) {
        var emailRegExp = new RegExp(/^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(\.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/);
        var keyRegExp = new RegExp(/^[a-zA-Z0-9-]{1,}$/);
        var validated = false;

        if (!emailRegExp.test(email)) {
            alert("Please provide a valid email address!"); // NOSONAR
        } else if (!keyRegExp.test(activationKey)) {
            alert("Please provide a valid activation key!"); // NOSONAR
        } else {
            validated = true;
        }

        return validated;
    }

    var executeRequest = function (input, url) {
        $loader.addClass("show");
        jQuery.ajax({
            contentType: "application/json",
            data: JSON.stringify(input),
            type: "POST",
            url: url,
            success: function () {
                window.location.reload(true);
            },
            error: function () {
                $loader.removeClass("show");
                alert($errorMessage.val()); // NOSONAR
            }
        });
    };

    jQuery(document).on("click", ".license-save", function (e) {
        e.preventDefault();

        var $this = jQuery(this);
        var $organizationID = $this.parents(".license").find(".license-organization");
        var $productCode = $this.parents(".license").find(".old_product_list");
        var $productName = $this.parents(".license").find(".old_product_list :selected");
        var $securityToken = $this.parents(".license").find(".license-token");

        executeRequest({
            organizationID: $organizationID.val(),
            productCode: $productCode.val(),
            productName: $productName.text(),
            securityToken: $securityToken.val()
        }, $this.attr("data-action"));
    });

    jQuery(document).on("click", ".license-update", function (e) {
        e.preventDefault();

        var $this = jQuery(this);
        var $organizationID = $this.parents(".license").find(".license-organization");
        var $productName = $this.parents(".license").find(".license-name");
        var $productCode = $this.parents(".license").find(".license-product");
        var $securityToken = $this.parents(".license").find(".license-token");
        var $licenseUniqueID = $this.parents(".license").find(".license-unique-id");
        var $expiryDate = $this.parents(".license").find(".license-activationdate");

        executeRequest({
            organizationID: $organizationID.val(),
            productName: $productName.val(),
            productCode: $productCode.val(),
            securityToken: $securityToken.val(),
            licenseUniqueID: $licenseUniqueID.val(),
            expiryDate: $expiryDate.val(),
            action: "update"
        }, $this.attr("data-action"));
    });

    jQuery(document).on("click", ".license-upgrade", function (e) {
        e.preventDefault();

        var $this = jQuery(this);
        var $productName = $this.parents(".license").find(".license-product");
        var $activationKey = $this.parents(".license").find(".license-activation-key");
        var $email = $this.parents(".license").find(".license-email");
        var $licenseUniqueID = $this.parents(".license").find(".license-unique-id");

        if (validateSoracoInformation($activationKey.val(), $email.val())) {
            executeRequest({
                productName: $productName.val(),
                activationKey: $activationKey.val(),
                email: $email.val(),
                pcID: $email.val(),
                licenseUniqueID: $licenseUniqueID.val(),
                action: "upgrade"
            }, $this.attr("data-action"));
        }
    });

    jQuery(document).on("click", ".license-remove", function (e) {
        e.preventDefault();
        var $this = jQuery(this);
        var $licenseUniqueID = $this.parents(".license").find(".license-unique-id");

        executeRequest({ licenseUniqueID: $licenseUniqueID.val() }, $this.attr("data-action"));
    });

    jQuery(document).on("click", ".soraco-license-save", function (e) {
        e.preventDefault();

        var $this = jQuery(this);
        var $productID = $this.parents(".license").find(".soraco_product_list");
        var $productName = $this.parents(".license").find(".soraco_product_list :selected");
        var $activationKey = $this.parents(".license").find(".license-activation-key");
        var $email = $this.parents(".license").find(".license-email");

        if (validateSoracoInformation($activationKey.val(), $email.val())) {
            executeRequest({
                productName: $productName.text(),
                productID: $productID.val(),
                activationKey: $activationKey.val(),
                email: $email.val(),
                pcID: $email.val()
            }, $this.attr("data-action"));
        }
    });

    jQuery(document).on("click", ".soraco-license-update", function (e) {
        e.preventDefault();

        var $this = jQuery(this);
        var $productID = $this.parents(".license").find(".product-unique-id");
        var $productName = $this.parents(".license").find(".license-name");
        var $productCode = $this.parents(".license").find(".product-code");
        var $activationKey = $this.parents(".license").find(".license-activation-key");
        var $email = $this.parents(".license").find(".license-email");
        var $expiryDate = $this.parents(".license").find(".license-expirydate");
        var $licenseUniqueID = $this.parents(".license").find(".license-unique-id");

        if (validateSoracoInformation($activationKey.val(), $email.val())) {
            executeRequest({
                productID: $productID.val(),
                productCode: $productCode.val(),
                productName: $productName.val(),
                activationKey: $activationKey.val(),
                email: $email.val(),
                pcID: $email.val(),
                expiryDate: $expiryDate.val(),
                licenseUniqueID: $licenseUniqueID.val(),
                action: "update"
            }, $this.attr("data-action"));
        }
    });

    jQuery(document).on("click", ".btn-cancel", function () {
        jQuery(this).closest(".ui-dialog-content").dialog("close");
    });

    jQuery(".soraco-update").on("click", function () {
        var $this = jQuery(this);

        var $dialog = $this.parents("section").find(".js-soraco-license").clone();
        var $licenseUniqueID = $this.parents(".license").find(".license-unique-id");
        var $productName = $this.parents(".license").find(".license-name");

        $dialog.dialog({
            dialogClass: "soraco-update-dialog",
            closeOnBlur: true,
            resizable: false,
            draggable: false,
            width: "600",
            modal: true,
            close: function () {
                $dialog.remove();
            }
        });

        $dialog.dialog("open");

        jQuery(".license-name-upgrade").last().val($productName.val());
        jQuery(".license-id-upgrade").last().val($licenseUniqueID.val());
    });

    jQuery(".js-add-license button").on("click", function () {
        var $dialog = jQuery(this).parents("section").find(".js-osf-license").clone();

        $dialog.dialog({
            dialogClass: "add-license-dialog",
            closeOnBlur: true,
            resizable: false,
            draggable: false,
            width: "600",
            modal: true,
            close: function () {
                $dialog.remove();
            }
        });

        $dialog.dialog("open");
    });

    jQuery(".legacy-update-dialog").on("click", function () {
        var $this = jQuery(this);
        var $organizationID = $this.parents(".license").find(".license-organization");
        var $productName = $this.parents(".license").find(".license-name");
        var $productCode = $this.parents(".license").find(".license-product");
        var $securityToken = $this.parents(".license").find(".license-token");
        var $licenseUniqueID = $this.parents(".license").find(".license-unique-id");
        var $expiryDate = $this.parents(".license").find(".license-activationdate");

        var $dialog = $this.parents("section").find(".confirm-save-dialog").clone();

        $dialog.dialog({
            dialogClass: "add-license-dialog",
            closeOnBlur: true,
            resizable: false,
            draggable: false,
            width: "600",
            modal: true,
            close: function () {
                $dialog.remove();
            }
        });

        jQuery(".license-name").last().val($productName.val());
        jQuery(".license-product").last().val($productCode.val());
        jQuery(".license-unique-id").last().val($licenseUniqueID.val());
        jQuery(".license-organization").last().val($organizationID.val());
        jQuery(".license-token").last().val($securityToken.val());
        jQuery(".license-activationdate").last().val($expiryDate.text());
    });

    jQuery(".soraco-update-dialog").on("click", function () {
        var $this = jQuery(this);
        var $productID = $this.parents(".license").find(".product-unique-id");
        var $productName = $this.parents(".license").find(".license-name");
        var $activationKey = $this.parents(".license").find(".license-activation-key");
        var $email = $this.parents(".license").find(".license-email");
        var $expiryDate = $this.parents(".license").find(".license-expirydate");
        var $licenseUniqueID = $this.parents(".license").find(".license-unique-id");

        var $dialog = $this.parents("section").find(".confirm-save-dialog").clone();

        $dialog.dialog({
            dialogClass: "add-license-dialog",
            closeOnBlur: true,
            resizable: false,
            draggable: false,
            width: "600",
            modal: true,
            close: function () {
                $dialog.remove();
            }
        });

        jQuery(".license-name").last().val($productName.val());
        jQuery(".product-unique-id").last().val($productID.val());
        jQuery(".license-unique-id").last().val($licenseUniqueID.val());
        jQuery(".license-activation-key").last().val($activationKey.val());
        jQuery(".license-email").last().val($email.val());
        jQuery(".license-expirydate").last().val($expiryDate.text());
    });

    jQuery(".license-remove-dialog").on("click", function () {
        var $this = jQuery(this);

        var $dialog = $this.parents("section").find(".confirm-delete-dialog").clone();
        var $licenseUniqueID = $this.parents(".license").find(".license-unique-id");

        $dialog.dialog({
            dialogClass: "add-license-dialog",
            closeOnBlur: true,
            resizable: false,
            draggable: false,
            width: "600",
            modal: true,
            close: function () {
                $dialog.remove();
            }
        });

        jQuery(".license-unique-id").last().val($licenseUniqueID.val());
    });
});

// fixes the issue with BM Extender select2 element not working
jQuery(window).load(function () {
    if (typeof jQuery.fn.select2 === "function") {
        jQuery(".new-license select.soraco_product_list").select2("destroy");
    }
});
