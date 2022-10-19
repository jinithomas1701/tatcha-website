'use strict';

/**
 * This controller implements the functionality for wishlists.
 *
 * @module controllers/Wishlist
 */

/* API Includes */
var GiftCertProductListItem = require('dw/customer/ProductListItem').TYPE_GIFT_CERTIFICATE;
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');
var PagingModel = require('dw/web/PagingModel');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var Site = require('dw/system/Site');

/**
 * Forms handling for the landing page
 */
function landingForm() {
    var wishlistForm = app.getForm('wishlist');
    wishlistForm.handleAction({
        register: function () {
            response.redirect(dw.web.URLUtils.https('Account-StartRegister'));
            return;
        },
        search: function () {
            search();
            return;
        }
    });
}


/**
 * Renders the wishlist page.
 */
function show() {
	var params = request.httpParameterMap;
	
    var Content = app.getModel('Content');
    var wishlistAsset = Content.get('myaccount');

    var pageMeta = require('~/cartridge/scripts/meta');
    pageMeta.update(wishlistAsset);

    var wishlistForm = app.getForm('wishlist');
    wishlistForm.clear();

    var ProductList = app.getModel('ProductList');
    var productList = ProductList.get();
    wishlistForm.get('items').copyFrom(productList.object.items);
    // init address book
    wishlistForm.get('addressbook').get('addresses').copyFrom(customer.profile.addressBook.addresses);
    
    var wishlistContent = new dw.util.ArrayList(productList.object.items);
    wishlistContent.reverse();
    var wishlistPagingModel = new PagingModel(wishlistContent.iterator(), wishlistContent.size());
    
    if (params.start.submitted) {
    	wishlistPagingModel.setStart(params.start.intValue);
    }

    if (params.sz.submitted) {
    	wishlistPagingModel.setPageSize(params.sz.intValue);
    } else {
    	wishlistPagingModel.setPageSize(10);
    }
    
    if (params.format.stringValue === 'page-element') {
    	app.getView({
            ProductList: productList.object,
            wishlistPagingModel: wishlistPagingModel,
        }).render('account/wishlist/wishlistitemwrap');
    } else {
    	app.getView({
            ProductList: productList.object,
            wishlistPagingModel: wishlistPagingModel,
            ContinueURL: dw.web.URLUtils.https('Wishlist-WishListForm')
        }).render('account/wishlist/wishlist');
    }
}


/**
 * Forms handler for processing wish lists.
 */
function wishListForm() {
    var productList = app.getModel('ProductList').get();
    var shouldRedirectToShow = true;

    app.getForm('wishlist').handleAction({
        addGiftCertificate: function () {
            Transaction.wrap(function () {
                productList.createGiftCertificateItem();
            });
        },
        deleteItem: function (formgroup, action) {
            productList.removeItem(action.object);
        },
        updateItem: function (formgroup, action) {
            app.getForm(action.parent).copyTo(action.object);
        },
        setItemPrivate: function (formgroup, action) {
            Transaction.wrap(function () {
                action.object.public = false;
            });
        },
        setItemPublic: function (formgroup, action) {
            Transaction.wrap(function () {
                action.object.public = true;
            });
        },
        setListPrivate: function () {
            productList.setPublic(false);
        },
        setListPublic: function () {
            productList.setPublic(true);
        },
        selectAddressWishlist: function () {
            setShippingAddress();
        },
        addToCart: function (form) {
            var cart = app.getModel('Cart').goc();

            if (form.items.triggeredAction.parent.object.type === GiftCertProductListItem) {
                response.redirect(URLUtils.https('GiftCert-Purchase'));
            } else {
                var renderInfo = cart.addProductToCart();

                if (renderInfo.template === 'checkout/cart/cart') {
                    app.getView('Cart', {
                        Basket: cart
                    }).render(renderInfo.template);
                } else if (renderInfo.format === 'ajax') {
                    app.getView('Cart', {
                        cart: cart,
                        BonusDiscountLineItem: renderInfo.newBonusDiscountLineItem
                    }).render(renderInfo.template);
                } else {
                    response.redirect(URLUtils.url('Cart-Show'));
                }

            }
        },
        search: function () {
            var CSRFProtection = require('dw/web/CSRFProtection');

            if (!CSRFProtection.validateRequest()) {
                if (request.httpParameterMap.format.stringValue === 'ajax') {
                    app.getModel('Customer').logout();
                    let r = require('~/cartridge/scripts/util/Response');
                    r.renderJSON({
                        error: 'CSRF Token Mismatch'
                    });
                } else {
                    app.getModel('Customer').logout();
                    app.getView().render('csrf/csrffailed');
                }
                shouldRedirectToShow = false;
                return null;
            }

            var ProductList = app.getModel('ProductList');
            var listType = require('dw/customer/ProductList').TYPE_WISH_LIST;
            var searchForm = session.forms.wishlist.search;
            var searchFirstName = searchForm.firstname.value;
            var searchLastName = searchForm.lastname.value;
            var searchEmail = searchForm.email.value;
            var wishLists;

            if (searchForm.isValid()) {
                wishLists = ProductList.search(searchForm, listType);

                Transaction.wrap(function () {
                    app.getForm('wishlist.productlists').copyFrom(wishLists);
                    searchForm.clearFormElement();
                });
            }

            shouldRedirectToShow = false;

            app.getView({
                SearchFirstName: searchFirstName,
                SearchLastName: searchLastName,
                SearchEmail: searchEmail
            }).render('account/wishlist/wishlistresults');
        }
    });

    if (shouldRedirectToShow) {
        response.redirect(URLUtils.https('Wishlist-Show'));
    }
}


/**
 * TODO Expects: UserID
 */
function showOther() {
	var params = request.httpParameterMap;
    var URLUtils = require('dw/web/URLUtils');
    var wishlistForm = app.getForm('wishlist');
    wishlistForm.get('send').clear();

    var ProductList = app.getModel('ProductList');
    var productList = ProductList.get(request.httpParameterMap.WishListID.value);
    wishlistForm.get('items').copyFrom(productList.object.items);
    
    var wishlistContent = new dw.util.ArrayList(productList.object.items);
    wishlistContent.reverse();
    var wishlistPagingModel = new PagingModel(wishlistContent.iterator(), wishlistContent.size());
    
    if (params.start.submitted) {
    	wishlistPagingModel.setStart(params.start.intValue);
    }

    if (params.sz.submitted) {
    	wishlistPagingModel.setPageSize(params.sz.intValue);
    } else {
    	wishlistPagingModel.setPageSize(10);
    }
    
    app.getView({
        ProductList: productList.object,
        wishlistPagingModel: wishlistPagingModel,
        ContinueURL: URLUtils.https('Wishlist-WishListForm')
    }).render('account/wishlist/wishlist');
}

/**
 * Uses request parameters to add a product.
 */
function addProduct() {
    var Product = app.getModel('Product');
    var product = Product.get(request.httpParameterMap.pid.stringValue);
    var productOptionModel = product.updateOptionSelection(request.httpParameterMap);

    var ProductList = app.getModel('ProductList');
    var productList = ProductList.get();
    productList.addProduct(product.object, request.httpParameterMap.Quantity.doubleValue || 1, productOptionModel);
}

/**
 * Adds a product given by the HTTP parameter "pid" to the wishlist and displays
 * the updated wishlist.
 */
function add() {
    addProduct();
    if(!empty(session.custom.TargetLocation)) {
    	response.redirect(decodeURI(session.custom.TargetLocation));
    } else {
    	response.redirect(dw.web.URLUtils.https('Wishlist-Show'));
    }
}

function search () {
    app.getForm('wishlist.search').clear();
    app.getView({
        ContinueURL: URLUtils.https('Wishlist-WishListForm')
    }).render('account/wishlist/wishlistresults');
}

/**
 * Set the shipping address for the wishlist.
 * Expects AddressID to be already stored in the httpParameterMap.
 */
function setShippingAddress() {
    var address = null;
    var addressId = request.httpParameterMap.AddressID.stringValue || request.httpParameterMap.editAddress.stringValue;

    if (addressId) {
        address = dw.customer.AddressBook.getAddress(addressId);
    }

    var ProductList = app.getModel('ProductList');
    var productList = ProductList.get();
    Transaction.wrap(function () {
        productList.setShippingAddress(address);
    });
    response.redirect(dw.web.URLUtils.https('Wishlist-Show'));
}

/**
 * Replaces an item in the wishlist.
 */
function replaceProductListItem() {
    var plid = request.httpParameterMap.uuid.stringValue;

    var ProductList = app.getModel('ProductList');


    ProductList = ProductList.get();

    var productListItem = ProductList.getItem(plid);
    if (productListItem !== null) {

        Transaction.wrap(function () {
            ProductList.removeItem(productListItem);
            addProduct();
        });
    }


    app.getView().render('account/wishlist/refreshwishlist');
}

function removeItem() {
	var pid = request.httpParameterMap.pid.stringValue;
	var ProductList = app.getModel('ProductList');
	var productList = ProductList.get();
    
    for each(var item in productList.object.items) {
		if(pid == item.productID) {
			Transaction.wrap(function () {
				productList.removeItem(item);
	        });
			break;
		}
	}
    
    if(!empty(session.custom.TargetLocation)) {
    	response.redirect(decodeURI(session.custom.TargetLocation));
    } else {
    	response.redirect(dw.web.URLUtils.https('Wishlist-Show'));
    }
}

function addItemJson() {
	addProduct();
	let r = require('~/cartridge/scripts/util/Response');
    r.renderJSON({
        success: true
    });
    return;
}

function addAllItem() {
    var Product = app.getModel('Product');
    var ProductList = app.getModel('ProductList');
    var productList = ProductList.get();
    let r = require('~/cartridge/scripts/util/Response');

    var pids = request.httpParameterMap.pid.stringValue;
    if(pids) {
        pids = pids.split(',');
        for each(var pid in pids) {
            var product = Product.get(pid);
            var productOptionModel = product.updateOptionSelection(request.httpParameterMap);
            productList.addProduct(product.object, 1, productOptionModel);
        } 
    }
}

function addAllItemJson() {
    var Product = app.getModel('Product');
    var ProductList = app.getModel('ProductList');
    var productList = ProductList.get();
    let r = require('~/cartridge/scripts/util/Response');

    var pids = request.httpParameterMap.pid.stringValue;
    if(pids) {
        pids = pids.split(',');
        for each(var pid in pids) {
            var product = Product.get(pid);
            var productOptionModel = product.updateOptionSelection(request.httpParameterMap);
            productList.addProduct(product.object, 1, productOptionModel);
        }        
        return r.renderJSON({
            success: true
        });
    }
    return r.renderJSON({
        success: false
    });
}

function removeItemJson() {
	var pid = request.httpParameterMap.pid.stringValue;
	var ProductList = app.getModel('ProductList');
	var productList = ProductList.get();
    
    for each(var item in productList.object.items) {
		if(pid == item.productID) {
			Transaction.wrap(function () {
				productList.removeItem(item);
	        });
			break;
		}
	}
    
    let r = require('~/cartridge/scripts/util/Response');
    r.renderJSON({
        success: true
    });
    return;
}

function showButton() {
	var pid = request.httpParameterMap.pid.stringValue;
	var Product = app.getModel('Product');
	var product = Product.get(pid);
	
		app.getView({
		pid: request.httpParameterMap.pid.stringValue,
		product: product
	}).render('product/components/productv1/wishlistbtn_v1');
	
	
}

function showLink() {
	var pid = request.httpParameterMap.pid.stringValue;
	var Product = app.getModel('Product');
	var product = Product.get(pid);
	app.getView({
		pid: request.httpParameterMap.pid.stringValue,
		product: product
	}).render('account/wishlist/wishlistlink');
}

/*
 * Module exports
 */

/*
 * Web exposed methods
 */
// own wishlist
/** @see module:controllers/Wishlist~Add */
exports.Add = guard.ensure(['get', 'https', 'loggedIn'], add, {scope: 'wishlist'});
/** @see module:controllers/Wishlist~Show */
exports.Show = guard.ensure(['get', 'https', 'loggedIn'], show, {scope: 'wishlist'});
/** @see module:controllers/Wishlist~ReplaceProductListItem */
exports.ReplaceProductListItem = guard.ensure(['get', 'https', 'loggedIn'], replaceProductListItem, {scope: 'wishlist'});
/** @see module:controllers/Wishlist~SetShippingAddress */
exports.SetShippingAddress = guard.ensure(['get', 'https', 'loggedIn'], setShippingAddress, {scope: 'wishlist'});

// others wishlist
/** @see module:controllers/Wishlist~Search */
exports.Search = guard.ensure(['get', 'https'], search);
/** @see module:controllers/Wishlist~ShowOther */
exports.ShowOther = guard.ensure(['get', 'https'], showOther);

// form handlers
/** @see module:controllers/Wishlist~LandingForm */
exports.LandingForm = guard.ensure(['post', 'https', 'csrf'], landingForm);
/** @see module:controllers/Wishlist~WishListForm */
exports.WishListForm = guard.ensure(['post', 'https', 'loggedIn'], wishListForm, {scope: 'wishlist'});

exports.RemoveItem = guard.ensure(['get', 'https', 'loggedIn'], removeItem);

exports.AddItemJson = guard.ensure(['get', 'https', 'loggedIn'], addItemJson);

exports.RemoveItemJson = guard.ensure(['get', 'https', 'loggedIn'], removeItemJson);

exports.ShowButton = guard.ensure(['get'], showButton);

exports.AddProduct = guard.ensure(['post'], addProduct);

exports.AddAllItemJson = guard.ensure(['post', 'https', 'loggedIn'], addAllItemJson);

exports.AddAllItem = guard.ensure(['post', 'https', 'loggedIn'], addAllItem);

exports.ShowLink = guard.ensure(['get'], showLink);