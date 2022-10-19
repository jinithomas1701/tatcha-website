'use strict';

var naPhone = /^[\+]?1?[\s-]?\(?([2-9][0-9][0-9])\)?[\-\. ]?([0-9][0-9]{2})[\-\. ]?([0-9]{4})(\s*x[0-9]+)?$/;
var regex = {
    phone: {
        us: naPhone,
        ca: naPhone
    },
    postal: {
        us: /^\d{5}(?:[-\s]\d{4})?$/,
        //ca: /^[ABCEGHJKLMNPRSTVXY]{1}\d{1}[A-Z]{1} *\d{1}[A-Z]{1}\d{1}$/,
        ca: /^[ABCEGHJKLMNPRSTVXY]{1}\d{1}[A-Z]{1} *(?:\d{1}[A-Z]{1}\d{1})?$/,
        //fr: /^(F-)?((2[A|B])|[0-9]{2})[0-9]{3}$/,
        //it: /^([0-9]){5}$/,
        //jp: /^([0-9]){3}[-]([0-9]){4}$/,
        //cn: /^([0-9]){6}$/,
        //gb: /^([A-PR-UWYZ0-9][A-HK-Y0-9][AEHMNPRTVXY0-9]?[ABEHMNPRVWXY0-9]? {1,2}[0-9][ABD-HJLN-UW-Z]{2}|GIR 0AA)$/
    },
    notCC: /^(?!(([0-9 -]){13,19})).*$/,
    alphanumeric: /^[a-zA-Z0-9.,\s]+$/,
    email: /^[\w.%+-]+@[\w.-]+\.[\w]{2,6}$/,
    nonEnglishChars: /^[\x20-\x7E]*$/,
    emptyPassword: /^\s*$/,
    userName: /^[a-zA-Z.\s]+$/
};
// global form validator settings
var settings = {
    errorClass: 'help-block',
    errorElement: 'span',
    onkeyup: false,
    onfocusout: function (element) {
        if (!this.checkable(element) && $(element).attr('id') != 'dwfrm_profile_customer_birthday') {
            this.element(element);
        }
    },
    highlight: function(element) {
        $(element).parents('.form-group').addClass("has-error");
        $(element).parents('.form-group').find('.form-caption').hide();
    },
    unhighlight: function(element) {
        $(element).parents('.form-group').removeClass("has-error");
    },
    ignore: ".ignore"
};
/**
 * @function
 * @description Validates a given phone number against the countries phone regex
 * @param {String} value The phone number which will be validated
 * @param {String} el The input field
 */
var validatePhone = function (value, el) {
    var country = $(el).closest('form').find('.country');
    if (country.length === 0 || country.val().length === 0 || !regex.phone[country.val().toLowerCase()]) {
        return true;
    }

    var rgx = regex.phone[country.val().toLowerCase()];
    var isOptional = this.optional(el);
    var isValid = rgx.test($.trim(value));

    return isOptional || isValid;
};


var validateZipCode = function (value, el) {
    var country = $(el).closest('form').find('.country');
    if (country.length === 0 || country.val().length === 0 || !regex.postal[country.val().toLowerCase()]) {
        return true;
    }

    var rgx = regex.postal[country.val().toLowerCase()];
    var isOptional = this.optional(el);
    var isValid = rgx.test($.trim(value));

    return isOptional || isValid;
};

var validateFnameLname = function (value, el) {
    var isValid = regex.userName.test($.trim(value));
    return  isValid;
};
/**
 * @function
 * @description Validates for a given input for non English characters to prevent 
 * 				Shipping Label printing issues.
 * @param {String} value The owner field which will be validated
 * @param {String} el The input field
 */
var validateForNonEnglishChars = function (value, el) {
    var isValid = regex.nonEnglishChars.test($.trim(value));
    return isValid;
};

/**
 * @function
 * @description Validates that a credit card owner is not a Credit card number
 * @param {String} value The owner field which will be validated
 * @param {String} el The input field
 */
var validateOwner = function (value) {
    var isValid = regex.notCC.test($.trim(value));
    return isValid;
};

/**
 * Add phone validation method to jQuery validation plugin.
 * Text fields must have 'phone' css class to be validated as phone
 */
$.validator.addMethod('phone', validatePhone, Resources.INVALID_PHONE);

/**
 * Add phone validation method to jQuery validation plugin.
 * Text fields must have 'phone' css class to be validated as phone
 */
$.validator.addMethod('validatepostal', validateZipCode, Resources.INVALID_POSTALCODE);

/**
 * Add phone validation method to jQuery validation plugin.
 * Text fields must have 'phone' css class to be validated as phone
 */
$.validator.addMethod('validateForNonEnglishChars', validateForNonEnglishChars, Resources.VALIDATE_INTERNATIONAL_ADDRESS);

/*Validate first & last name for number & symbols*/
$.validator.addMethod('validateName', validateFnameLname, Resources.VALIDATE_CUSTOMER_NAME);

/**
 * Add CCOwner validation method to jQuery validation plugin.
 * Text fields must have 'owner' css class to be validated as not a credit card
 */
$.validator.addMethod('owner', validateOwner, Resources.INVALID_OWNER);

/**
 * Add gift cert amount validation method to jQuery validation plugin.
 * Text fields must have 'gift-cert-amont' css class to be validated
 */
$.validator.addMethod('gift-cert-amount', function (value, el) {
    var isOptional = this.optional(el);
    var isValid = (!isNaN(value)) && (parseFloat(value) >= 5) && (parseFloat(value) <= 5000);
    return isOptional || isValid;
}, Resources.GIFT_CERT_AMOUNT_INVALID);

/**
 * Add positive number validation method to jQuery validation plugin.
 * Text fields must have 'positivenumber' css class to be validated as positivenumber
 */
$.validator.addMethod('positivenumber', function (value) {
    if ($.trim(value).length === 0) { return true; }
    return (!isNaN(value) && Number(value) >= 0);
}, ''); // '' should be replaced with error message if needed

/**
 * Add email validation method to jQuery validation plugin.
 * Text fields must have 'email' css class to be validated as email
 */
$.validator.addMethod('email', function (value,el) {
	var isValid = regex.email.test($.trim(value));
	if($(el).hasClass('mailing-list') && isValid ===false ){
		$('form.mailing-list').find('.help-block').remove();
		$('form.mailing-list .input-group').after('<span id="-error" class="help-block" style="display: inline;">'+Resources.VALIDATE_EMAIL+'</span>')
	}
	else{
		$('form.mailing-list').find('.help-block').remove();
	}
	
    return isValid;
    
}, Resources.VALIDATE_EMAIL);


/**
 * Add password empty validation to jQuery validation plugin
 * Text fields must have 'password_msg' css class to be validated as password
 */
$.validator.addMethod('password_msg', function (value) {
	var isValid = !(regex.emptyPassword.test($.trim(value)));
    return isValid;
}, Resources.VALIDATE_PASSWORD);

var maxLengthValidation = function(event){
	var max = parseInt($(event.target).attr("maxlength"));
    if ($(event.target).val().length > max) {
    		$(event.target).val($(event.target).val().substr(0, max));
    }
}

//Custom Validation functions
/**
 * Add past date validation method to jQuery validation plugin.
 * Text fields must have 'past-date' css class to be validated
 */
$.validator.addMethod('pastdate', function (value, el) {
    var isOptional = this.optional(el);
    var today = new Date();
    var myDate= new Date(value);
    var isValid = (myDate < today) ? true : false;
    return isOptional || isValid;
}, Resources.VALIDATE_DATE);

$.validator.addMethod('msgvalidation', function (value, el) {
	
	var isOptional = this.optional(el);
    var isValid = (regex.alphanumeric.test($.trim(value)))? true : false;
    return isOptional || isValid;
}, "Message not valid, Special characters not allowed");

$.extend($.validator.messages, {
    required: Resources.VALIDATE_REQUIRED,
    remote: Resources.VALIDATE_REMOTE,
    email: Resources.VALIDATE_EMAIL,
    url: Resources.VALIDATE_URL,
    date: Resources.VALIDATE_DATE,
    dateISO: Resources.VALIDATE_DATEISO,
    number: Resources.VALIDATE_NUMBER,
    digits: Resources.VALIDATE_DIGITS,
    creditcard: Resources.VALIDATE_CREDITCARD,
    equalTo: Resources.VALIDATE_EQUALTO,
    maxlength: $.validator.format(Resources.VALIDATE_MAXLENGTH),
    minlength: $.validator.format(Resources.VALIDATE_MINLENGTH),
    rangelength: $.validator.format(Resources.VALIDATE_RANGELENGTH),
    range: $.validator.format(Resources.VALIDATE_RANGE),
    max: $.validator.format(Resources.VALIDATE_MAX),
    min: $.validator.format(Resources.VALIDATE_MIN),
    password: Resources.VALIDATE_PASSWORD
});

var validator = {
    regex: regex,
    settings: settings,
    init: function () {
        var self = this;
        $('form:not(.suppress)').each(function () {
            $(this).validate(self.settings);
        });
        $('input[maxlength]').on('keyup',maxLengthValidation);
    },
    initForm: function (f) {
        $(f).validate(this.settings);        
    }
};

module.exports = validator;
