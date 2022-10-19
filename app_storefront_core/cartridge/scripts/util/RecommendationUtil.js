'use strict';

var Site = require('dw/system/Site');
var Logger = require('dw/system/Logger');
var StringUtils = require('dw/util/StringUtils');
var ProductListMgr = require('dw/customer/ProductListMgr');
var URLUtils = require('dw/web/URLUtils');
var app = require('app_storefront_controllers/cartridge/scripts/app');
var ArrayList = require('dw/util/ArrayList');
importScript("int_tatcha_dis:common/GetImageUrl.ds");

/**
*   @description This function is used to return user specific recommendations based on the skintype and concerns
*
*   @input persona : String (Required)
*   @input skinType : String (Required)
*   @input skinConcerns : String
*   @input prds : String
*/

function getPrdRecommendations(persona,skinType,skinConcerns,prds,amFilters,pmFilters,amRDK,pmRDK){
	
	var categoryJsonObj = JSON.parse(Site.getCurrent().getCustomPreferenceValue('recommendationCategoriesJSON'));
    var jsonObj = JSON.parse(Site.getCurrent().getCustomPreferenceValue('recommendationJSON'));
    var recommendationConfigObj = JSON.parse(Site.getCurrent().getCustomPreferenceValue('recommendationConfig'));
    var categoryItems = [];       		
	var items = [];
	var lastItems = [];
	var selected = false;
	var skipNextCategory = false;
	var skipMoisturizer = false;
	var skinConcernsSelected = "";
    var amFiltersSelected = "";
    var pmFiltersSelected = "";
	
	//Validate and Remap Skin Concerns, Skin Concerns
	if(typeof(skinConcerns) != 'undefined' && !empty(skinConcerns)){
    	skinConcernsSelected = skinConcerns.split('|');
    	skinConcernsSelected = remapSkinConcerns(skinConcernsSelected,recommendationConfigObj.skinConcerns,recommendationConfigObj.eyeConcerns);
    }

	//selectedt products
    if(typeof(prds) == 'undefined' || empty(prds)){
    	prds = '';
    }
        
    
    
    //Remap skintype
    skinType  = remapSkinType(skinType,recommendationConfigObj.skinType);
    
    
    //Selected Filters 
	if(typeof(amFilters) != 'undefined' && !empty(amFilters)){
		amFiltersSelected = amFilters.split('|');
    }
	
	if(typeof(pmFilters) != 'undefined' && !empty(pmFilters)){
		pmFiltersSelected = pmFilters.split('|');
    }
	
	for each(var subCategory in categoryJsonObj.categories) {
		
	   var categoryItems = []; 
	   var categoryItemsPriorityOrder = [];
	   var selectedItems = []; 
	   	    

	    // Skip the first step if skinType
	   if((skinType == 'Sensitive') && subCategory.name == 'Purify' && subCategory.usageTime == 'AM'){
	    	skipNextCategory = true;
	   }
	    
	   if(skipNextCategory) {
		   skipNextCategory = false;
	   	   continue;	   	    	
	   }

	   if(skipMoisturizer && subCategory.name == 'Hydrate' && subCategory.usageTime == 'PM') {
		   skipMoisturizer = false;
		   continue;
	   }
	   	    
	   /*
	    * Loop to iterate categories
	    */
	   for each(var product in subCategory.products) {
     		
		   // User selected product
		    selected = (prds.indexOf(product) != -1)?true:false;
		   
			//Calculate the score based on the selections
			var scoreSkinType = 0;
     		var score = 0;
     		var temp = jsonObj[product];
     		var hasDirectMapping = false;
  			var hasSkinTypeMapping = false;
     		
  			
     		//Check if there is a direct mapping
     		if(typeof(jsonObj[product]['mappingConcerns']) != 'undefined' && !empty(jsonObj[product]['mappingConcerns'])){
     			hasDirectMapping = checkHasDirectMapping(jsonObj[product]['mappingConcerns'],skinConcernsSelected);
     			hasSkinTypeMapping = checkSkinTypeMapping(jsonObj[product]['mappingConcerns'],skinType);
     			if(hasDirectMapping || hasSkinTypeMapping) {
     				score = 500;
     				scoreSkinType = 300;
     			}	
     		}
     		
			//Calculate the skintype and total score if no direct mapping
     		if(!hasSkinTypeMapping && !hasDirectMapping && typeof(jsonObj[product]) != 'undefined' && !empty(jsonObj[product])){        			
     			if(empty(subCategory.scoreFields) || subCategory.scoreFields == 'skinType') {
	        		if(typeof(jsonObj[product][skinType]) != 'undefined' && !empty(jsonObj[product][skinType])){
	        			score = parseInt(jsonObj[product][skinType]);
	        			scoreSkinType = score;
	        		}
     			}
     				
				if(empty(subCategory.scoreFields) || subCategory.scoreFields == 'skinConcerns') {
	        		for(var i=0;i<skinConcernsSelected.length;i++){
	        			score = score + parseInt(jsonObj[product][skinConcernsSelected[i]]);
	        		}
				}
     		}
     		
     		
     		
     		//Show/hide category / product
     		var showCategory  =  (!selected)?productDisplay(persona,subCategory,hasDirectMapping,skinConcernsSelected,product):true;

     		//Populate product labels
     		var labels = [];
     		if(typeof(jsonObj[product]['labels']) != 'undefined' && !empty(jsonObj[product]['labels'])){
     			labels = getLabels(product,jsonObj[product]['labels'],skinConcernsSelected);
     		}
				
			// Score / direct mapping items
     		categoryItems.push({"name": subCategory.name, "ID": product, "productDetails": "", "usageTime":subCategory.usageTime, "selected":selected, "score":score,"scoreSkinType":scoreSkinType, "type": subCategory.type, "display": showCategory, "label": labels,"filterName": subCategory.filterName}); 
			
     		// priority
     		categoryItemsPriorityOrder.push(product);
			
     		//Selected Items
			if(selected){
				selectedItems.push({"name": subCategory.name, "ID": product, "productDetails": "", "usageTime":subCategory.usageTime, "selected":selected, "score":score,"scoreSkinType":scoreSkinType, "type": subCategory.type, "display": showCategory, "label": labels,"filterName": subCategory.filterName}); 
			}
				 				
     	}	
         
	   /*
	    * End of Loop to iterate categories
	    */
     	
	   
     	//Empty and set only the user selected Items
     	if(selectedItems.length > 0){
     		categoryItems = [];
         	for each(var product in selectedItems) {  
         		categoryItems.push({"name": product.name, "ID": product.ID,"productDetails": "", "usageTime":product.usageTime, "selected":product.selected, "score":product.score,"scoreSkinType":product.scoreSkinType, "type": product.type, "display": product.display, "label": product.label, "filterName": product.filterName}); 
         	}									
     	}	

         //Sort the items based on score
         categoryItems.sort(function(a, b){
			return b.score-a.score
		 });
			
		
		//check for equal scores
		var winItemsArray = [];
		var tempScore = '';
			
        for(var i=0;i<categoryItems.length;i++) {            	            	
         if(i==0) tempScore = categoryItems[i].score;            	            					
		  if(tempScore == categoryItems[i].score){					
			winItemsArray.push(categoryItems[i]);
		  } else {
			break;
		  }						
		  tempScore = categoryItems[i].score;	
         }
         

			
		// Check if priority is defined in case of ties
		/*if(winItemsArray.length > 1 && subCategory.scorePriority =='skinType'){
	        //Sort
	         categoryItems.sort(function(a, b){
	   			return b.scoreSkinType-a.scoreSkinType
			 });
				
	         for(var i=0;i<categoryItems.length;i++) {            	            	
	            if(i==0) tempScore = categoryItems[i].scoreSkinType;            	            					
				if(tempScore == categoryItems[i].scoreSkinType){					
					winItemsArray.push(categoryItems[i]);
				} else {
					break;
				}						
				tempScore = categoryItems[i].scoreSkinType;	
	         }												
		}*/

        // Sort by skintype
		if(winItemsArray.length > 1 && subCategory.scorePriority =='skinType'){
			winItemsArray.sort(function(a, b){
				return b.scoreSkinType-a.scoreSkinType
			});															
		}
			
        // Sort by original priority order
		winItemsArray.sort(function(a, b){  
				return categoryItemsPriorityOrder.indexOf(a.ID) - categoryItemsPriorityOrder.indexOf(b.ID);
		});

        
         
        //Custom product specific logic 
        if(subCategory.usageTime == 'AM' && typeof(winItemsArray[0]) != 'undefined' && !empty(winItemsArray[0]) && winItemsArray[0].ID == 'DP-CLEANSE' ){
			skipNextCategory = true;
		}

		if(subCategory.usageTime == 'PM' && typeof(winItemsArray[0]) != 'undefined' && !empty(winItemsArray[0]) && winItemsArray[0].ID == 'CA08010T' ){
			skipMoisturizer = true;
		}
              
       /* if(subCategory.name == 'RDK' && subCategory.usageTime == 'PM' && (skinType =='Normal to Dry' || skinType =='Dry')){
			skipNextCategory = true;
		}  
*/
        
         
        if(typeof(winItemsArray[0]) != 'undefined' && !empty(winItemsArray[0])){
        		
        	   // Get the catalog info
        	   var productInfo = dw.catalog.ProductMgr.getProduct(winItemsArray[0].ID);
        	   var productDetails = {};
        	   
        	   if(!empty(productInfo)){

        		   	productDetails.name = productInfo.name;
        	   		
        	   		//Get Description
        	   		if(!empty(productInfo.custom.benefitsSection1)){
        	   			productDetails.description = productInfo.custom.benefitsSection1;
        	   		}
        	   		
        	   		//Get Secondary name
        	   		var secondaryName = "";
        	   		if(!empty(productInfo.custom.secondaryName)){
        	   			productDetails.secondaryName = productInfo.custom.secondaryName;
        	   		}
        	   		
        	   		//Get Image
        	   		if(!empty(productInfo.custom.benefitsSection2Image)){
        	   			productDetails.image = ""+productInfo.custom.benefitsSection2Image.getHttpsURL();
        	   		}
        	   		
        	   		// Tile image
        	   		productDetails.tileImage = getImageUrl(productInfo, 'medium').toString();
        	   		
        	   		//Price 
        	   		if(!empty(productInfo.priceModel.price.value)){
        	   			productDetails.price = productInfo.priceModel.price.value;
        	   		}
        	   		
        	   		//Special Price
        	   		if(!empty(productInfo.custom.specialPrice)){
        	   			productDetails.specialPrice = productInfo.custom.specialPrice;
        	   		} else {
        	   			productDetails.specialPrice = "";
        	   		}
        	   		
        	   		//Get the stock status
					var avm = productInfo.availabilityModel;
					var available = avm.availabilityStatus==dw.catalog.ProductAvailabilityModel.AVAILABILITY_STATUS_IN_STOCK
					&& avm.inventoryRecord != null
					&& avm.inventoryRecord.stockLevel.available;
        	   		productDetails.inStock = available;
        	   		
        	   		//Product Url 
        	   		productDetails.url = URLUtils.url('Product-Show','pid',winItemsArray[0].ID).toString();
        	   }
        	  

        	  //Custom product specific logic  
			  if(winItemsArray[0].ID == 'CF06010T' || winItemsArray[0].ID == 'SILK-PEONY-EYE' || winItemsArray[0].ID == 'EYE-CREAM' || winItemsArray[0].ID == 'SPF35' || winItemsArray[0].ID == 'SILK-CANVAS' || winItemsArray[0].ID == 'MED-PEARL-EYE' || winItemsArray[0].ID == 'SKIN-MIST-V2' || winItemsArray[0].ID == 'SATIN-MIST' || winItemsArray[0].ID == 'NECK-CREAM'){
				  lastItems.push({"name": winItemsArray[0].name, "ID": winItemsArray[0].ID,"productDetails": productDetails,"usageTime":winItemsArray[0].usageTime,"selected":winItemsArray[0].selected, "score":winItemsArray[0].score, "scoreSkinType":winItemsArray[0].scoreSkinType, "type": winItemsArray[0].type,"display": winItemsArray[0].display, "label": winItemsArray[0].label, "filterName": winItemsArray[0].filterName}); 			  	
			  } else {
			  	items.push({"name": winItemsArray[0].name, "ID": winItemsArray[0].ID, "productDetails": productDetails,"usageTime":winItemsArray[0].usageTime,"selected":winItemsArray[0].selected, "score":winItemsArray[0].score, "scoreSkinType":winItemsArray[0].scoreSkinType, "type": winItemsArray[0].type,"display": winItemsArray[0].display, "label": winItemsArray[0].label, "filterName": winItemsArray[0].filterName}); 			  	   	  
			  }
        }	 

	 }
	   
	 if(lastItems.length > 0){
	   for(i=0;i<lastItems.length;i++){	 
		   items.push({"name": lastItems[i].name, "ID": lastItems[i].ID,"productDetails": lastItems[i].productDetails,"usageTime":lastItems[i].usageTime,"selected":lastItems[i].selected, "score":lastItems[i].score, "scoreSkinType":lastItems[i].scoreSkinType, "type": lastItems[i].type, "display": lastItems[i].display, "label": lastItems[i].label, "filterName": lastItems[i].filterName}); 			  	   	  	   	
	   }	 
	 }

	var recommendedItems = addItemsMparticle(items);
	var recommendations = sortRecommendations(recommendedItems);

	//User selected filters to display
	recommendations = checkUserSelectedFilters(recommendations,amFiltersSelected,pmFiltersSelected,amRDK,pmRDK);
	
    return recommendations;
}

/**
*   @description This function is used to add details for mParticle response
*
*   @input items : Object
*/
function addItemsMparticle(items) {
	for each(var product in items) {
		// Get the catalog info
 	   var productInfo = dw.catalog.ProductMgr.getProduct(product.ID);
 	   var masterID = productInfo.isVariant() || productInfo.isVariationGroup() ? productInfo.getMasterProduct().getID() : productInfo.getID();
 	   let primaryCategory = !empty(productInfo.getPrimaryCategory()) ? productInfo.getPrimaryCategory().displayName : '';
	   let variant = !empty(productInfo.custom.size) ? productInfo.custom.size : '';
	   let color = !empty(productInfo.custom.color) ? productInfo.custom.color : '';
	   if(color) {
		   variant = color+' | '+variant;
	   }
	   
	   product.masterID = masterID;
	   product.primaryCategory = primaryCategory;
	   product.variant = variant;
 	}
	
	return items;
}


/**
*   @description This function is used to determine if the categpry needs to be shown based on PERSONA and other criterias
*
*   @input persona : String (Default minimalist)
*   @input subCategory : Object
*   @input hasDirectMapping : Boolean
*   @input skinConcernsSelected : Array
*   @input filtersSelected : Array
*/
function productDisplay(persona,subCategory,hasDirectMapping,skinConcernsSelected,product){	
	// show/hide category
    var showCategory  = false;
    if(persona == 'enthusiast'){
    	
    	if(subCategory.name == 'RDK'){
      		showCategory = false;      				
      	}  else {
      		
        	// Hide the category
        	if(subCategory.filterName=='Eye Bridge'){    		
        		for(var i=0;i<skinConcernsSelected.length;i++){
    				if('Dark Circles' == skinConcernsSelected[i]){
    					showCategory = true; 
    					break;
    				} else {
    					showCategory = false; 
    				}
        		}
        		
        	} else if(subCategory.filterName=='Mask' || subCategory.filterName=='Primer' || subCategory.filterName=='Mist' || subCategory.filterName=='Neck Care'){
        		showCategory = false;
        	} else {
        		showCategory = true;
        	}
    	}
    	
     } else if(persona == 'ritualist'){
     	if(subCategory.type == 'core' || hasDirectMapping){
        	showCategory = true;
        }

		if(product == 'CA08010T' && subCategory.usageTime == 'PM') {
			showCategory = true;
		}
      } else {
      	
      	//If minimalist (default)     	  
      	// If no skinConcernsSelected  and RDK    	  
       if(skinConcernsSelected.length == 0) {
      		if(subCategory.name == 'RDK'){
      			return true;       				
      		}      			
      	} 
       
       
       // custom code RDMP-398
       var minimalistConcerns = ['Acne','Eczema','Redness','Pores','Even Texture'];
       if(product == 'CC01110T' && subCategory.usageTime == 'PM'){
    	   for(var i=0;i<skinConcernsSelected.length;i++){	
    		   for(var j=0;j<minimalistConcerns.length;j++){
					if(minimalistConcerns[j] == skinConcernsSelected[i]){
						return true; 
					}
    		   }
    	   }
       }

      	
      	if(hasDirectMapping) {
      		showCategory = true;
      	} else {      		
      		//check if the category has any concerns
      		if(typeof(subCategory['mappingConcerns']) != 'undefined' && !empty(subCategory['mappingConcerns'])){
      			var mappingConcerns = subCategory['mappingConcerns'].split(',');
      			for(var i=0;i<skinConcernsSelected.length;i++){			
					for(var j=0;j<mappingConcerns.length;j++){
						if(mappingConcerns[j] == skinConcernsSelected[i]){
							return true; 
						}
					}
				}      			
      		}
      	}
    }
    
    //Check if any filters are passed (Common for all profiles)
    /*if(typeof(filtersSelected) != 'undefined' && !empty(filtersSelected)){
        if(filtersSelected.length > 0) {
        	for(var i=0;i<filtersSelected.length;i++){
        		if(typeof(filtersSelected[i]) != 'undefined' && !empty(filtersSelected[i]) && typeof(subCategory.filterName) != 'undefined' && !empty(subCategory.filterName)){
            		if(filtersSelected[i].toLowerCase() == subCategory.filterName.toLowerCase()) {
            			return true;
            		}         			
        		}        		
        	}    			
      	}     	
    }*/
    
    return showCategory;
}


/*
 * Util functions
 * 
 */

function checkHasDirectMapping(productConcerns,skinConcernsSelected){
	
	var hasDirectMapping = false;	
 	if(typeof(productConcerns) != 'undefined' && !empty(productConcerns)){
 		var mappingConcerns = productConcerns.split(',');	

		for(var i=0;i<skinConcernsSelected.length;i++){			
			for(var j=0;j<mappingConcerns.length;j++){
				if(mappingConcerns[j] == skinConcernsSelected[i]){
					return true; 
				}
			}
		}				
 	}
 	
 	return hasDirectMapping;
}	


function checkSkinTypeMapping(productConcerns,skinType){
	
	var hasSkinTypeMapping = false;	
 	if(typeof(productConcerns) != 'undefined' && !empty(productConcerns)){
 		var mappingConcerns = productConcerns.split(',');	
 
 		//Check if skintype has direct mapping 
 		for(var i=0;i<mappingConcerns.length;i++){
 			if(skinType == mappingConcerns[i]){
 				return true; 					
 			}		 						
 		} 						 						
 					
 	}
 	
 	return hasSkinTypeMapping;
}

/*
 * This is used to populate the applicable labels for the concerns selected
 */


function getLabels(product,productlabels,skinConcernsSelected){
	
	var labels = [];	
	
	// Skin Concern Labels
	for(var i=0;i<skinConcernsSelected.length;i++){
		if(productlabels.indexOf(skinConcernsSelected[i]) >= 0){
			var label = skinConcernsSelected[i];
			if(skinConcernsSelected[i] == 'Dryness Eyes') {
				label = "Dryness";
				if(labels.toString().indexOf('Dryness') >= 0){
					continue;					
				}
			}
			

			labels.push(label);
		}
	}
 	
 	return labels;
}	
/*
 * Remap functions are used to remap the ID passed to original value
 * example : acne_scars => Acne Scars
 * 
 */

function remapSkinType(selectedSkinType,skinTypes){
	if(typeof(skinTypes[selectedSkinType]) != 'undefined' && !empty(skinTypes[selectedSkinType]) && !empty(skinTypes[selectedSkinType].label) ){
		selectedSkinType = skinTypes[selectedSkinType].label;
	}
	
 	return selectedSkinType;
}


function remapSkinConcerns(selectedSkinConcerns,skinConcerns,eyeConcerns){
	
	var remappedSkinConcerns = [];
	for(var i=0;i<selectedSkinConcerns.length;i++){
		
		//Remap skin concern and eye concerns
		if(typeof(skinConcerns[selectedSkinConcerns[i]]) != 'undefined' && !empty(skinConcerns[selectedSkinConcerns[i]]) && !empty(skinConcerns[selectedSkinConcerns[i]].label) ){
			remappedSkinConcerns.push(skinConcerns[selectedSkinConcerns[i]].label);
		} else if(typeof(eyeConcerns[selectedSkinConcerns[i]]) != 'undefined' && !empty(eyeConcerns[selectedSkinConcerns[i]]) && !empty(eyeConcerns[selectedSkinConcerns[i]].label) ){
			remappedSkinConcerns.push(eyeConcerns[selectedSkinConcerns[i]].label);
		} else {
			remappedSkinConcerns.push(selectedSkinConcerns[i]);
		}
		
	}
 	return remappedSkinConcerns;
}



function getRecommendationSkinTypes() {
	var data = {};
	var skinType = [];
	var eyeConcerns = [];
	var skinConcerns = [];
	var prd = [];
	var Site = require('dw/system/Site');
	var categoryJsonObj = JSON.parse(Site.getCurrent().getCustomPreferenceValue('recommendationConfig'));
	
	if(!empty(categoryJsonObj.skinType)) {
		var skinTypeKeys = Object.keys(categoryJsonObj.skinType);
		if(skinTypeKeys.length > 0) {
			skinTypeKeys.forEach(function(key, index) {
				skinType.push({
					key: key,
					label: categoryJsonObj.skinType[key].label
				});
			});
		}
		data.skinType = skinType;
	}
	
	if(!empty(categoryJsonObj.skinConcerns)) {
		var skinConcernKeys = Object.keys(categoryJsonObj.skinConcerns);
		if(skinConcernKeys.length > 0) {
			skinConcernKeys.forEach(function(key, index) {
				skinConcerns.push({
					key: key,
					label: categoryJsonObj.skinConcerns[key].label
				});
			});
		}
		data.skinConcerns = skinConcerns;
	}
	
	if(!empty(categoryJsonObj.eyeConcerns)) {
		var eyeConcernsKeys = Object.keys(categoryJsonObj.eyeConcerns);
		if(eyeConcernsKeys.length > 0) {
			eyeConcernsKeys.forEach(function(key, index) {
				eyeConcerns.push({
					key: key,
					label: categoryJsonObj.eyeConcerns[key].label
				});
			});
		}
		data.eyeConcerns = eyeConcerns;
	}
	
	 if(!empty(categoryJsonObj.productSelector)) {
		var prdSelector = Object.keys(categoryJsonObj.productSelector);
			if(prdSelector.length > 0) {
				prdSelector.forEach(function(key, index) {
					
					prd.push({
						category: key,
						products: categoryJsonObj.productSelector[key].products
					});
				});
			} 
		data.prd = prd;
	} 
	
	return data;
}


/*
 * This method is used to get the filters that needs to be displayed in UI
 */

function getFilters(recommendations,usageTime){

	var filtersObjs = [];
	
	for(var i =0;i< recommendations.length;i++){
		var searchResults = "";
		
		if(!empty(recommendations[i].filterName)){
			
			var filters = recommendations[i].filterName.split(',');	
			
			for(var j=0;j<filters.length;j++){
			
				if(recommendations[i].usageTime == usageTime){

					searchResults =  filtersObjs.filter(function(filter) {
						return filter.name == filters[j];
					},filters[j]);
					 
					if(empty(searchResults)){
						filtersObjs.push({"name": filters[j],"selected": recommendations[i].display}); 
					} else {						
						if(recommendations[i].display == false){
							filtersObjs.forEach(function (obj) {
								if(obj.name == filters[j]){
									obj.selected = false;										
								}
							});
						}
					}

				} 			
			}

		}
	}
	
	return filtersObjs;
}


/* This is used to sort recommendations based on AM/PM
 * 
 */
function sortRecommendations(recommendations){
	
	var sortedRecommendations = [];
	
	// AM recommendations
	for(var i=0;i<recommendations.length;i++){
		
		if(recommendations[i].usageTime == 'AM'){
			sortedRecommendations.push(recommendations[i]);
		}
	}
	
	//PM recommendations
	for(var i=0;i<recommendations.length;i++){
		if(recommendations[i].usageTime == 'PM'){
			sortedRecommendations.push(recommendations[i]);
		}
	}	
	
 	return sortedRecommendations;
}

/* This is used to set selected filters 
 * 
 */
function checkUserSelectedFilters(results,amFiltersSelected,pmFiltersSelected,amRDK,pmRDK){

	
	// AM recommendations
	if(!empty(amFiltersSelected) && amFiltersSelected.length > 0) {
		
		for(var i=0;i<results.length;i++){
			if(results[i].usageTime == 'AM'){				
				results[i].display = false;	
			}
		}
		
		for(var i=0;i<results.length;i++){
			if(results[i].usageTime == 'AM'){				
				for(var j=0;j<amFiltersSelected.length;j++){
					if(results[i].filterName == amFiltersSelected[j]){						
						results[i].display = true;
					}
				}	
			}
		}
	}
	
	//PM recommendations
	if(!empty(pmFiltersSelected) && pmFiltersSelected.length > 0) {
		
		for(var i=0;i<results.length;i++){
			if(results[i].usageTime == 'PM'){				
				results[i].display = false;	
			}
		}
		
		for(var i=0;i<results.length;i++){
			if(results[i].usageTime == 'PM'){
				for(var j=0;j<pmFiltersSelected.length;j++){
					if(results[i].filterName == pmFiltersSelected[j]){						
						results[i].display = true;
					}
				}	
			}
		}
	}
	
	//If RDK is enabled
	if(typeof(amRDK) != 'undefined' && !empty(amRDK) && (amRDK == 'true')){
		for(var i=0;i<results.length;i++){
			if(results[i].usageTime == 'AM' && results[i].name == 'RDK'){
				results[i].display = true;
				break;
			}
		}
	}
	
	if(typeof(pmRDK) != 'undefined' && !empty(pmRDK) && (pmRDK == 'true')){
		for(var i=0;i<results.length;i++){
			if(results[i].usageTime == 'PM' && results[i].name == 'RDK'){
				results[i].display = true;
				break;
			}
		}
	}	
	
 	return results;
}



function getActiveRecommendations(persona,skinType,skinConcerns,prds,amFilters,pmFilters,amRDK,pmRDK){

	var categoryJsonObj = JSON.parse(Site.getCurrent().getCustomPreferenceValue('recommendationCategoriesJSON'));
	var jsonObj = JSON.parse(Site.getCurrent().getCustomPreferenceValue('recommendationJSON'));
	var recommendationConfigObj = JSON.parse(Site.getCurrent().getCustomPreferenceValue('recommendationConfig'));
	var categoryItems = [];
	var items = [];
	var lastItems = [];
	var selected = false;
	var skipNextCategory = false;
	var skipMoisturizer = false;
	var skinConcernsSelected = "";
	var amFiltersSelected = "";
	var pmFiltersSelected = "";

	//Validate and Remap Skin Concerns, Skin Concerns
	if(typeof(skinConcerns) != 'undefined' && !empty(skinConcerns)){
		skinConcernsSelected = skinConcerns.split('|');
		skinConcernsSelected = remapSkinConcerns(skinConcernsSelected,recommendationConfigObj.skinConcerns,recommendationConfigObj.eyeConcerns);
	}

	//selectedt products
	if(typeof(prds) == 'undefined' || empty(prds)){
		prds = '';
	}



	//Remap skintype
	skinType  = remapSkinType(skinType,recommendationConfigObj.skinType);


	//Selected Filters
	if(typeof(amFilters) != 'undefined' && !empty(amFilters)){
		amFiltersSelected = amFilters.split('|');
	}

	if(typeof(pmFilters) != 'undefined' && !empty(pmFilters)){
		pmFiltersSelected = pmFilters.split('|');
	}

	for each(var subCategory in categoryJsonObj.categories) {

		var categoryItems = [];
		var categoryItemsPriorityOrder = [];
		var selectedItems = [];


		// Skip the first step if skinType
		if((skinType == 'Sensitive') && subCategory.name == 'Purify' && subCategory.usageTime == 'AM'){
			skipNextCategory = true;
		}

		if(skipNextCategory) {
			skipNextCategory = false;
			continue;
		}

		if(skipMoisturizer && subCategory.name == 'Hydrate' && subCategory.usageTime == 'PM') {
			skipMoisturizer = false;
			continue;
		}

		/*
         * Loop to iterate categories
         */
		for each(var product in subCategory.products) {

			// User selected product
			selected = (prds.indexOf(product) != -1)?true:false;

			//Calculate the score based on the selections
			var scoreSkinType = 0;
			var score = 0;
			var temp = jsonObj[product];
			var hasDirectMapping = false;
			var hasSkinTypeMapping = false;


			//Check if there is a direct mapping
			if(typeof(jsonObj[product]['mappingConcerns']) != 'undefined' && !empty(jsonObj[product]['mappingConcerns'])){
				hasDirectMapping = checkHasDirectMapping(jsonObj[product]['mappingConcerns'],skinConcernsSelected);
				hasSkinTypeMapping = checkSkinTypeMapping(jsonObj[product]['mappingConcerns'],skinType);
				if(hasDirectMapping || hasSkinTypeMapping) {
					score = 500;
					scoreSkinType = 300;
				}
			}

			//Calculate the skintype and total score if no direct mapping
			if(!hasSkinTypeMapping && !hasDirectMapping && typeof(jsonObj[product]) != 'undefined' && !empty(jsonObj[product])){
				if(empty(subCategory.scoreFields) || subCategory.scoreFields == 'skinType') {
					if(typeof(jsonObj[product][skinType]) != 'undefined' && !empty(jsonObj[product][skinType])){
						score = parseInt(jsonObj[product][skinType]);
						scoreSkinType = score;
					}
				}

				if(empty(subCategory.scoreFields) || subCategory.scoreFields == 'skinConcerns') {
					for(var i=0;i<skinConcernsSelected.length;i++){
						score = score + parseInt(jsonObj[product][skinConcernsSelected[i]]);
					}
				}
			}



			//Show/hide category / product
			var showCategory  =  (!selected)?productDisplay(persona,subCategory,hasDirectMapping,skinConcernsSelected,product):true;

			//Populate product labels
			var labels = [];
			if(typeof(jsonObj[product]['labels']) != 'undefined' && !empty(jsonObj[product]['labels'])){
				labels = getLabels(product,jsonObj[product]['labels'],skinConcernsSelected);
			}

			// Score / direct mapping items
			categoryItems.push({"name": subCategory.name, "ID": product, "productDetails": "", "usageTime":subCategory.usageTime, "selected":selected, "score":score,"scoreSkinType":scoreSkinType, "type": subCategory.type, "display": showCategory, "label": labels,"filterName": subCategory.filterName});

			// priority
			categoryItemsPriorityOrder.push(product);

			//Selected Items
			if(selected){
				selectedItems.push({"name": subCategory.name, "ID": product, "productDetails": "", "usageTime":subCategory.usageTime, "selected":selected, "score":score,"scoreSkinType":scoreSkinType, "type": subCategory.type, "display": showCategory, "label": labels,"filterName": subCategory.filterName});
			}

		}

		/*
         * End of Loop to iterate categories
         */


		//Empty and set only the user selected Items
		if(selectedItems.length > 0){
			categoryItems = [];
			for each(var product in selectedItems) {
				categoryItems.push({"name": product.name, "ID": product.ID,"productDetails": "", "usageTime":product.usageTime, "selected":product.selected, "score":product.score,"scoreSkinType":product.scoreSkinType, "type": product.type, "display": product.display, "label": product.label, "filterName": product.filterName});
			}
		}

		//Sort the items based on score
		categoryItems.sort(function(a, b){
			return b.score-a.score
		});


		//check for equal scores
		var winItemsArray = [];
		var tempScore = '';

		for(var i=0;i<categoryItems.length;i++) {
			if(i==0) tempScore = categoryItems[i].score;
			if(tempScore == categoryItems[i].score){
				winItemsArray.push(categoryItems[i]);
			} else {
				break;
			}
			tempScore = categoryItems[i].score;
		}



		// Check if priority is defined in case of ties
		/*if(winItemsArray.length > 1 && subCategory.scorePriority =='skinType'){
	        //Sort
	         categoryItems.sort(function(a, b){
	   			return b.scoreSkinType-a.scoreSkinType
			 });

	         for(var i=0;i<categoryItems.length;i++) {
	            if(i==0) tempScore = categoryItems[i].scoreSkinType;
				if(tempScore == categoryItems[i].scoreSkinType){
					winItemsArray.push(categoryItems[i]);
				} else {
					break;
				}
				tempScore = categoryItems[i].scoreSkinType;
	         }
		}*/

		// Sort by skintype
		if(winItemsArray.length > 1 && subCategory.scorePriority =='skinType'){
			winItemsArray.sort(function(a, b){
				return b.scoreSkinType-a.scoreSkinType
			});
		}

		// Sort by original priority order
		winItemsArray.sort(function(a, b){
			return categoryItemsPriorityOrder.indexOf(a.ID) - categoryItemsPriorityOrder.indexOf(b.ID);
		});



		//Custom product specific logic
		if(subCategory.usageTime == 'AM' && typeof(winItemsArray[0]) != 'undefined' && !empty(winItemsArray[0]) && winItemsArray[0].ID == 'DP-CLEANSE' ){
			skipNextCategory = true;
		}

		if(subCategory.usageTime == 'PM' && typeof(winItemsArray[0]) != 'undefined' && !empty(winItemsArray[0]) && winItemsArray[0].ID == 'CA08010T' ){
			skipMoisturizer = true;
		}

		/* if(subCategory.name == 'RDK' && subCategory.usageTime == 'PM' && (skinType =='Normal to Dry' || skinType =='Dry')){
             skipNextCategory = true;
         }
 */


		if(typeof(winItemsArray[0]) != 'undefined' && !empty(winItemsArray[0])){

			// Get the catalog info
			var productInfo = dw.catalog.ProductMgr.getProduct(winItemsArray[0].ID);
			var productDetails = {};

			if(!empty(productInfo)){

				productDetails.name = productInfo.name;

				//Get Description
				if(!empty(productInfo.custom.benefitsSection1)){
					productDetails.description = productInfo.custom.benefitsSection1;
				}

				//Get Secondary name
				var secondaryName = "";
				if(!empty(productInfo.custom.secondaryName)){
					productDetails.secondaryName = productInfo.custom.secondaryName;
				}

				//Get Image
				if(!empty(productInfo.custom.benefitsSection2Image)){
					productDetails.image = ""+productInfo.custom.benefitsSection2Image.getHttpsURL();
				}

				// Tile image
				productDetails.tileImage = getImageUrl(productInfo, 'medium').toString();

				//Price
				if(!empty(productInfo.priceModel.price.value)){
					productDetails.price = productInfo.priceModel.price.value;
				}

				//Special Price
				if(!empty(productInfo.custom.specialPrice)){
					productDetails.specialPrice = productInfo.custom.specialPrice;
				} else {
					productDetails.specialPrice = "";
				}

				//Get the stock status
				var avm = productInfo.availabilityModel;
				var available = avm.availabilityStatus==dw.catalog.ProductAvailabilityModel.AVAILABILITY_STATUS_IN_STOCK
					&& avm.inventoryRecord != null
					&& avm.inventoryRecord.stockLevel.available;
				productDetails.inStock = available;

				//Product Url
				productDetails.url = URLUtils.url('Product-Show','pid',winItemsArray[0].ID).toString();
			}


			//Custom product specific logic
			if(winItemsArray[0].ID == 'CF06010T' || winItemsArray[0].ID == 'SILK-PEONY-EYE' || winItemsArray[0].ID == 'EYE-CREAM' || winItemsArray[0].ID == 'SPF35' || winItemsArray[0].ID == 'SILK-CANVAS' || winItemsArray[0].ID == 'MED-PEARL-EYE' || winItemsArray[0].ID == 'SKIN-MIST-V2' || winItemsArray[0].ID == 'SATIN-MIST' || winItemsArray[0].ID == 'NECK-CREAM'){
				if(winItemsArray[0].display) {
					lastItems.push({"name": winItemsArray[0].name, "ID": winItemsArray[0].ID,"productDetails": productDetails,"usageTime":winItemsArray[0].usageTime,"selected":winItemsArray[0].selected, "score":winItemsArray[0].score, "scoreSkinType":winItemsArray[0].scoreSkinType, "type": winItemsArray[0].type,"display": winItemsArray[0].display, "label": winItemsArray[0].label, "filterName": winItemsArray[0].filterName});
				}
			} else {
				if(winItemsArray[0].display) {
					items.push({"name": winItemsArray[0].name, "ID": winItemsArray[0].ID, "productDetails": productDetails,"usageTime":winItemsArray[0].usageTime,"selected":winItemsArray[0].selected, "score":winItemsArray[0].score, "scoreSkinType":winItemsArray[0].scoreSkinType, "type": winItemsArray[0].type,"display": winItemsArray[0].display, "label": winItemsArray[0].label, "filterName": winItemsArray[0].filterName});
				}
			}
		}

	}

	if(lastItems.length > 0){
		for(i=0;i<lastItems.length;i++){
			if(lastItems[i].display) {
				items.push({"name": lastItems[i].name, "ID": lastItems[i].ID,"productDetails": lastItems[i].productDetails,"usageTime":lastItems[i].usageTime,"selected":lastItems[i].selected, "score":lastItems[i].score, "scoreSkinType":lastItems[i].scoreSkinType, "type": lastItems[i].type, "display": lastItems[i].display, "label": lastItems[i].label, "filterName": lastItems[i].filterName});
			}
		}
	}

	var recommendedItems = addItemsMparticle(items);
	var recommendations = sortRecommendations(recommendedItems);

	//User selected filters to display
	recommendations = checkUserSelectedFilters(recommendations,amFiltersSelected,pmFiltersSelected,amRDK,pmRDK);

	return recommendations;
}

/** export functions **/

module.exports = {
	getPrdRecommendations: getPrdRecommendations,
	getFilters: getFilters,
	remapSkinType: remapSkinType,
	getRecommendationSkinTypes: getRecommendationSkinTypes,
	getActiveRecommendations: getActiveRecommendations
};
