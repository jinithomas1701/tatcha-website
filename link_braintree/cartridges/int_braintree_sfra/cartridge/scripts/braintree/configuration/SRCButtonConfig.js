/* eslint-disable camelcase */

/* Available values
    -----style-----
    *  size: 154 small, 213 medium, 425 high resolution;
       If you specify height or width, the value of size is ignored.
    *  height: (number) 34, 47, 94;
    *  width: (number) less than 477 if height is 34, default value is 154;
        greater than 212 and less than 659 if height is 47, default value is 213;
    *  legacy: should be false to render new  type of button;
    *  cardBrands: (string) card brands - VISA,MASTERCARD,AMEX,DISCOVER,ELECTRON,ELO;
    -----style-----
    -----settings-----
    *  acceptCanadianVisaDebit: true, false; Whether a Canadian merchant accepts Visa Canadadebit cards;
        if acceptCanadianVisaDebit equal true, VISA should be included into cardBrands;
    *  locale: which controls how text display sin a Visa Checkout buttonand the VisaCheckout lightbox.
    *  cardBrands: card brands that will be show at image of button;
    -----settings-----
*/
module.exports = {
    SRC_Billing_Button_Config: {
        style: {
            size: 213,
            height: 47,
            width: 425,
            legacy: false,
            cardBrands: 'VISA,MASTERCARD,AMEX'
        },
        cardBrands: ['VISA', 'MASTERCARD', 'AMEX'],
        acceptCanadianVisaDebit: true,
        locale: 'en_US'
    },
    SRC_Cart_Button_Config: {
        style: {
            size: 213,
            height: 47,
            width: 213,
            legacy: false,
            cardBrands: 'VISA,MASTERCARD,AMEX'
        },
        cardBrands: ['VISA', 'MASTERCARD', 'AMEX'],
        acceptCanadianVisaDebit: true,
        locale: 'en_US'
    },
    SRC_Account_Button_Config: {
        style: {
            size: 213,
            height: 47,
            width: 213,
            legacy: false,
            cardBrands: 'VISA,MASTERCARD,AMEX'
        },
        cardBrands: ['VISA', 'MASTERCARD', 'AMEX'],
        acceptCanadianVisaDebit: true,
        locale: 'en_US'
    }
};
