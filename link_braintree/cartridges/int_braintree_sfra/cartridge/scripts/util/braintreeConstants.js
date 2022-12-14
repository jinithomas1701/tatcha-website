module.exports = {
    // flows
    FLOW_PDP: 'pdp',
    FLOW_CHECKOUT: 'checkout',
    FLOW_VAULT: 'vault',
    FLOW_CART: 'cart',
    FLOW_MINICART: 'minicart',
    // intents
    INTENT_TYPE_ORDER: 'order',
    // PayPal button configs
    BUTTON_CONFIG_OPTIONS_STYLE_LAYOUT_HORIZONTAL: 'horizontal',
    BUTTON_CONFIG_OPTIONS_STYLE_SHAPE_RECT: 'rect',
    BUTTON_CONFIG_OPTIONS_STYLE_SIZE_MEDIUM: 'medium',
    BUTTON_CONFIG_OPTIONS_STYLE_SIZE_SMALL: 'small',
    BUTTON_CONFIG_PAYPAL: 'paypal',
    // endpoint names
    ENDPOINT_ACCOUNT_ADD_SRC_HANDLE_NAME: 'AccountAddSrcHandle',
    ENDPOINT_ACCOUNT_ADD_GOOGLE_PAY_HANDLE_NAME: 'AccountAddGooglePayHandle',
    ENDPOINT_ACCOUNT_ADD_CREDIT_CARD_HANDLE_NAME: 'AccountAddCreditCardHandle',
    ENDPOINT_ACCOUNT_ADD_VENMO_HANDLE_NAME: 'AccountAddVenmoHandle',
    // params
    PARAM_NONCE: 'Nonce',
    // payment processor ids
    PAYMENT_PROCCESSOR_ID_BRAINTREE_CREDIT: 'BRAINTREE_CREDIT',
    PAYMENT_PROCCESSOR_ID_BRAINTREE_PAYPAL: 'BRAINTREE_PAYPAL',
    PAYMENT_PROCCESSOR_ID_BRAINTREE_APPLEPAY: 'BRAINTREE_APPLEPAY',
    PAYMENT_PROCCESSOR_ID_BRAINTREE_VENMO: 'BRAINTREE_VENMO',
    PAYMENT_PROCCESSOR_ID_BRAINTREE_SRC: 'BRAINTREE_SRC',
    PAYMENT_PROCCESSOR_ID_BRAINTREE_LOCAL: 'BRAINTREE_LOCAL',
    PAYMENT_PROCCESSOR_ID_BRAINTREE_GOOGLEPAY: 'BRAINTREE_GOOGLEPAY',
    // payment method id
    PAYMENT_METHOD_ID_PAYPAL: 'PayPal',
    PAYMENT_METHOD_ID_GOOGLEPAY: 'GooglePay',
    // graphQl call query names
    QUERY_NAME_LEGACY_ID_CONVERTER: 'legacyIdConverter',
    QUERY_NAME_SEARCH_TRANSACTION: 'searchTransaction',
    QUERY_NAME_CLIENT_ID: 'clientId',
    QUERY_NAME_VAULT_PAYMENT_METHOD: 'vaultPaymentMethod',
    QUERY_NAME_DELETE_PAYMENT_METHOD: 'deletePaymentMethodFromVault',
    QUERY_NAME_SEARCH_CUSTOMER: 'searchCustomer',
    QUERY_NAME_CREATE_CUSTOMER: 'createCustomer',
    QUERY_NAME_SALE: 'sale',
    QUERY_NAME_AUTHORIZATION: 'authorization',
    QUERY_NAME_PAYPAL_SALE: 'chargePaypal',
    QUERY_NAME_PAYPAL_AUTHORIZATION: 'authorizePaypal',
    // legacy id types for graphQL calls
    LEGACY_ID_TYPE_CUSTOMER: 'CUSTOMER',
    LEGACY_ID_TYPE_PAYMENT_METHOD: 'PAYMENT_METHOD',
    LEGACY_ID_TYPE_TRANSACTION: 'TRANSACTION',
    // card types
    CREDIT_CARD_TYPE_VISA: 'visa',
    GOOGLEPAY_TYPE_ANDROID_PAY_CARD: 'AndroidPayCard',
    // input values
    NEW_ACCOUNT: 'newaccount',
    SESSION_CARD: 'sessioncard',
    // transaction statuses
    TRANSACTION_STATUS_SETTLING: 'SETTLING',
    TRANSACTION_STATUS_SUBMITTED_FOR_SETTLEMENT: 'SUBMITTED_FOR_SETTLEMENT',
    TRANSACTION_STATUS_AUTHORIZED: 'AUTHORIZED',
    TRANSACTION_STATUS_SETTLED: 'SETTLED',
    TRANSACTION_STATUS_SETTLEMENT_PENDING: 'SETTLEMENT_PENDING',
    // BT webHooks notification types
    TYPE_PAYMENT_METHOD_REVOKED_BY_CUSTOMER: 'payment_method_revoked_by_customer',
    // etc.
    TRANSACTION_VAULT_ON_SUCCESS: 'ON_SUCCESSFUL_TRANSACTION',
    LINE_ITEMS_KIND: 'DEBIT'
};
