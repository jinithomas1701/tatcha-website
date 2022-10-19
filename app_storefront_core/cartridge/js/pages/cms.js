'use strict';

var addToCart = require('../pages/product/addToCart');

function initializeEvents() {
	addToCart();
}

var contentPage = {
	initializeEvents: initializeEvents,
	init: function () {
		initializeEvents();
	}
};

module.exports = contentPage;