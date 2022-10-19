'use strict';
/* eslint-disable require-jsdoc */
function commitTransactionModel() {
	this.commit = false;
	return this;
}

module.exports.CommitTransactionModel = commitTransactionModel;
