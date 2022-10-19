'use strict';

exports.init = function () {
	
	var w = window.outerWidth;
	
	if(w<=1024){
		return false;
    }
	
    // detect if it already exists (e.g., through Segment.io)
    var initialized = !!window.LC_API;
    var initializing = false;
    $('.livechat-open').click(function(event) {
        if (initializing || initialized) {
            window.LC_API.open_chat_window();
        } else {
            initializing = true;
        }
        event.preventDefault();
    });
    window.__lc = {};
    window.__lc.license = 3126452;
    window.LC_API = {
        'on_after_load': function() {
            initialized = true;
            initializing = false;
        }
    };
    var lc = document.createElement('script');
    lc.type = 'text/javascript';
    lc.async = true;
    lc.defer = true;
    lc.src = ('https:' === document.location.protocol ? 'https://' : 'http://') + 'cdn.livechatinc.com/tracking.js';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(lc, s);
};