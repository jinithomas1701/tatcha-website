'use strict';

var HookMgr = require('dw/system/HookMgr');
var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
var base = module.superModule || {};

/**
 * Calculate all totals as well as shipping and taxes
 * @param {dw.order.Basket} basket - current basket
 */
function calculateTotals(basket) {
	if(session.custom.SkipCall && session.custom.taxError === false) {
		return;
	}
    var basketData = cartHelper.getBasketDataStr(basket);
    HookMgr.callHook('dw.order.custom.calculate', 'calculate', basket);

    var avaconfig = JSON.parse(require('dw/system/Site').getCurrent().getCustomPreferenceValue('ATSettings'));

    //checks added for reducing tax calls
    if (avaconfig.taxCalculation && (session.custom.taxString !== basketData || !session.custom.NoCall))
    {
        dw.system.Logger.info("Avatax call initiated--"+basketData);
        require('int_avatax_sfra/cartridge/scripts/hooks/avatax/avataxhooks').calculateTax(basket);
        session.custom.taxString = basketData;
    }
    else if (!avaconfig.taxCalculation && session.custom.taxString !== basketData)
    {
        base.calculateTaxes(basket);
    }
}

base.calculateTotals = calculateTotals;

module.exports = base
