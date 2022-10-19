
module.exports = function (containerElement) {
    if (!containerElement) {
        // eslint-disable-next-line no-console
        console.error('Braintree: No container for showing loaders');
    }
    function Constructor() {
        this.containerEl = containerElement;
    }
    Constructor.prototype.show = function () {
        this.containerEl.style.display = 'block';
    };
    Constructor.prototype.hide = function () {
        this.containerEl.style.display = 'none';
    };
    return new Constructor();
};
