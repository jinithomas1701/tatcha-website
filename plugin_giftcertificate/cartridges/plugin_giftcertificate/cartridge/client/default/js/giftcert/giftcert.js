'use strict';
/* global $ */
var formValidation = require('base/components/formValidation');
var minicart = require("customBase/minicart");

var giftCard;

/**
* Updates the Mini-Cart quantity value after the customer has pressed the "Add to Cart" button
* @param {string} response - ajax response from clicking the add to cart button
*/
function handlePostCartAdd (response) {
    var pid = $('[data-giftcard-detail="product"]').val();
    minicart.showAddToBagModal(response, pid);
};

/**
 * Used to initiate ajax call and update the form
 * @param {Object} form - gift certificate form
 * @param {boolean} isUpdate - boolean value to check if it is update action
 * @return {boolean} false
 */

function updateGiftCertForm (form, isUpdate) {
    $.ajax({
        url: form.attr('action'),
        type: 'post',
        data: form.serialize(),
        success: function (data, status, xhr) {
            var ct = xhr.getResponseHeader("content-type") || "";
            if (ct.indexOf('html') > -1) {                
                handlePostCartAdd(data);
            }
            if (ct.indexOf('json') > -1) {
                if (!data.success) {
                    giftCard.removeCTALoader();
                    formValidation(form, data);
                }
            }
        },
        error: function (err) {
            giftCard.removeCTALoader();
            console.log(err)
        }
    });
    return false;
};

giftCard = {
    $dateInput: $('[data-giftcard-detail="date-input"]'),
    $dateLabel: $('[data-giftcard-detail="date-label"]'),
    $addToBagCta: $('[data-giftcard-detail="addToBag"]'),
    $amountList: $('[data-giftcard-detail="amount-list"]'),
    $amountValue: $('[data-giftcard-detail="amount-value"]'),
    $amountValueInput: $('[data-giftcard-detail="amount-value-input"]'),
    $form: $('[data-giftcard-detail="form"]'),
    $dropdown: $('[data-giftcard-detail="dropdown"]'),
    amountDropdown: function () {
        this.$amountList.click(function(){
            giftCard.$amountValue.text($(this).text());
            giftCard.$amountValueInput.val($(this).attr('data-amount'));
            var mparticleInfo = giftCard.$addToBagCta.attr("data-product-info");
            if(mparticleInfo){
                var mparticleData = JSON.parse(mparticleInfo);
                mparticleData.price = $(this).attr('data-amount');
                var updatedMparticle = JSON.stringify(mparticleData);
                giftCard.$addToBagCta.attr("data-product-info",updatedMparticle);
            }
        });
    },
    dateInputCurrentDate: function () {  
        var todayDate = new Date().toISOString().split("T")[0]
        this.$dateInput.val(todayDate).attr('min', todayDate)
        giftCard.formatDate();
    },
    dateInputOnChanage: function () {
        this.$dateInput.on('change', function () {
            !$(this).val() ? giftCard.dateInputCurrentDate() : giftCard.formatDate()
        })
    },
    formatDate: function () {	  
        var date = this.$dateInput.val().split('-');
        date = `${date[1]}/${date[2]}/${date[0].slice(2,4)}`;
        this.$dateLabel.html(date);
    },
    addToBasket: function () {
        this.$form.submit(function (e) {
			e.preventDefault();
            if($(this).valid()) {
                giftCard.$addToBagCta.addClass('btn-loading').prop('disabled', true);
			    updateGiftCertForm($(this));
            }
		});
    },
    afterAddtoBag: function() {
        $('body').on('product:afterAddToCart', function(){
            giftCard.$amountValue.text(giftCard.$dropdown.attr('data-default-amount-w-c'));
            giftCard.$amountValueInput.val(giftCard.$dropdown.attr('data-default-amount'));
            giftCard.$form[0].reset();
            giftCard.removeCTALoader();
            giftCard.dateInputCurrentDate()
        })
    },
    removeCTALoader: function () {
        giftCard.$addToBagCta.removeClass('btn-loading').prop('disabled', false)
    }
};

module.exports = giftCard;
