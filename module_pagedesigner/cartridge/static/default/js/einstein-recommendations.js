document.addEventListener("DOMContentLoaded", function() {
    loadProductRecommendations();
    loadCategoryRecommendations();
    loadNoAnchorRecommendations();
    loadRealTimeRecommendations();
});

/**
 * Validates and Return the cquotient namespace provided by the commerce cloud platform
 */
function getEinsteinUtils()  {
    var einsteinUtils = window.CQuotient;
    if (einsteinUtils && (typeof einsteinUtils.getCQUserId == 'function') && (typeof einsteinUtils.getCQCookieId == 'function')) {
        return einsteinUtils;
    }
    return null;
}

/**
 * Gets all product placeholder elements, which hold einstein recommendations queries the details from the 
 * einstein engine and feeds them back to the dom element
 */
function loadProductRecommendations() {
    var einsteinUtils = getEinsteinUtils();
    if (einsteinUtils) {
        var recommendationTiles = Array.from(document.querySelectorAll('.einstein-product-recommendations'));
        recommendationTiles.forEach(parentElement => processRecommendationsTile(parentElement, einsteinUtils, createProductAnchor(parentElement)));
    }
}
/**
 * Processes a recommendation tile, with an already initialized product specific anchors array
 */
function createProductAnchor(parentElement) {
    var einsteinParameters = parentElement.dataset;
    return [{ id: einsteinParameters.primaryProductId, sku: einsteinParameters.secondaryProductId, type: einsteinParameters.alternativeGroupType, alt_id: einsteinParameters.alternativeGroupId }];
}

/**
 * Gets all category placeholder elements, which hold einstein recommendations queries the details from the 
 * einstein engine and feeds them back to the dom element
 */
function loadCategoryRecommendations() {
    var einsteinUtils = getEinsteinUtils();
    if (einsteinUtils) {
        var recommendationTiles = Array.from(document.querySelectorAll('.einstein-category-recommendations'));
        recommendationTiles.forEach(parentElement => processRecommendationsTile(parentElement, einsteinUtils, createCategoryAnchor(parentElement)));
    }
}
/**
 * Rerieves data attributes from parent element and converts to gretel compatible recommenders array
 */
function createCategoryAnchor(parentElement) {
    var einsteinParameters = parentElement.dataset;
    return [{ id: einsteinParameters.categoryId }];
}

/**
 * Gets all placeholder elements, which hold einstein recommendations queries the details from the 
 * einstein engine and feeds them back to the dom element
 */
function loadNoAnchorRecommendations() {
    var einsteinUtils = getEinsteinUtils();
    if (einsteinUtils) {
        var recommendationTiles = Array.from(document.querySelectorAll('.einstein-noanchor-recommendations'));
        recommendationTiles.forEach(parentElement => processRecommendationsTile(parentElement, einsteinUtils));
    }
}

/**
 * Gets all placeholder elements, which hold einstein recommendations queries the details from the
 * einstein engine and feeds them back to the dom element
 */
function loadRealTimeRecommendations() {
    var einsteinUtils = getEinsteinUtils();
    if (einsteinUtils) {
        var recommendationTiles = Array.from(document.querySelectorAll('.einstein-realtime-recommendations'));
        recommendationTiles.forEach(parentElement => processRecommendationsTile(parentElement, einsteinUtils));
    }

}

/**
 * Processes a recommendation tile, with an already initialized category specific anchors array
 */
function processRecommendationsTile(parentElement, einsteinUtils, anchorsArray) {
    var einsteinParameters = parentElement.dataset;
    var recommender = einsteinParameters.recommender;
    
    var params = {
        userId   : einsteinUtils.getCQUserId(),
        cookieId : einsteinUtils.getCQCookieId(),
        ccver    : '1.01'
    };

    if (anchorsArray) {
        params.anchors = anchorsArray;
    };
    
    function recommendationsReceived(einsteinResponse) {
        fillEinsteinDomElement(einsteinResponse, parentElement);
    }

    if (einsteinUtils.getRecs) {
        einsteinUtils.getRecs(einsteinUtils.clientId, recommender, params, recommendationsReceived);
    } else {
        einsteinUtils.widgets = einsteinUtils.widgets || [];
        einsteinUtils.widgets.push({
            recommenderName : einsteinParameters.recommender,
            parameters      : params,
            callback        : recommendationsReceived
        });
    }
}
 
/**
 * Renders the einstein response into a given dom element
 */
async function fillEinsteinDomElement(einsteinResponse, parentElement) {
    var recommendedProducts = einsteinResponse[parentElement.dataset.recommender].recs;

    if (recommendedProducts && recommendedProducts.length > 0) {
        var template = parentElement.dataset.template;
        var components = [];
        var components = recommendedProducts.map(recommendedProduct => {
            var tiledefinition = {};
            tiledefinition.template = template;
            tiledefinition.model = {type: 'product', id : recommendedProduct.id};
            return tiledefinition;
        });

        var url = new URL(parentElement.dataset.productLoadUrl)
        url.searchParams.append('components',JSON.stringify(components));
        url.searchParams.append('limit',parentElement.dataset.limit);

        var response = await fetch(url.href);
        parentElement.innerHTML = await response.text();

        createFlickity(parentElement);
        //this is a work around for loading the yotpo widget in product carousels - currently on page load it is not displaying
        try {
            if (typeof Yotpo !== 'undefined') {
                var api = new Yotpo.API(yotpo);
                api.instance.widgets = [];
                api.refreshWidgets();
            }
        } catch(err){}
    }
}

function createFlickity(elem){
    var flkty = new Flickity( elem, {
        cellAlign:"left",
        contain:true,
        wrapAround:true,
        imagesLoaded:true,
        percentPosition:false,
        freeScroll:true,
        pageDots:true,
        groupCells:true,
        on: {
            ready: function() {
                if($('#gift-recipient').length){
                    setImpression();
                }
            }
          }
    });
}