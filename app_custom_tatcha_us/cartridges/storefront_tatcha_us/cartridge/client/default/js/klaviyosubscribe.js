'use strict';

var ajax = require('./ajax');

var klaviyosubscribe = {
    init: function () {
        //Footer Ajax Newsletter Form
        $('.ajaxsubscribeForm').on('submit', function(e){
            e.preventDefault();
            var form = $(this);
            if (form.valid()) {
                $('.loader-preventive').show();
                ajax.post({
                    url: form.attr('action'),
                    data: form.serialize(),
                    callback: function (response) {
                        if (response) {
                            response = JSON.parse(response);
                            if (response.status == 'success') {
                                var email = $('.ajaxsubscribeForm').find('input[name="emailsignup"]').val();
                                if (SitePreferences.MPARTICLE_ENABLED) {
                                    var identifyData = {};
                                    identifyData.email = email;
                                    setTimeout(function(){ window.mParticleIdentify(identifyData, true); }, 1000);
                                }
                                $('.ajaxsubscribeForm').find('input[name="emailsignup"]').val("");
                                if ($('#newsletterModal').length > 0) {
                                    $('#newsletterModal').modal('hide');
                                }
                                //$('#subscribeFotter').modal('show');
                                $(".newly-subscribed").removeClass('d-none');
                                $(".ajaxsubscribeForm").hide();
                                $('.loader-preventive').hide();
                            } else if(response.status == 'alreadyconfirmed') {
                                $('.ajaxsubscribeForm').find('input[name="emailsignup"]').val("");
                                if ($('#newsletterModal').length > 0) {
                                    $('#newsletterModal').modal('hide');
                                }
                                $(".already-subscribed").removeClass('d-none');
                                $(".ajaxsubscribeForm").hide();
                                //$('#alreadySubscribedModal').modal('show');
                                $('.loader-preventive').hide();
                            }
                            var nwsltrCookie = getCookie('dw_cookies_nwsltr_subcribed');
                            if(!nwsltrCookie) {
                                setCookie('dw_cookies_nwsltr_subcribed', '1', '720');
                            }
                        } else {
                            $('.ajaxsubscribeForm').find('input[name="emailsignup"]').val("");
                            $('#newsletterModal').modal('hide');
                            $('.loader-preventive').hide();
                        }
                    }.bind(this)
                });
            }
        });
    }
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/; secure";
}

module.exports = klaviyosubscribe;
