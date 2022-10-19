var editProfile = {
    init: function () {
		// My account form switch
	    $('.account-switch-section').on('click', function () {
	    	var name = $(this).attr('data-section');
	    	if (name) {
	    		$('.account-step').hide();
	    		$('.account-step-' + name).show();
	    		if (name == 'summary') {
	    			$(this).parents('.card').find('form')[0].reset();
	    			$(this).parents('.card').find('form .has-error').removeClass('has-error');
	    			$(this).parents('.card').find('.alert.alert-danger').remove();
	    			$(this).parents('.card').find('form span.help-block').html('');
	    			if ($(this).parents('.card').find('form').attr('id') == 'ChangePassowrdForm') {
	    				$(this).parents('.card').find('form input').val('');
	    			}
	    			if ($(this).parents('.card').find('form').attr('id') == 'EmailForm') {
	    				var defVal = $(this).parents('.card').find('form #dwfrm_profile_customer_email').attr('data-default-value');
	    				$(this).parents('.card').find('form #dwfrm_profile_customer_email').val(defVal);
	    				$(this).parents('.card').find('form #dwfrm_profile_customer_emailconfirm').val('');
	    			}
	    		}
	    	}
	    });

	    // My Account DOB select boxes
	    var previousDOB = $('#dwfrm_profile_customer_birthday').val();
	    $('.dobselect').on('blur', function () {
	    	var day = $('.dobselect.dob-day').val();
	    	var month = $('.dobselect.dob-month').val();
	    	var year = $('.dobselect.dob-year').val();

	    	var dob = '';
	    	if (day || month || year) {
	    		day = day || '00';
	    		month = month || '00';
	        	year = year || 1900;
	        	dob = month + '/' + day + '/' + year;
	    	}
	    	$('#dwfrm_profile_customer_birthday').val(dob);
	    	$('#dwfrm_profile_customer_birthday').trigger('blur');
	    });

	    // Show Confirm Popup before saving DOB
	    $('#save-profile').on('click', function () {
	    	var newDOB = $('#dwfrm_profile_customer_birthday').val();
	    	var isValid = $('#ProfileForm').valid();
	    	if (isValid) {
	    		if (previousDOB != newDOB && $('.dobselect.dob-year').val() != '') {
	    			$('#modal-birthday').find('#selectedDOBvalue').html(newDOB.replace('/1900', ''));
	        		$('#modal-birthday').modal('show');
	        	} else {
	        		$('#dwfrm_profile_confirm').trigger('click');
	        	}
	    	}
	    });
	    $('#confirmDOBsave').on('click', function () {
	    	$('#dwfrm_profile_confirm').trigger('click');
	    });

	    // Update error message
	    $('#bday-field').bind('DOMSubtreeModified', function () {
	    	var error = $('#bday-field #dwfrm_profile_customer_birthday-error').clone();
	    	$('#bday-error').html('').append(error);
	    	$('#bday-error .help-block').show();
	    });
    }
};

module.exports = editProfile;
