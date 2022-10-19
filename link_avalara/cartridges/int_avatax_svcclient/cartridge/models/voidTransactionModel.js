'use strict';
/* eslint-disable require-jsdoc */
function voidTransactionModel() {
	this.code = Object.freeze({
		C_UNSPECIFIED: 'Unspecified',
		C_POSTFAILED: 'PostFailed',
		C_DOCDELETED: 'DocDeleted',
		C_DOCVOIDED: 'DocVoided',
		C_ADJUSTMENTCANCELLED: 'AdjustmentCancelled'
	});

	return this;
}


module.exports.VoidTransactionModel = voidTransactionModel;
