/**
 * @fileOverview FundCtrl angular controller
 */
'use strict';

define(['./module', 'darkwallet'],
function (controllers, DarkWallet) {

  controllers.controller('FundCtrl', ['$scope', 'modals', 'notify', function($scope, modals, notify) {

  $scope.Object = Object;

  /**
   * Check if we have enough signatures and put them into the transaction
   */
  function finishSigning(fund, task) {
      var tx = fund.finishTransaction(task);

      // Callback listening for radar events
      var broadcastCallback = function(err, data) {
          console.log("radar feedback", data);
          if (err) {
              task.error = "Failed: " + err;
              notify.warning("Failed Broadcasting", "Imported but failed to broadcast " + err);
          } else if (data.type == 'radar' && task.broadcasting) {
              task.broadcasted = true;
              task.radar = data.radar;
              task.broadcasting = false;
              notify.success('Imported', 'Signature imported and sent to broadcaster!');
          } else if (data.type == 'radar') {
              task.radar = data.radar;
              notify.note('Broadcasting', 'Radar: ' + data.radar);
          }
          if (!$scope.$$phase) {
              $scope.$apply();
          }
      };

      // Broadcast
      if (tx) {
          task.broadcasting = true;
          var walletService = DarkWallet.service.wallet;
          walletService.broadcastTx(task.tx, false, broadcastCallback);
      }

      return tx;
  };

  /**
   * Import a signature
   */
  $scope.importFundSig = function(form, task) {

      var fund = $scope.pocket.fund;
      var added;
      try {
          added = fund.importSignature(form.text, task);
      } catch(e) {
          notify.error(e.message);
          return;
      }

      // Show some notification and finish task if we have all signatures.
      if (added) {
          if (finishSigning(fund, task)) {
              // Wait for notification from broadcasting
          } else {
              notify.success('Imported', 'Signature imported');
          }
      } else {
          notify.warning('Error importing', 'Cant verify');
      }
  };


  /**
   * Import a partial transaction into the fund
   */
  $scope.importFundTx = function(form) {
      if (!form.$valid) {
          return;
      }

      var fund = $scope.pocket.fund;
      var frontTask;

      try {
          frontTask = fund.importTransaction(form.newTx);
      } catch(e) {
          notify.error('Error importing', e.message);
          return;
      }

      // Add to tasks
      $scope.pocket.tasks.push(frontTask);
      notify.success('Added transaction');
  };

  /**
   * Continue signing after getting the password
   */
  function finishSignFundTx(password, fund, task, inputs) {
      var identity = DarkWallet.getIdentity();

      var signed = fund.signTransaction(password, task, inputs);

      if (!signed) {
          notify.warning("Transaction was already signed by us");
          return;
      }
      if (finishSigning(fund, task)) {
          notify.success('Signed transaction and ready to go!');
      } else {
          notify.success('Signed transaction');
      }
  };

  /**
   * Sign a transaction with our keys
   */
  $scope.signFundTxForeign = function(form, task) {
      var fund = $scope.pocket.fund;
      var signed;
     
      try {
          signed = fund.signTxForeign(form.foreignKey, task);
      } catch (e) {
          notify.error('Error importing', e.message);
      }

      if (!signed) {
          notify.warning("Could not sign with the given key");
          return;
      }
      if (finishSigning(fund, task)) {
          notify.success('Signed transaction and ready to go!');
      } else {
          notify.success('Signed transaction');
      }
 
  }
 
  /**
   * Sign a transaction with our keys
   */
  $scope.signFundTx = function(task) {
      // import transaction here
      var fund = $scope.pocket.fund;

      var inputs = fund.getValidInputs(task.tx);

      if (inputs.length) {
          modals.password('Unlock password', function(password) { finishSignFundTx(password, fund, task, inputs); } );
      } else {
          notify.error('Error importing', 'Transaction is not for this multisig');
      }
  };

}]);
});
