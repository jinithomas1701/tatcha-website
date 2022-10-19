function initAfterpay(){
	AfterPay.initializeForPopup({ 
		countryCode: 'US',
		onCommenceCheckout : function( actions ) {		
			var afterpayExpressTokenUrl = document.getElementById('getAfterpayExpressTokenUrl').value;
			var currentLocation = window.location.href;
			$.ajax({
					type: 'POST',
					url: afterpayExpressTokenUrl,
					data: {
						"currentUrl" : currentLocation.toString()
					},
					success:function(res) {
						var afterpaytoken = res.response.afterpaytoken;						
						actions.resolve(afterpaytoken);
					} 
				 });
		},
		onShippingAddressChange : function(data, actions) {
			if(data.countryCode !== 'US') {
				actions.reject(AfterPay.CONSTANTS.SHIPPING_ADDRESS_UNSUPPORTED);
			} else {
				var shippingMetthodsUrl = document.getElementById('getAfterpayExpressShippingMethodsUrl').value;
				$.ajax({
					type: 'POST',
					url: shippingMetthodsUrl,
					data: {
						"countryCode" : data.countryCode,
						"postcode" : data.postcode,
						"state" : data.state,
						"suburb" : data.suburb,
						"address1" : data.address1,
						"address2" : data.address2,
						"name" : data.name,
						"phoneNumber" : data.phoneNumber
					},
					success:function(r) {
						var shippingMethods = r.response.shippingMethods;
						actions.resolve(shippingMethods);
					}
				});
			}				
		},
		onComplete : function(event) {			
			if (event.data.status == "SUCCESS") {
				var afterpayExpressProcessUrl = document.getElementById('afterpayExpressProcessOrderUrl').value;
				var csrfToken = $('input[name="csrf_token"]').val();
				$('.loader-preventive').show();
				$.ajax({
					type: 'POST',
					url: afterpayExpressProcessUrl,
					data: {
						"status" : event.data.status,
						"token" : event.data.orderToken,
						"orderToken" : event.data.orderToken
					},
					success:function(response) {
						var summaryUrl = document.getElementById('afterpayExpressSummaryUrl').value  + '?csrf_token=' + csrfToken;
						$(location).attr('href',summaryUrl);
					}
				 });						
			} else {
				// The consumer cancelled the payment or closed the popup window.
			}
		},
		target: "#afterpay-express-button"
	});		
}
