var src = require('../braintreeSrc');
var loaderInstance = require('../loaderHelper');

function submitAddSrcAccountForm() {
    $('.js_braintree_addSrcAccountForm').submit(function () {
        var $form = $(this);
        var $btSrcFormErrorContainer = document.querySelector('#braintreeSrcFormErrorContainer');
        $form.spinner().start();

        $.post($form.attr('action'), $form.serialize())
            .done(function (data) {
                $form.spinner().stop();
                if (!data.success) {
                    $btSrcFormErrorContainer.style.display = 'block';
                    $btSrcFormErrorContainer.textContent = data.error;
                } else {
                    location.href = data.redirectUrl;
                }
            })
            .fail(function (err) {
                if (err.responseJSON.redirectUrl) {
                    window.location.href = err.responseJSON.redirectUrl;
                }
                $form.spinner().stop();
            });
        return false;
    });
}

function initAddSrcAccount() {
    var srcIns;
    var $btn = document.querySelector('.js_braintree_src_account_button');
    var $srcNonce = document.querySelector('#braintreeSrcNonce');
    var $btSrcFormErrorContainer = document.querySelector('#braintreeSrcFormErrorContainer');
    var $btSrcLoader = document.querySelector('.braintreeSrcLoader');
    var loader = loaderInstance($btSrcLoader);

    if (JSON.parse($btn.getAttribute('data-is-inited'))) {
        return;
    }
    var config = JSON.parse($btn.getAttribute('data-braintree-config'));

    if (typeof config !== 'object' || config === null) {
        // eslint-disable-next-line no-console
        console.error($btn, 'not valid data-braintree-config');
        return;
    }
    loader.show();

    config.onTokenizePayment = function (data) {
        if ($btSrcFormErrorContainer.style.display === 'block') {
            $btSrcFormErrorContainer.style.display = 'none';
            $btSrcFormErrorContainer.textContent = '';
        }
        $srcNonce.value = data.nonce;
        document.querySelector('.braintreeSrcBtn').click();
    };

    srcIns = src.init(config, $btn);
    srcIns.loadSrcButton();

    $btn.setAttribute('data-is-inited', true);
    submitAddSrcAccountForm();
}

module.exports = {
    initAddSrcAccount
};
