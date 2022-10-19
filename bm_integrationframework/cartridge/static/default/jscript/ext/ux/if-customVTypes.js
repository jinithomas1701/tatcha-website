if(typeof l10n === 'undefined')
{
    var l10n=function(bundle,key,def)
    {
        return def;
    };
}
Ext.apply(Ext.form.VTypes,{
    numericText: l10n("extjs.customvtypes","msg.error.only_numbers","Only numbers are allowed."),
    numericMask: /[0-9]/,
    numericRe: /^[0-9]+$/,
    numeric :function (v) {
        return this.numericRe.test(v);
    },
//todo locale specific validation//thousand seperator
    decNumText: l10n("extjs.customvtypes","msg.error.only_decimals","Only decimal numbers are allowed."),
    decNumMask: /[0-9.,]/,
    decNumRe: /(^-?\d\d*\.\d*$)|(^-?\d\d*$)|(^-?\.\d\d*$)|(^-?\d\d*\,\d*$)|(^-?\,\d\d*$)/,
    decNum : function (v) {
        return this.decNumRe.test(v);
    },
    alphaNumCommaText: l10n("extjs.customvtypes","msg.error.alpha","This field should only contain letters, numbers, commas, and underscores."),
    alphaNumCommaMask: /[a-z0-9_,]/i,
    alphaNumCommaRe: /^[a-zA-Z0-9_,]+$/,
    alphaNumComma : function (v) {
        return this.alphaNumCommaRe.test(v);
    },
    noLeadingTrailingWhitespace:  function(v) {
        return !(/^[ \s]+|[ \s]+$/.test(v));
    },
    noLeadingTrailingWhitespaceText: l10n("extjs.customvtypes","msg.error.no_whitespace",'The value must not start or end with a whitespace.')
});