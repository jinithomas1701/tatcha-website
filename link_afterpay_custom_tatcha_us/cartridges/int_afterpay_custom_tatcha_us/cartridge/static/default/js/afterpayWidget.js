function createAfterpayWidget() {
  var currentstage = document.getElementById("current-stage")? document.getElementById("current-stage").value : '';
  var hasAfterpayPI = document.getElementById("hasAfterpayPI")? document.getElementById("hasAfterpayPI").value : '';
  var target = '#afterpay-widget-container';
  if(currentstage && (currentstage === 'placeOrder') && (hasAfterpayPI === 'true')) {
      target = target+'-placeOrder';
  }

  var apamount = document.getElementById("afterpay-widget-amount")? document.getElementById("afterpay-widget-amount").value : 0;
  window.afterpayWidget = new AfterPay.Widgets.PaymentSchedule({
    token: document.getElementById("afterpay-token") && document.getElementById("afterpay-token").value !== 'null'? document.getElementById("afterpay-token").value: '',
    amount: { amount: apamount, currency: "USD" },
    target: target,
    locale: 'en-US', 
    onReady: function (event) {
   	 afterpayWidget.update({
            amount: { amount: apamount, currency: "USD" },
        });
    },
    onChange: function (event) {
      // Fires after each update and on any other state changes.
      // See "Getting the widget's state" for more details.
        var paymentScheduleChecksum = afterpayWidget.paymentScheduleChecksum;
    	var getAfterpayPaymentChecksumUrl = document.getElementById('getAfterpayPaymentChecksum').value;
		$.ajax({
			type: 'POST',
			url: getAfterpayPaymentChecksumUrl,
			data: {
				"apchecksum" : paymentScheduleChecksum
			},
			success:function(res) {
				var apchecksum = res.response.apchecksum;						
			} 
		 });
    },
    onError: function (event) {
      // See "Handling widget errors" for more details.
    }
  })
}