/**
 *  Appends Alerts message
 *
 * Avaible alerts types:
 * primary,  secondary, success, danger, warning, info, alert, dark
 * @param {Object} alert Alerts and type messages
 */
function showAlerts(alert) {
    let alertDiv = document.querySelector('#smart-button-alert-message');
    alertDiv.innerHTML = `<h5>${alert.message}</h5>`;
    alertDiv.className = `alert alert-${alert.type} show`;
    window.scrollTo(0, 0);
}

/**
 *  Fades Alerts message
 */
function fadeAlerts() {
    let alertDiv = document.querySelector('#smart-button-alert-message');
    alertDiv.innerHTML = '';
    alertDiv.className = 'alert alert-success fade';
}

/**
 * Return style configurations for Pay Pal smart button
 * Available values:
 *  height: (number) from 25 to 55,
 *  color: (string) gold, blue, silver, black, white,
 *  shape: (string) pill, rect,
 *  layout: (string) horizontal, vertical,
 *  tagline: (boolean) true, false
 *
 * PLEASE NOTE: 'vertical' layout is not allowed for active tagline
 *
 * @param {Object} object with height, color, shape, layout, label, tagline configs
*/
function getSmartButtonStyleConfigs() {
    return {
        height: Math.floor(document.querySelector('#height__formControlRange').value),
        color: document.querySelector('#color_button').value,
        shape: document.querySelector('#shape_button').value,
        layout: document.querySelector('#layout_button').value,
        label: document.querySelector('#label').value,
        tagline: JSON.parse(document.querySelector('#tagline_button').value)
    };
}

/**
 * Update html option's with saved Pay Pal smart button  values from custom pref PP_API_Smart_Button_Styles
 *
 * @param {Object} savedSmartStyles object with height, color, shape, layout, label, tagline configs
*/
function updateValuesWithStyleConfigs(savedSmartStyles) {
    document.querySelector('#height__formControlNumber').value = savedSmartStyles.height;
    document.querySelector('#height__formControlRange').value = savedSmartStyles.height;
    document.querySelector('#color_button').value = savedSmartStyles.color;
    document.querySelector('#shape_button').value = savedSmartStyles.shape;
    document.querySelector('#layout_button').value = savedSmartStyles.layout;
    document.querySelector('#label').value = savedSmartStyles.label;
    document.querySelector('#tagline_button').value = savedSmartStyles.tagline;
    document.querySelector('#location_button').value = savedSmartStyles.location;
}

document.addEventListener('DOMContentLoaded', function () {
    let pageType = 'billing';
    if (window.location.search.split('=')[0] === '?savedButtonStyle') {
        pageType = window.location.search.split('=')[1];
        window.history.replaceState(null, null, window.location.pathname);
    }

    let smartButtonConfig = JSON.parse(document.getElementById('smartbutton-config-form').getAttribute('data-smart-styles'))[pageType];
    smartButtonConfig.location = pageType;
    updateValuesWithStyleConfigs(smartButtonConfig);

    window.paypal.Buttons({
        onInit: (_, actions) => {
            return actions.disable();
        },
        createOrder: () => { },
        onApprove: () => { },
        onCancel: () => { },
        onError: () => { },
        style: JSON.parse(document.getElementById('smartbutton-config-form').getAttribute('data-smart-styles'))[pageType]
    }).render('.paypal-cart-button');
});

document.querySelector('#color_button').addEventListener('change', () => {
    document.querySelector('.paypal-cart-button').innerHTML = '';
    fadeAlerts();
    window.paypal.Buttons({
        onInit: (_, actions) => {
            return actions.disable();
        },
        createOrder: () => { },
        onApprove: () => { },
        onCancel: () => { },
        onError: () => { },
        style: getSmartButtonStyleConfigs()
    }).render('.paypal-cart-button')
});
document.querySelector('#label').addEventListener('change', () => {
    document.querySelector('.paypal-cart-button').innerHTML = '';
    fadeAlerts();
    window.paypal.Buttons({
        onInit: (_, actions) => {
            return actions.disable();
        },
        createOrder: () => { },
        onApprove: () => { },
        onCancel: () => { },
        onError: () => { },
        style: getSmartButtonStyleConfigs()
    }).render('.paypal-cart-button');
});

document.querySelector('#height__formControlRange').addEventListener('change', () => {
    document.querySelector('.paypal-cart-button').innerHTML = '';
    fadeAlerts();
    document.querySelector('#height__formControlNumber').value = document.querySelector('#height__formControlRange').value;
    window.paypal.Buttons({
        onInit: (_, actions) => {
            return actions.disable();
        },
        createOrder: () => { },
        onApprove: () => { },
        onCancel: () => { },
        onError: () => { },
        style: getSmartButtonStyleConfigs()
    }).render('.paypal-cart-button');
});

document.querySelector('#height__formControlNumber').addEventListener('change', () => {
    fadeAlerts();
    document.querySelector('#height__formControlRange').value = document.querySelector('#height__formControlNumber').value;
    const event = document.createEvent('Event');
    event.initEvent('change', true, true);

    // Dispatch the event
    document.querySelector('#height__formControlRange').dispatchEvent(event);
});

document.querySelector('#shape_button').addEventListener('change', () => {
    document.querySelector('.paypal-cart-button').innerHTML = '';
    fadeAlerts();
    window.paypal.Buttons({
        onInit: (_, actions) => {
            return actions.disable();
        },
        createOrder: () => { },
        onApprove: () => { },
        onCancel: () => { },
        onError: () => { },
        style: getSmartButtonStyleConfigs()
    }).render('.paypal-cart-button');
});

document.querySelector('#layout_button').addEventListener('change', () => {
    document.querySelector('.paypal-cart-button').innerHTML = '';
    fadeAlerts();
    // vertical layout is not allowed for active tagline
    let isTaglineButton = JSON.parse(document.querySelector('#tagline_button').value);
    let isLayoutVertical = document.querySelector('#layout_button').value === 'vertical';
    if (isTaglineButton && isLayoutVertical) {
        document.querySelector('#tagline_button').value = false;
        showAlerts(window.resourcesAlertMessages.layout);
    }

    window.paypal.Buttons({
        onInit: (_, actions) => {
            return actions.disable();
        },
        createOrder: () => { },
        onApprove: () => { },
        onCancel: () => { },
        onError: () => { },
        style: getSmartButtonStyleConfigs()
    }).render('.paypal-cart-button');
});

document.querySelector('#tagline_button').addEventListener('change', () => {
    document.querySelector('.paypal-cart-button').innerHTML = '';
    fadeAlerts();
    // style.tagline is not allowed for vertical layout
    let isTaglineButton = JSON.parse(document.querySelector('#tagline_button').value);
    let isLayoutVertical = document.querySelector('#layout_button').value === 'vertical';
    if (isTaglineButton && isLayoutVertical) {
        document.querySelector('#layout_button').value = 'horizontal';
        showAlerts(window.resourcesAlertMessages.tagline);
    }

    window.paypal.Buttons({
        onInit: (_, actions) => {
            return actions.disable();
        },
        createOrder: () => { },
        onApprove: () => { },
        onCancel: () => { },
        onError: () => { },
        style: getSmartButtonStyleConfigs()
    }).render('.paypal-cart-button');
});

document.querySelector('#location_button').addEventListener('change', () => {
    document.querySelector('.paypal-cart-button').innerHTML = '';
    fadeAlerts();
    let savedSmartStyles = JSON.parse(document.getElementById('smartbutton-config-form').getAttribute('data-smart-styles'));
    let locationButton = document.querySelector('#location_button').value;
    savedSmartStyles[locationButton].location = locationButton;
    updateValuesWithStyleConfigs(savedSmartStyles[locationButton]);

    window.paypal.Buttons({
        onInit: (_, actions) => {
            return actions.disable();
        },
        createOrder: () => { },
        onApprove: () => { },
        onCancel: () => { },
        onError: () => { },
        style: savedSmartStyles[locationButton]
    }).render('.paypal-cart-button').then(function () {
        window.scrollTo(0, 0);
    });
});

document.getElementById('smartbutton-config-form').addEventListener('submit', (e) => {
    e.preventDefault();
    jQuery.post(e.currentTarget.action, e.currentTarget.serialize())
        .done(function (data) {
            location.href = data.redirectUrl;
        })
        .fail(function (err) {
            showAlerts({
                message: err.responseText,
                type: 'danger'
            });
        });
    return false;
});
