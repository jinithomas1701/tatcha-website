/**
 * View Helpers are small snippets of code that can be called in your views to help keep isml DRY
 * i.e. Any code that you are repeating regularly can most likely be moved into a helper.
 */

importPackage( dw.system );
importPackage( dw.catalog );

/**
 * Gets a list of online categories that have the showInMenu attribute set to true.
 *
 * @input Category: category A Category list
 * @output subcategories: Array Subcategories for menu
 */
function getSubcategoriesInMenuForCategory(category : Category) : Object {
    var result = [];

    var psm : ProductSearchModel = new ProductSearchModel();
    psm.setCategoryID(category.getID());
    psm.search();
    var psr : ProductSearchRefinements = psm.getRefinements();
    var level1 : Collection = psr.getNextLevelCategoryRefinementValues(category);

    for each (var psrv : ProductSearchRefinementValue in level1) {
        var subCategory :  Category = CatalogMgr.getCategory(psrv.value);
        if (('showInMenu' in subCategory.custom) && subCategory.custom.showInMenu) {
            result.push(subCategory);
        }
    }

    return result;
}

function getTopLevelCategory() : dw.catalog.Category {
    var siteCatalog : dw.catalog.Catalog = dw.catalog.CatalogMgr.getSiteCatalog();
    var root : dw.catalog.Category = null;
    if (siteCatalog != null) {
        root = siteCatalog.getRoot();
    }
    return root;
}

/**
 *	calculates rendering information based on the category using subcategory information
 */
function getSubCategoriesLayout(topCat) {
    var layout = {};
    var subCategories = getSubcategoriesInMenuForCategory(topCat);
    layout.maxColLength = 5;
    layout.subCategories = subCategories;
    layout.banner = !empty(topCat.custom.headerMenuBanner) ? topCat.custom.headerMenuBanner : undefined;
    layout.hasContent = !!(layout.banner || subCategories.length !== 0);
    if ('headerMenuOrientation' in topCat.custom
        && !empty(topCat.custom.headerMenuOrientation)
        && topCat.custom.headerMenuOrientation == 'Horizontal') {
        layout.horizontal = true;
    }
    return layout;
}

/**
 *	Prints out category's alternative url if maintained on custom attribute
 *	uses custom attribute of type MarkupText to be able to maintain url-util styled urls - i.e $url('GiftCert-Purchase')$
 */
function getCategoryUrl(category) {
    var url : dw.web.URL = dw.web.URLUtils.http('Search-Show', 'cgid', category.getID());
    if (('alternativeUrl' in category.custom) && !empty(category.custom.alternativeUrl)) {
        url = category.custom.alternativeUrl;
    }
    return url;
}

/**
 * Isaay images are hosted by Fluid Retail. This small helper will generate the urls for fetching necessary assets
 * by using the following convention:
 *
 * <view-type>isaay_category</view-type>
 *
 *    http://cdn.fluidretail.net/customers/c1442/[productId]/generated/[productId]_[colorId]_1_230x345.jpg
 *
 * Example: http://cdn.fluidretail.net/customers/c1442/LAM-100671/generated/LAM-100671_NUD_1_230x345.jpg
 *
 *
 * <view-type>isaay_recommendation</view-type>
 *
 *    http://cdn.fluidretail.net/customers/c1442/[productId]/generated/[productId]_[colorId]_1_128x192.jpg
 *
 * Example: http://cdn.fluidretail.net/customers/c1442/LAM-100671/generated/LAM-100671_NUD_1_128x192.jpg
 *
 *
 * <view-type>isaay_pdpthumbnail</view-type>
 *
 *    http://cdn.fluidretail.net/customers/c1442/[productId]/generated/[productId]_[colorId]_1_40x60.jpg
 *
 * Example: http://cdn.fluidretail.net/customers/c1442/LAM-100671/generated/LAM-100671_NUD_1_40x60.jpg
 *
 *
 * <view-type>isaay_swatchsmall</view-type>
 *
 *    http://cdn.fluidretail.net/customers/c1442/[productId]/[productId]_swatches_small/thumb_variation_[colorId]_11x11.jpg
 *
 * Example: http://cdn.fluidretail.net/customers/c1442/LAM-100671/LAM-100671_swatches_small/thumb_variation_NUD_11x11.jpg
 *
 *
 * <view-type>isaay_swarchlarge</view-type>
 *
 *    http://cdn.fluidretail.net/customers/c1442/[productId]/[productId]_swatches_large/thumb_variation_[colorId]_23x23.jpg
 *
 * Example: http://cdn.fluidretail.net/customers/c1442/LAM-100671/LAM-100671_swatches_large/thumb_variation_NUD_23x23.jpg
 *
 * <view-type>isaay_cart</view-type>
 *
 *        http://cdn.fluidretail.net/customers/c1442/[productId]/generated/[productId]_[colorId]_1_84x126.jpg
 *
 * Example: http://cdn.fluidretail.net/customers/c1442/LAM-100671/generated/LAM-100671_NUD_1_84x126.jpg
 *
 *
 * <view-type>isaay_pdp</view-type>
 *
 * This image is contained within the Fluid Display zoom component.
 */
function fluidRetailGetImageUrl(type : String, product : dw.catalog.Product, color : String) : String {

    var customer_id = "c1442";
    var p_id = getMasterProductId(product);
    if(empty(color)){
        var color : String = getColorName(product);
    }

    var image_settings = {
        category:       "http://cdn.fluidretail.net/customers/{customer_id}/{id}/generated/{id}_{color}_1_230x345.jpg"
        , recommendation: "http://cdn.fluidretail.net/customers/{customer_id}/{id}/generated/{id}_{color}_1_128x192.jpg"
        , pdpthumbnail:   "http://cdn.fluidretail.net/customers/{customer_id}/{id}/generated/{id}_{color}_1_40x60.jpg"
        , cart:           "http://cdn.fluidretail.net/customers/{customer_id}/{id}/generated/{id}_{color}_1_84x126.jpg"
        , swatchsmall:    "http://cdn.fluidretail.net/customers/{customer_id}/{id}/{id}_swatches_small/thumb_variation_{color}_11x11.jpg"
        , swarchlarge:    "http://cdn.fluidretail.net/customers/{customer_id}/{id}/{id}_swatches_small/thumb_variation_{color}_11x11.jpg"
    };

    if(!type in image_settings) {
        return;
    }

    return image_settings[type].
    replace((new RegExp('{customer_id}','')), customer_id).
    replace((new RegExp('{id}','g')), p_id).
    replace((new RegExp(color?'{color}':'_{color}','')), color||'');
}


/**
 * Gets the color name for a product or its default variation.
 */
function getColorName(product : dw.catalog.Product) : String {
    var currentProduct = getCurrentProduct(product);
    if (currentProduct != null) {
        var variationModel : dw.catalog.ProductVariationModel = currentProduct.variationModel;
        return variationModel.getSelectedValue(variationModel.getProductVariationAttribute('color')).getID();
    }
    return '';
}



/**
 * Returns the current product or its default variation if it is a variation master
 */
function getCurrentProduct(product : dw.catalog.Product) : dw.catalog.Product {

    var currentProduct = product;
    if(!empty(product.master)) {
        if(!empty(product.variationModel.defaultVariant)) {
            currentProduct = product.variationModel.defaultVariant;
        } else if(product.variationModel.variants.length > 0) {
            currentProduct = product.variationModel.variants[0];
        }
    }
    return currentProduct;
}



/**
 * Returns the ID of this product or it's master if it is a variant
 */
function getMasterProductId(product : dw.catalog.Product) : String {
    if(product.isVariant()) {
        var productVariant : dw.catalog.Variant = product;
        return productVariant.getMasterProduct().ID;
    }
    return product.ID;
}

function ViewHelpers() {};
ViewHelpers.isMobile = function() {
    var mobileAgentHash = ["mobile","tablet","phone","ipad","ipod","android","blackberry","windows ce","opera mini","palm"],
        idx = 0,
        item = null,
        isMobile = false,
        userAgent = request.httpUserAgent.toLowerCase();

    while (item = mobileAgentHash[idx++] && !isMobile) {
        isMobile = (userAgent.indexOf(mobileAgentHash[idx]) >= 0);
    }
    return isMobile;
};


ViewHelpers.getFieldOptions = function(formField : dw.web.FormField, resourceFile : String) {
    if (empty(formField.options)) {
        return {};
    }
    var fields = {};

    var opts = formField.options;
    for (o in opts) {
        try {
            if (opts[o] && opts[o].value && opts[o].value.length > 0) {
                var option = opts[o];
                fields[option.value] = dw.web.Resource.msg(option.label, resourceFile, option.label);
            }
        }
        catch (error) {
            if (!fields.error) {
                fields.error = [];
            }
            fields.error.push("Error: "+error);
        }
    }

    return fields;
};

ViewHelpers.getCountriesAndRegions = function(addressForm : dw.web.FormGroup, resource : String) {

    var list = {};
    var countryField = addressForm.country;
    var stateForm = addressForm.states;
    var resourceName = resource || 'forms';

    if (empty(countryField.options)) {
        return list;
    }

    var countryOptions = countryField.options;
    for (var o in countryOptions) {
        try {
            if (countryOptions[o] && countryOptions[o].value && countryOptions[o].value.length > 0) {
                var option = countryOptions[o];
                var stateField = stateForm["state" + option.value];
                var postalField = addressForm["postal" + option.value];
                list[option.value] = {
                    regionLabel: dw.web.Resource.msg(stateField.label, resourceName, stateField.label),
                    regions: ViewHelpers.getFieldOptions(stateField, resourceName),
                    postalLabel: dw.web.Resource.msg(postalField.label, resourceName, postalField.label)
                };
            }
        }
        catch (error) {
            if (!list.error) {
                list.error = [];
            }
            list.error.push("Error: "+error);
        }
    }
    return list;
};

/**
 *	This is for rendering of products marketing flags.
 *	Returns the HTML snippet that is used for Desktop/Mobile
 */
function getProductMarketingFlags(product : dw.catalog.Product) : String {
    var currentProduct = product;
    var excludedCategory=dw.catalog.CatalogMgr.getCategory("excluded_from_sale");
    var hasExcludeCategory = false;
    var onlineCategories=currentProduct.getOnlineCategories();
    var catIterator = onlineCategories.iterator();
    while (catIterator.hasNext()) {
        var category = catIterator.next();
        if(category.ID == "excluded_from_sale") {
            hasExcludeCategory = true;
            break;
        }
    }

    var marketingFlag ='';
    if(hasExcludeCategory)
    {
        marketingFlag = '<span class="product-marketing-flag">'+excludedCategory.displayName +'</span>';
    }

    if (!empty(currentProduct.custom.marketingFlag1) && !empty (currentProduct.custom.marketingFlag2) && !hasExcludeCategory) {
        if(dw.util.StringUtils.trim(currentProduct.custom.marketingFlag1) != '' || dw.util.StringUtils.trim(currentProduct.custom.marketingFlag2) != ''){
            if(dw.util.StringUtils.trim(product.custom.marketingFlag1) !=''){
                marketingFlag = '<span class="product-marketing-flag">'+currentProduct.custom.marketingFlag1+'</span>';
            }

            if(dw.util.StringUtils.trim(currentProduct.custom.marketingFlag1) != '' && dw.util.StringUtils.trim(currentProduct.custom.marketingFlag2) != ''){
                marketingFlag = marketingFlag + '<span class="separator">???</span>';
            }

            if(dw.util.StringUtils.trim(currentProduct.custom.marketingFlag2) !=''){
                marketingFlag = marketingFlag + '<span class="product-marketing-flag">'+currentProduct.custom.marketingFlag2+'</span>';
            }
        }
    }
    if(marketingFlag.length > 0) {
        marketingFlag = '<div class="product-marketing-flag-block">'+marketingFlag+'</div>';
    }

    return marketingFlag;
}
