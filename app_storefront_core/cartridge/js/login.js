'use strict';

var dialog = require('./dialog'),
	ajax = require('./ajax'),
    page = require('./page'),
    progress = require('./progress'),
    validator = require('./validator'),
    util = require('./util');

var login = {
    /**
     * @private
     * @function
     * @description init events for the loginPage
     */
    init: function () {
        //o-auth binding for which icon is clicked
        $('.oAuthIcon').bind('click', function () {
            $('#OAuthProvider').val(this.id);
        });
    

        //toggle the value of the rememberme checkbox
        $('#dwfrm_login_rememberme').bind('change', function () {
            if ($('#dwfrm_login_rememberme').attr('checked')) {
                $('#rememberme').val('true');
            } else {
                $('#rememberme').val('false');
            }
        });
        
        $('#password-reset').on('click', function (e) {
            e.preventDefault();
            dialog.open({
                url: $(e.target).attr('href'),
                options: {
                    open: function () {
                        validator.init();
                        var $requestPasswordForm = $('[name$="_requestpassword"]');
                        var $submit = $requestPasswordForm.find('[name$="_requestpassword_send"]');
                        $($submit).on('click', function (e) {
                            if (!$requestPasswordForm.valid()) {
                                return;
                            }
                            e.preventDefault();
                            var data = $requestPasswordForm.serialize();
                            // add form action to data
                            data += '&' + $submit.attr('name') + '=';
                            // make sure the server knows this is an ajax request
                            if (data.indexOf('ajax') === -1) {
                                data += '&format=ajax';
                            }
                            $.ajax({
                                type: 'POST',
                                url: $requestPasswordForm.attr('action'),
                                data: data,
                                success: function (response) {
                                    if (typeof response === 'object' &&
                                            !response.success &&
                                            response.error === 'CSRF Token Mismatch') {
                                        page.redirect(Urls.csrffailed);
                                    } else if (typeof response === 'string') {
                                        dialog.$container.html(response);
                                    }
                                },
                                failure: function () {
                                    dialog.$container.html('<h1>' + Resources.SERVER_ERROR + '</h1>');
                                }
                            });
                        });
                    }
                }
            });
        });
        
        $('.reorder-link').on('click', function(e) {
        	e.preventDefault();
        	var container = $('#loginModal');
        	var redirectUrl = $(this).data('original');
        	container.find('input[name="redirectUrl"]').val(redirectUrl);
        	$('#loginModal').modal('show');
        });

		function wishlistLogin(e) {
			if(e){
				e.preventDefault();
			}
			var container = $('#loginModal');
            var pid = $(this).attr('data-pid');
            var url = window.location.href.replace(window.location.origin, '');
            
            url = url.replace('page', 'pageNum')
            if(url.indexOf('?') != -1) {
                url = url + '&triggerEvent=focus&id='+pid
            } else {
                url + '?triggerEvent=focus&id='+pid
            }
            
            container.find('input[name="originalUrl"]').val(url);
            container.find('input[name="callBackAction"]').val('wishlist');
        	container.find('input[name="pid"]').val(pid);
		}
        
        $(document).on('click', '.wishlist-login-btn', wishlistLogin);
		$(document).on('keyup', '.wishlist-login-btn', function(event) {
			if(event.keyCode === 13) {
				event.preventDefault();
				wishlistLogin();
				$('#loginModal').modal('show');
			}
		});
        
        $('.register-link').on('click', function() {
        	var container = $('#loginModal');
        	var url = $(this).data('url');
        	
        	var originalUrl = container.find('input[name="originalUrl"]').val();
        	if(container.find('input[name="redirectUrl"]').val()) {
        		var originalUrl = container.find('input[name="redirectUrl"]').val();
            }
            originalUrl = originalUrl.replace('?', '!$');
            originalUrl = originalUrl.split('&').join('^^');
        	url = url + '?original='+originalUrl;
        	
        	if(container.find('input[name="callBackAction"]').val() == 'wishlist') {
        		var pid = container.find('input[name="pid"]').val()
        		url = url + '&callBackAction=wishlist&pid='+pid;
        	}
        	window.location.assign(url);
        });
        
        $('.login-modal-link').on('click', function(e) {
        	e.preventDefault();
        	var container = $('#loginModal');
        	var redirectUrl = $(this).data('redirect');
        	container.find('input[name="redirectUrl"]').val(redirectUrl);
        });
        
        $('#loginModal').on('hidden.bs.modal', function () {
        	var container = $('#loginModal');
        	container.find('input[name="redirectUrl"]').val('');
        	container.find('input[name="callBackAction"]').val('');
        	container.find('input[name="pid"]').val('');
        	container.find('input[name="dwfrm_login_username"]').val('');
        	container.find('input[name="dwfrm_login_password"]').val('');
        	container.find('.form-group').removeClass('has-error');
        	container.find('.form-group .help-block').html('');
        	container.find('#login-modal-error').html('');
        	container.find('#login-modal-error').hide();
        	container.find('#ad-warning').hide();
        	container.find('input[name="scope"]').val('');
        });
        $('#loginModal').on('show.bs.modal', function () {
        	var container = $('#loginModal');
        	trapLoginModalFocus();
        	if($("input[name=email]").val() && $("input[name=email]").val() != '') {
        		container.find('input[name="dwfrm_login_username"]').val($("input[name=email]").val());
        	}
        	
        });
        $('.checkout-guest-link').on('click', function() {
        	$('#loginModal').modal('hide');
        });
        
    },
    submitModal: function() {
        var container = $('#loginModal');
        var isvalid = container.find('form').valid();
        if(isvalid) {
        	$('#login-modal-error').removeAttr('role');
            $('#login-modal-error').hide();
            ajax.post({
                url: container.find('#dwfrm_login').attr('action'),
                data: container.find('#dwfrm_login').serialize(),
                callback: function (response) {
                    response = JSON.parse(response);
                    if(typeof response == "undefined") {
                        location.reload();
                        return;
                    }
                    if(!response || response.error) {
                        var loginUrl = container.find('input[name="loginUrl"]').val();
                        window.location.assign(loginUrl);
                        return;
                    }
                    if(response.status == 'error') {
                        if (SitePreferences.MPARTICLE_ENABLED) {
                        	window.mParticle.logError('Login failed');
                        }
                        if(response.errorMsg) {
                            $(this).removeClass('loading-btn');
                            $('#login-modal-error').html(response.errorMsg);
                            $('#login-modal-error').attr('role','alert');
                            $('#login-modal-error').show();
                            $('#dwfrm_login_username').focus();
                        } else {
                            location.reload();
                            return;
                        }
                    }
                    if(response.redirectUrl) {
                        window.location.assign(response.redirectUrl);
                        return;
                    }
                    if(response.status == 'success') {
                    	//ADA change to announce add to wishlist for guest user
                    	if(container.find('input[name="callBackAction"]').val() == 'wishlist'){
                    		container.find('#wishlist-action-sr').text('product added to wishlist');
                    	}
                        var originalUrl = container.find('input[name="originalUrl"]').val();
                        var redirectUrl = container.find('input[name="redirectUrl"]').val();
                        redirectUrl = (redirectUrl) ? redirectUrl : originalUrl;
                        if(redirectUrl) {
                        	if(redirectUrl.indexOf('hasadproducts=true') > -1){
                        		redirectUrl = util.removeParamFromURL(redirectUrl, 'hasadproducts');
                        	}
                            window.location.assign(redirectUrl);
                            return;
                        }
                        location.reload();
                    }
                    $('.loader-preventive').hide();
                    return;
                }.bind(this)
            });
        } else {
            $('.loader-preventive').hide();
        }
    }
}

// Trap focus on login modal when open for tab events
var trapLoginModalFocus = function () {
	var container = document.querySelector("#loginModal");
	container.addEventListener('keydown', focusElementLogin);
    
    // Close login modal
	$('.close-bag').on('keypress',function(e) {
	    if(e.which == 13 || e.which == 32) {
	    	$(this).trigger("click");
	    }
	});
}

var focusElementLogin = function (e) {
	var container = document.querySelector("#loginModal");
	var focusableEls = container.querySelectorAll('div.close-bag, h2, a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled])');
    var firstFocusableEl = focusableEls[0];  
    var lastFocusableEl = focusableEls[focusableEls.length - 1];
    
	var KEYCODE_TAB = 9;
	var isTabPressed = (e.key === 'Tab' || e.keyCode === KEYCODE_TAB);
	
    if (!isTabPressed) { 
        return; 
    }

    if ( e.shiftKey ) /* shift + tab */ {
        if (document.activeElement === firstFocusableEl) {
            lastFocusableEl.focus();
            e.preventDefault();
        }
    } else /* tab */ {
        if (document.activeElement === lastFocusableEl) {
            firstFocusableEl.focus();
            e.preventDefault();
        }
    }
}

module.exports = login;