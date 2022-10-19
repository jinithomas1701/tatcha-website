'use strict';

/**
 * @typedef config
 * @type Object
 * @property {number} type - a number for what type of product list is being created
 */
/**
 * Creates a list, based on the type sent in
 * @param {dw.customer.Customer} customer - current customer
 * @param {Object} config - configuration object
 * @return {dw.customer.ProductList} list - target productList
 */
function createList(customer, config) {
    var Transaction = require('dw/system/Transaction');
    var ProductListMgr = require('dw/customer/ProductListMgr');
    var list;

    if (config.type === 10) {
        Transaction.wrap(function () {
            list = ProductListMgr.createProductList(customer, config.type);
        });
    }
    return list;
}

/**
 * @typedef config
 * @type Object
 * @property {number} type - a number for what type of product list is being created
 */
/**
 * Returns the customer's current list based on type. Will return null if the list doesn't exist
 * @param {dw.customer.Customer} customer - current customer
 * @param {Object} config - configuration object
 * @return {dw.customer.ProductList} list - target productList
 */
function getList(customer, config) {
    var productListMgr = require('dw/customer/ProductListMgr');
    var type = config.type;
    var list;
    if (type === 10) {
        var productLists = productListMgr.getProductLists(customer, type);
        list = productLists.length > 0
            ? productLists[0]
            : null;
    }else {
        list = null;
    }
    return list;
}

/**
 * @typedef config
 * @type Object
 * @property {number} type - a number for what type of product list is being created
 */
/**
 * Returns the customer's current list based on type. If the customer is requesting a wishlist that doesn't exist, a new wishlist will be created
 * @param {dw.customer.Customer} customer - current customer
 * @param {Object} config - configuration object
 * @return {dw.customer.ProductList} list - target productList
 */
function getCurrentOrNewList(customer, config) {
    var type = config.type;
    var list = getList(customer, config);
    if (list === null && type === 10) {
        list = createList(customer, { type: type });
    }
    return list;
}
/**
 * return the item from the given wishlist that matches the specified productID
 * @param {dw.customer.ProductList} list - target productList
 * @param {string} pid - The product's id
 * @return {dw.customer.ProductListItem} list - target productListItem
 */
function getItemFromList(list, pid) {
    var collections = require('*/cartridge/scripts/util/collections');
    var listItem = collections.find(list.items, function (item) {
        return item.productID === pid;
    });
    return listItem;
}
/**
 * @typedef config
 * @type Object
 */
/**
 * Add an Item to the current customers wishlist
 * @param {dw.customer.ProductList} list - target productList
 * @param {string} pid - The product's variation model
 * @param {Object} config - configuration object
 * @return {boolean} - boolean based on if the product was added to the wishlist
 */
 function addItem(list, pid, config) {
    var Transaction = require('dw/system/Transaction');

    if (!list) { return false; }

    var itemExist = itemExists(list, pid, config);

    if (!itemExist) {
        var ProductMgr = require('dw/catalog/ProductMgr');

        var apiProduct = ProductMgr.getProduct(pid);

        if (apiProduct.variationGroup) { return false; }

        if (apiProduct && list && config.qty) {
            try {
                Transaction.wrap(function () {
                    var productlistItem = list.createProductItem(apiProduct);

                    if (apiProduct.optionProduct) {
                        var optionModel = apiProduct.getOptionModel();
                        var option = optionModel.getOption(config.optionId);
                        var optionValue = optionModel.getOptionValue(option, config.optionValue);

                        optionModel.setSelectedOptionValue(option, optionValue);
                        productlistItem.setProductOptionModel(optionModel);
                    }

                    if (apiProduct.master) {
                        productlistItem.setPublic(false);
                    }

                    productlistItem.setQuantityValue(config.qty);
                });
            } catch (e) {
                return false;
            }
        }

        if (config.type === 10) {
            updateWishlistPrivacyCache(config.req.currentCustomer.raw, config.req, config);
        }

        return true;
    } else if (itemExist && config.type === 11) {
        Transaction.wrap(function () {
            itemExist.setQuantityValue(itemExist.quantityValue + config.qty);
        });

        return true;
    }

    return false;
}
/**
 * @typedef config
 * @type Object
 * @property {number} type - a number for what type of product list is being created
 */
/**
 * Update the privacy cache with latest wishlist
 * @param {dw.customer.Customer} customer - current customer
 * @param {Object} req - local request object
 * @param {Object} config - configuration object
 */
 function updateWishlistPrivacyCache(customer, req, config) {
    var collections = require('*/cartridge/scripts/util/collections');
    var list = getCurrentOrNewList(customer, { type: config.type });
    var listOfIds = collections.map(list.items, function (item) {
        return item.productID;
    });
    req.session.privacyCache.set('wishlist', listOfIds.toString());
}
/**
 * @typedef config
 * @type Object
 */
/**
 * loop through the products and match the id
 * @param {dw.customer.ProductList} list - target productList
 * @param {string} pid - The product's id
 * @param {Object} config - configuration object
 * @return {boolean} - boolean based on if the pid exists with the productList
 */
 function itemExists(list, pid, config) {
    var listItems = list.items.toArray();
    var found = false;
    listItems.forEach(function (item) {
        if (item.productID === pid) {
            found = item;
        }
    });
    if (found && found.productOptionModel && config.optionId && config.optionValue) {
        var optionModel = found.productOptionModel;
        var option = optionModel.getOption(config.optionId);
        var optionValue = optionModel.getSelectedOptionValue(option);
        if (optionValue.ID !== config.optionValue) {
            var Transaction = require('dw/system/Transaction');
            try {
                Transaction.wrap(function () {
                    list.removeItem(found);
                });
            } catch (e) {
                return found;
            }
            found = false;
        }
    }
    return found;
}
/**
 * @typedef config
 * @type Object
 */
/**
 * remove an Item from the current customers productList
 * @param {dw.customer.Customer} customer - current customer
 * @param {string} pid - The product's variation model
 * @param {Object} config - configuration object
 * @return {Object} result - result object with {dw.customer.ProductList} as one of the properties or result{} with error msg
 */
 function removeItem(customer, pid, config) {
    var Resource = require('dw/web/Resource');
    var list = getCurrentOrNewList(customer, config);
    var item = itemExists(list, pid, config);
    var result = {};
    if (item) {
        var Transaction = require('dw/system/Transaction');
        try {
            Transaction.wrap(function () {
                list.removeItem(item);
            });
        } catch (e) {
            result.error = true;
            result.msg = Resource.msg('remove.item.failure.msg', 'productlist', null);
            result.prodList = null;
            return result;
        }
        result.error = false;
        result.prodList = list;

        if (config.type === 10) {
            updateWishlistPrivacyCache(customer, config.req, config);
        }
    }
    return result;
}

module.exports = {
    getList: getList,
    createList: createList,
    getItemFromList: getItemFromList,
    getCurrentOrNewList: getCurrentOrNewList,
    itemExists: itemExists,
    updateWishlistPrivacyCache:updateWishlistPrivacyCache,
    addItem:addItem,
    removeItem:removeItem
};
