'use strict';

/* global braintreeUtils braintree $ VenmoSession */

braintreeUtils.venmo = (function () {
    var bu = braintreeUtils;

    function Constructor(initParams, $btn) {
      var $errorContainer = $('<div class="venmo-error"></div>'); 
      var $loaderContainter = $('<div class="braintree-loader"></div>');
      this.$btn = $btn;
      this.params = initParams;
      
      if (initParams.$errorContainer) {
        $errorContainer = initParams.$errorContainer;
        delete initParams.$errorContainer;
      }

      if (initParams.$loaderContainer) {
          $loaderContainter = initParams.$loaderContainer;
      }

      $btn.after($errorContainer);
      $btn.after($loaderContainter);
      this.er = bu.createErrorInstance($errorContainer[0]);
      this.loader = bu.createLoaderInstance($loaderContainter[0]);
    }

    Constructor.prototype.createVenmo = function () {
        var that = this;
        that.loader.show();

        braintree.client.create({
            authorization: bu.clientToken
          }, function (clientErr, clientInstance) {
            // Stop if there was a problem creating the client.
            // This could happen if there is a network error or if the authorization
            // is invalid.
            if (clientErr) {
              that.er.show(clientErr);
              return;
            }

            braintree.dataCollector.create({
                client: clientInstance,
                paypal: true
            }, function (dataCollectorErr, dataCollectorInstance) {
                if (dataCollectorErr) {
                    that.er.show(dataCollectorErr);
                    return;
                }
                
                $('#braintreeVenmoDeviceData').val(dataCollectorInstance.deviceData);
                that.loader.hide();
            });
            
            braintree.venmo.create({
                client: clientInstance,
                allowNewBrowserTab: false
            }, function (venmoErr, venmoInstance) {
                if (venmoErr) {
                    that.er.show(venmoErr);
                    return;
                }
                
                //Verify browser support before proceeding.
                if (!venmoInstance.isBrowserSupported()) {
                    that.params.deviceNotSupportVenmo();
                    that.loader.hide();
                    return;
                }

                that.$btn.click(function(){     
                    if (!that.params.onClick()) {
                        return;
                    }                  
                    venmoInstance.tokenize(function (tokenizeErr, payload) {
                        that.loader.show();

                        if (tokenizeErr) {
                            handleVenmoError(tokenizeErr);
                        } 
                        else {
                            handleVenmoSuccess(payload);
                        }
                    });
                    return;
                });
              });
        });
       
        function handleVenmoError(err) {
            that.er.show(err);
            that.loader.hide();
          }
        function handleVenmoSuccess(payload) {
            that.params.onTokenizePayment(payload);
          }
    };
    
    function initAccountListAndSaveFunctionality() {
      var $accountsList = $('#braintreeVenmoAccountsList');
      var $saveVenmoAccountCountainerEl = $('#braintreeSaveVenmoAccountContainer');
      var $saveVenmoAccountEl = $('#braintreeSaveVenmoAccount');
      var $venmoAccounMakeDefaultEl = $('#braintreeVenmoAccountMakeDefault');
      var $venmoButton = $('.js_braintree_venmo_button');

      function accountsListChange() { // eslint-disable-line require-jsdoc
          if ($accountsList.val() === 'newaccount') {
              if ($saveVenmoAccountCountainerEl.length) {
                  $saveVenmoAccountCountainerEl.show();
                  $saveVenmoAccountEl[0].checked = true;
                  $saveVenmoAccountEl[0].disabled = false;
              }
              if ($venmoAccounMakeDefaultEl.length) {
                  $venmoAccounMakeDefaultEl[0].disabled = false;
              }
          } else {
              var selectedAccount = window.braintreeUtils.getSelectedData($accountsList[0]);
              if (selectedAccount && $venmoAccounMakeDefaultEl.length) {
                  if (selectedAccount['data-default'].value === 'true') {
                      $venmoAccounMakeDefaultEl[0].disabled = true;
                  } else {
                      $venmoAccounMakeDefaultEl[0].disabled = false;
                  }
                  $venmoAccounMakeDefaultEl[0].checked = true;
                  $venmoButton.hide();
              }
              if ($saveVenmoAccountCountainerEl.length) {
                  $saveVenmoAccountEl[0].checked = false;
                  $saveVenmoAccountCountainerEl.hide();
              }
          }
      }

      $saveVenmoAccountEl.change(function () {
          if ($saveVenmoAccountEl[0].checked) {
              $venmoAccounMakeDefaultEl[0].disabled = false;
              $venmoAccounMakeDefaultEl[0].checked = true;
          } else {
              $venmoAccounMakeDefaultEl[0].disabled = true;
              $venmoAccounMakeDefaultEl[0].checked = false;
          }
      });

      if ($accountsList.length) {
          $accountsList.change(accountsListChange);
          accountsListChange();
      }
  }

    return {
        init: function (params, $btn) {
            var ins = new Constructor(params, $btn);
            bu.clientToken = params.clientToken;
            return ins.createVenmo();
        },
        initAccountListAndSaveFunctionality: initAccountListAndSaveFunctionality
    };
}());