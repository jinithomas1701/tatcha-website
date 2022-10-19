/* eslint-disable camelcase */
var smartButtonStyles = JSON.parse(require('dw/system/Site').current.getCustomPreferenceValue('PP_API_Smart_Button_Styles'));

module.exports = {
    PAYPAL_Billing_Button_Config: { style: smartButtonStyles.checkout },
    PAYPAL_Cart_Button_Config: { style: smartButtonStyles.cart },
    PAYPAL_MiniCart_Button_Config: { style: smartButtonStyles.minicart },
    PAYPAL_PDP_Button_Config: { style: smartButtonStyles.pdp }
};

