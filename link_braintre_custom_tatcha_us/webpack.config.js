'use strict';

require('shelljs/make');
var path = require('path');

module.exports = [{
    mode: 'development',
    devtool: 'source-map',
    name: 'js',
    entry: {
        'int_braintree_custom.min': `${__dirname}/cartridges/int_braintree_custom_tatcha_us/cartridge/client/default/js/int_braintree_custom.js`
    },
    output: {
        path: path.resolve('./cartridges/int_braintree_custom_tatcha_us/cartridge/static/default/js'),
        filename: '[name].js'
    },
    module: {
        rules: [
            {
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            [
                                '@babel/preset-env',
                                {
                                    targets: {
                                        chrome: '53',
                                        firefox: '49',
                                        edge: '38',
                                        ie: '11',
                                        safari: '10'
                                    }
                                }
                            ]
                        ],
                        plugins: [
                            '@babel/plugin-proposal-object-rest-spread',
                            '@babel/plugin-transform-destructuring']
                    }
                }
            }
        ]
    }
}];