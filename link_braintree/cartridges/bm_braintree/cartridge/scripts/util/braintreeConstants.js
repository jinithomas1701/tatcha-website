module.exports = {
    SERVICE_NAME: 'int_braintree.http.graphql.payment.Braintree',
    // search types
    SEARCH_BY_ORDER_NUMBER: 'SEARCH_BY_ORDER_NUMBER',
    SEARCH_BY_TRANSACTION_ID: 'SEARCH_BY_TRANSACTION_ID',
    SEARCH_BY_PAYMENT_METHOD: 'SEARCH_BY_PAYMENT_METHOD',
    // transaction types/types for graphQL calls
    TYPE_REFUND: 'REFUND',
    TYPE_TRANSACTION: 'TRANSACTION',
    TYPE_PAYMENT_METHOD: 'PAYMENT_METHOD',
    // transaction actions
    ACTION_SUBMIT_FOR_SETTLEMENT: 'submitForSettlement',
    ACTION_REFUND: 'refund',
    ACTION_VOID: 'void',
    ACTION_VOID_WITHOUT_UPDATE: 'voidWithoutUpdate',
    ACTION_NEW_TRANSACTION_FROM_VAULT: 'newTransactionFromVault',
    ACTION_CREATE_INTENT_ORDER_TRANSACTION: 'createIntentOrderTransaction',
    ACTION_SUBMIT_FOR_PARTIAL_SETTLEMENT_FOR_NON_PP_TRANSACTION: 'submitForPartialSettlementForNonPaypalTransaction',
    // payment method id
    PAYMENT_METHOD_ID_PAYPAL: 'PayPal',
    // transaction statuses
    STATUS_SETTLEMENT_DECLINED: 'SETTLEMENT_DECLINED',
    STATUS_PROCESSOR_DECLINED: 'PROCESSOR_DECLINED',
    STATUS_SETTLEMENT_PENDING: 'SETTLEMENT_PENDING',
    STATUS_VOIDED: 'VOIDED',
    STATUS_AUTHORIZED: 'AUTHORIZED',
    STATUS_SETTLED: 'SETTLED',
    // graphQl call query names
    QUERY_NAME_LEGACY_ID_CONVERTER: 'legacyIdConverter',
    QUERY_NAME_SEARCH: 'search',
    QUERY_NAME_SEARCH_REFUND: 'searchRefund',
    QUERY_NAME_VOID: 'reverse',
    QUERY_NAME_REFUND: 'refund',
    QUERY_NAME_SUBMIT_FOR_SETTLEMENT: 'capture',
    QUERY_NAME_SUBMIT_FOR_PARTIAL_SETTLEMENT: 'partialCapture',
    QUERY_NAME_SALE: 'sale',
    QUERY_NAME_AUTHORIZATION: 'authorization',
    // BT processor names
    PROCESSOR_NAME_BT_CREDIT: 'BRAINTREE_CREDIT',
    PROCESSOR_NAME_BT_PAYPAL: 'BRAINTREE_PAYPAL',
    PROCESSOR_NAME_BT_APPLEPAY: 'BRAINTREE_APPLEPAY',
    PROCESSOR_NAME_BT_VENMO: 'BRAINTREE_VENMO',
    PROCESSOR_NAME_BT_LOCAL: 'BRAINTREE_LOCAL',
    PROCESSOR_NAME_BT_GOOGLEPAY: 'BRAINTREE_GOOGLEPAY',
    PROCESSOR_NAME_BT_SRC: 'BRAINTREE_SRC'
};