/* eslint-disable camelcase */
var paypal = {
    FUNDING: {
        BANCONTACT: 'bancontact',
        CARD: 'card',
        CREDIT: 'credit',
        ELV: 'elv',
        EPS: 'eps',
        GIROPAY: 'giropay',
        IDEAL: 'ideal',
        MYBANK: 'mybank',
        PAYPAL: 'paypal',
        VENMO: 'venmo'
    },
    CARD: {
        AMEX: 'amex',
        CBNATIONALE: 'cbnationale',
        CETELEM: 'cetelem',
        COFIDIS: 'cofidis',
        COFINOGA: 'cofinoga',
        CUP: 'cup',
        DISCOVER: 'discover',
        ELO: 'elo',
        HIPER: 'hiper',
        JCB: 'jcb',
        MAESTRO: 'maestro',
        MASTERCARD: 'mastercard',
        SWITCH: 'switch',
        VISA: 'visa'
    }
};

var BRAINTREE_PAYPAL_Cart_Button_Config = {
    style: {
        size: 'responsive', // small, medium, large, responsive
        color: 'silver', // gold, blue, silver, black
        shape: 'rect', // pill, rect
        layout: 'horizontal',  // horizontal, vertical
		label: 'paypal',
		tagline: 'false',
        maxbuttons: 1 // 1-4
    },
    funding: {
        allowed: [paypal.FUNDING.CREDIT],
        disallowed: [paypal.FUNDING.CARD,paypal.FUNDING.VENMO]
        // paypal.FUNDING.CREDIT
        // paypal.FUNDING.CARD
        // paypal.FUNDING.ELV
    }
};
var BRAINTREE_PAYPAL_Billing_Button_Config = {
    style: {
        size: 'responsive', // small, medium, large, responsive
        color: 'silver', // gold, blue, silver, black
        shape: 'rect', // pill, rect
        layout: 'horizontal',  // horizontal, vertical
        label: 'paypal',
        tagline: 'false',
        maxbuttons: 1 // 1-4
    },
    funding: {
        allowed: [],
        disallowed: [paypal.FUNDING.CREDIT,paypal.FUNDING.CARD,paypal.FUNDING.VENMO]
        // paypal.FUNDING.CREDIT
        // paypal.FUNDING.CARD
        // paypal.FUNDING.ELV
    }
};
var BRAINTREE_PAYPAL_MiniCart_Button_Config = {
    style: {
        size: 'responsive', // small, medium, large, responsive
        color: 'gold', // gold, blue, silver, black
        shape: 'rect', // pill, rect
        layout: 'vertical',  // horizontal, vertical
        maxbuttons: 1 // 1-4
    },
    funding: {
        allowed: [],
        disallowed: [paypal.FUNDING.CARD, paypal.FUNDING.CREDIT, paypal.FUNDING.VENMO]
        // paypal.FUNDING.CREDIT
        // paypal.FUNDING.CARD
        // paypal.FUNDING.ELV
    }
};
var BRAINTREE_PAYPAL_PDP_Button_Config = {
    style: {
        size: 'responsive', // small, medium, large, responsive
        color: 'gold', // gold, blue, silver, black
        shape: 'rect', // pill, rect
        layout: 'vertical',  // horizontal, vertical
        maxbuttons: 1 // 1-4
    },
    funding: {
        allowed: [paypal.FUNDING.VENMO],
        disallowed: [paypal.FUNDING.CARD, paypal.FUNDING.CREDIT]
        // paypal.FUNDING.CREDIT
        // paypal.FUNDING.CARD
        // paypal.FUNDING.ELV
    }
};

module.exports = {
    BRAINTREE_PAYPAL_Cart_Button_Config: BRAINTREE_PAYPAL_Cart_Button_Config,
    BRAINTREE_PAYPAL_Billing_Button_Config: BRAINTREE_PAYPAL_Billing_Button_Config,
    BRAINTREE_PAYPAL_MiniCart_Button_Config: BRAINTREE_PAYPAL_MiniCart_Button_Config,
    BRAINTREE_PAYPAL_PDP_Button_Config: BRAINTREE_PAYPAL_PDP_Button_Config
};
