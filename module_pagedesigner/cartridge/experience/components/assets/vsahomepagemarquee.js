'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var ImageTransformation = require('~/cartridge/experience/utilities/ImageTransformation.js');
var GiftCertificateMgr = require('dw/order/GiftCertificateMgr');

/**
 * Render logic for richtext component
 */
module.exports.render = function(context) {
	var model = new HashMap();
	var content = context.content;

	if (content.mobileImage) {
		model.mobileImage = {
                src: {
                    mobile : ImageTransformation.disurl(content.mobileImage, { device: 'mobile' })
                }
    	};
	}

	if (content.desktopImage) {
		model.desktopImage = {
                src: {
                    desktop : ImageTransformation.disurl(content.desktopImage, { device: 'desktop' })
                }
    	};
	}

	if (content.url) {
		model.url = content.url;
	}

	if (content.imageAlt) {
		model.imageAlt = content.imageAlt;
	}

	if (content.overline) {
		model.overline = content.overline;
	}

	if (content.mainHeading) {
		model.mainHeading = content.mainHeading;
	}

	if (content.body) {
		model.body = content.body;
	}
	
	if (content.headerType) {
		model.headerType = content.headerType;
	}

	if (content.textColor) {
		model.textColor = content.textColor;
	}

	if (content.ctaType) {
		if (content.ctaType == 'text link') {
			model.btnStyle = 'btn btn-link';
		} else if (content.ctaType == 'normal button') {
			model.btnStyle = 'btn';
		} else if (content.ctaType == 'large button') {
			model.btnStyle = 'btn btn-lg';
		}

	}

	if (content.buttonText) {
		model.buttonText = content.buttonText;
	}

	if (content.textAlignment) {
		model.textAlignment = content.textAlignment;
	}
	
	if (content.blockPositionVertical) {
		model.blockPositionVertical = content.blockPositionVertical;
	}

	if (content.blockPositionHorizontal) {
		switch(content.blockPositionHorizontal){
			case 'left': model.blockPositionHorizontal = 'blockleft';
						 break;
			case 'center': model.blockPositionHorizontal = 'blockcenter';
						   break;
			case 'right': model.blockPositionHorizontal = 'blockright';
						  break;
			default: model.blockPositionHorizontal = 'blockcenter';
					 break;
		}
	}

	if (content.topMargin) {
		model.topMargin = content.topMargin;
	}

	if (content.bottomMargin) {
		model.bottomMargin = content.bottomMargin;
	}

	if (content.isVideoEnabled) {
		model.isVideoEnabled = content.isVideoEnabled;
	}
	//getting recipient name for giftcard landing page
	if(request.httpParameterMap && !empty(request.httpParameterMap.params) && request.httpParameterMap.params){
		var reqParamsValue = JSON.parse(request.httpParameterMap.params.value);
		var reqParams = JSON.parse(reqParamsValue.custom);
		if(reqParams.view){
			var giftCardId = reqParams.view;
			var gc = GiftCertificateMgr.getGiftCertificateByMerchantID(giftCardId);
			if (gc && gc.isEnabled()) {
				model.rec_name = gc.recipientName;
			}
		}
	}

	return new Template('experience/components/assets/vsahomepagemarquee')
			.render(model).text;
};
