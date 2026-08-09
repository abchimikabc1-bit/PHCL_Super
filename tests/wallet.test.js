/**
 * Automated Test Suite for Automatic 18-Word Mnemonic, Transaction PIN Authorization, Password Change & Master PHCL Treasury
 */

const assert = require('assert');
const { walletService } = require('../wallet_service');

describe('Automatic 18-Word Mnemonic & Password Management Test Suite', () => {
  const userUid = 'usr_wallet_18words_test';
  const userEmail = 'wallet18@domain.com';

  test('Creates user wallet with automatic 18-word mnemonic passphrase', () => {
    const wRes = walletService.createUserWallet(userUid, userEmail, 'Kamanda 18 Words', '1234');

    assert.ok(wRes.walletId.startsWith('wlt_usr_'));
    const words = wRes.mnemonicPassphrase18.split(' ');
    assert.strictEqual(words.length, 18);
  });

  test('Rejects Admin Password Change when confirm password does not match', () => {
    assert.throws(
      () => walletService.changeAdminPassword('admin123', 'NewAdminSecret99!', 'MismatchPassword'),
      /Password mpya hazifanani/
    );
  });

  test('Changes Admin Master Password securely with double-entry matching', () => {
    const changeRes = walletService.changeAdminPassword('admin123', 'NewAdminSecret99!', 'NewAdminSecret99!');
    assert.strictEqual(changeRes.success, true);

    const isValidNew = walletService.verifyAdminPassword('NewAdminSecret99!');
    assert.strictEqual(isValidNew, true);
  });

  test('Rejects User PIN Change when confirm PIN does not match', () => {
    assert.throws(
      () => walletService.changeUserTransactionPin(userUid, '1234', '5678', '9999'),
      /PIN mpya hazifanani/
    );
  });

  test('Changes User Transaction PIN securely with double-entry matching', () => {
    const changePinRes = walletService.changeUserTransactionPin(userUid, '1234', '5678', '5678');
    assert.strictEqual(changePinRes.success, true);
  });

  test('Recovers wallet via Email OTP & Liveness Selfie', () => {
    const recoveryRes = walletService.recoverWalletPassphrase(userUid, {
      emailOtp: '123456',
      livenessVerified: true,
    });

    assert.strictEqual(recoveryRes.success, true);
    assert.strictEqual(recoveryRes.newAutomatedPassphrase18.split(' ').length, 18);
  });

  test('Rejects transaction when Transaction PIN is invalid', async () => {
    await assert.rejects(
      async () => {
        await walletService.withdrawFromWallet(userUid, {
          amount: 5000,
          currency: 'TZS',
          destinationProvider: 'MPESA',
          destinationAccount: '0755112233',
          transactionPin: '9999', // Wrong PIN
        });
      },
      /Transaction PIN Sio Sahihi/
    );
  });

  test('Deposits funds to user wallet with new Transaction PIN', async () => {
    const depRes = await walletService.depositToWallet(userUid, {
      amount: 50000,
      currency: 'TZS',
      provider: 'MPESA',
      phoneNumber: '0755998877',
      transactionPin: '5678', // New PIN
    });

    assert.strictEqual(depRes.success, true);
    assert.strictEqual(depRes.newBalanceTZS, 150000);
  });

  test('Executes P2P Cross-Network Transfer with valid Transaction PIN and 1.5% PHCL Master Treasury Split', async () => {
    const p2pRes = await walletService.transferCrossNetwork(userUid, {
      recipientIdentifier: '0715123456',
      amount: 10000,
      currency: 'TZS',
      recipientNetwork: 'TIGOPESA',
      transactionPin: '5678', // New PIN
    });

    assert.strictEqual(p2pRes.success, true);
    assert.strictEqual(p2pRes.feeAmount, 150);
  });
});
