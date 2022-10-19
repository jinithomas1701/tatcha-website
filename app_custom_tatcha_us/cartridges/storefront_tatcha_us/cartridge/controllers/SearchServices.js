'use strict';


var server = require('server');
var URLUtils = require('dw/web/URLUtils');

server.extend(module.superModule);

server.replace('GetSuggestions', function (req, res, next) {


	var SearchSuggest = require('~/cartridge/scripts/search/SearchSuggest');
    var suggest = SearchSuggest(req.httpParameterMap.q.value, 5);
    var suggestionsAvailable = suggest.product.available || suggest.brand.available || suggest.category.available || suggest.content.available || suggest.custom.available;


    res.render('search/searchsuggestions_sfra', {
			suggestionsAvailable : suggestionsAvailable,
			suggest:suggest
    });

    next();
});


module.exports = server.exports();
