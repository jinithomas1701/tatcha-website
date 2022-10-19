'use strict';

function populatemParticleEvents(data, currentStage){

    //for stage shipping
    if(currentStage == 'shipping'){
        try {
            if(!$('#addressSuggestionModal').is(':visible')) {
                var dataObj = {};
                dataObj.stepName = 'shipping';
                mPartcleLogEvent('Complete Checkout Step', dataObj, 'Checkout', mParticle.EventType.Navigation);
            }
        } catch(err){
            //TODO
        }
    }

    //Enter user info at checkout
    if((data.mParticleData.checkoutState == 'payment' || data.mParticleData.checkoutState == 'shipping') && data.mParticleData.authenticated == false){
        var profileData = JSON.parse(data.mParticleData.profileData);
        $(document).ready(function() {
            setTimeout(function(){ window.mParticleIdentify(profileData, false); }, 1000);
        });
    }

    //Update attributes based on billing
    if(data.mParticleData.pageContext == 'checkout' && data.mParticleData.checkoutState == 'placeOrder'){
        var profileData = JSON.parse(data.mParticleData.profileData);
        if(data.mParticleData.paymentMethod == 'AFTERPAY_PBI' || data.mParticleData.paymentMethod == 'PayPal'){
            $(document).ready(function() {
                setTimeout(function(){ window.mParticleIdentify(profileData); }, 1000);
            });
        }
    }else {
        var profileData = JSON.parse(data.mParticleData.profileData);
        $(document).ready(function() {
            setTimeout(function(){ window.mParticleUpdateUserAttributes(profileData.profileAttributes); }, 1000);
        });
    }
}

module.exports = {
    methods: {
        populatemParticleEvents: populatemParticleEvents
    }
}
