import assert from 'node:assert/strict';
import {
  randomUUID,
} from 'node:crypto';
import {
  after,
  before,
  test,
} from 'node:test';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  atomicAmountToDisplay,
  displayAmountToAtomic,
  getServerFinancialAccount,
  runServerFinancialMutation,
  runServerFinancialTransfer,
} from '@/lib/server-financial-ledger';

const TEST_PREFIX =
  `ledger-test-${randomUUID()}`;

const createdAccountIds =
  new Set<string>();

const createdOperationIds =
  new Set<string>();

const createdLedgerIds =
  new Set<string>();

function uid(
  name: string,
): string {
  const value =
    `${TEST_PREFIX}-${name}`;

  createdAccountIds.add(
    value,
  );

  return value;
}

function operationId(
  name: string,
): string {
  const value =
    `${TEST_PREFIX}:${name}`;

  createdOperationIds.add(
    value,
  );

  return value;
}

function rememberLedger(
  ledgerEntryId: string,
): void {
  createdLedgerIds.add(
    ledgerEntryId,
  );
}

async function deleteIfExists(
  collectionName: string,
  documentId: string,
): Promise<void> {
  await adminDb
    .collection(
      collectionName,
    )
    .doc(
      documentId,
    )
    .delete()
    .catch(
      () => undefined,
    );
}

before(
  () => {
    assert.ok(
      process.env.FIRESTORE_EMULATOR_HOST,
      [
        '',
        'FIRESTORE_EMULATOR_HOST is missing.',
        'Run this suite through Firebase Emulator.',
        '',
      ].join(
        '\n',
      ),
    );
  },
);

after(
  async () => {
    await Promise.all(
      [
        ...createdLedgerIds,
      ].map(
        (id) =>
          deleteIfExists(
            'financial_ledger',
            id,
          ),
      ),
    );

    await Promise.all(
      [
        ...createdOperationIds,
      ].map(
        (id) =>
          deleteIfExists(
            'financial_operations',
            id,
          ),
      ),
    );

    await Promise.all(
      [
        ...createdAccountIds,
      ].map(
        (id) =>
          deleteIfExists(
            'financial_accounts',
            id,
          ),
      ),
    );
  },
);

test(
  'new financial account starts with zero atomic balances',
  async () => {
    const userUid =
      uid(
        'zero-account',
      );

    const account =
      await getServerFinancialAccount(
        userUid,
      );

    assert.deepEqual(
      account.balancesAtomic,
      {
        usd: '0',
        tzs: '0',
        ntzs: '0',
        pi: '0',
      },
    );
  },
);

test(
  'USD display amount converts exactly to cents',
  () => {
    assert.equal(
      displayAmountToAtomic(
        '19.99',
        'USD',
      ),
      '1999',
    );

    assert.equal(
      atomicAmountToDisplay(
        '1999',
        'USD',
      ),
      '19.99',
    );
  },
);

test(
  'TZS uses integer shilling atomic units',
  () => {
    assert.equal(
      displayAmountToAtomic(
        '5000',
        'TZS',
      ),
      '5000',
    );

    assert.equal(
      atomicAmountToDisplay(
        '5000',
        'TZS',
      ),
      '5000',
    );
  },
);

test(
  'nTZS uses integer digital-shilling atomic units',
  () => {
    assert.equal(
      displayAmountToAtomic(
        '2640',
        'NTZS',
      ),
      '2640',
    );

    assert.equal(
      atomicAmountToDisplay(
        '2640',
        'NTZS',
      ),
      '2640',
    );
  },
);

test(
  'PI supports exactly eight decimal places',
  () => {
    assert.equal(
      displayAmountToAtomic(
        '1.23456789',
        'PI',
      ),
      '123456789',
    );

    assert.equal(
      atomicAmountToDisplay(
        '123456789',
        'PI',
      ),
      '1.23456789',
    );
  },
);

test(
  'PI rejects precision beyond eight decimal places',
  () => {
    assert.throws(
      () =>
        displayAmountToAtomic(
          '1.234567891',
          'PI',
        ),
      /Too many decimal places/,
    );
  },
);

test(
  'server credit creates authoritative balance, ledger and operation',
  async () => {
    const userUid =
      uid(
        'credit',
      );

    const opId =
      operationId(
        'credit',
      );

    const result =
      await runServerFinancialMutation(
        {
          operationId:
            opId,

          uid:
            userUid,

          operationType:
            'DEPOSIT',

          asset:
            'TZS',

          direction:
            'CREDIT',

          amountAtomic:
            '10000',

          description:
            'Ledger emulator test deposit',

          metadata: {
            test:
              true,
          },
        },
      );

    rememberLedger(
      result.ledgerEntryId,
    );

    assert.equal(
      result.idempotent,
      false,
    );

    assert.equal(
      result.balanceBeforeAtomic,
      '0',
    );

    assert.equal(
      result.balanceAfterAtomic,
      '10000',
    );

    const account =
      await getServerFinancialAccount(
        userUid,
      );

    assert.equal(
      account.balancesAtomic.tzs,
      '10000',
    );

    const ledgerSnapshot =
      await adminDb
        .collection(
          'financial_ledger',
        )
        .doc(
          result.ledgerEntryId,
        )
        .get();

    assert.equal(
      ledgerSnapshot.exists,
      true,
    );

    const operationSnapshot =
      await adminDb
        .collection(
          'financial_operations',
        )
        .doc(
          opId,
        )
        .get();

    assert.equal(
      operationSnapshot.exists,
      true,
    );

    assert.equal(
      operationSnapshot.data()?.status,
      'COMPLETED',
    );
  },
);

test(
  'server debit subtracts from authoritative balance',
  async () => {
    const userUid =
      uid(
        'debit',
      );

    const creditOperationId =
      operationId(
        'debit-seed',
      );

    const debitOperationId =
      operationId(
        'debit-operation',
      );

    const credit =
      await runServerFinancialMutation(
        {
          operationId:
            creditOperationId,

          uid:
            userUid,

          operationType:
            'DEPOSIT',

          asset:
            'USD',

          direction:
            'CREDIT',

          amountAtomic:
            '5000',
        },
      );

    rememberLedger(
      credit.ledgerEntryId,
    );

    const debit =
      await runServerFinancialMutation(
        {
          operationId:
            debitOperationId,

          uid:
            userUid,

          operationType:
            'PURCHASE',

          asset:
            'USD',

          direction:
            'DEBIT',

          amountAtomic:
            '1250',
        },
      );

    rememberLedger(
      debit.ledgerEntryId,
    );

    assert.equal(
      debit.balanceBeforeAtomic,
      '5000',
    );

    assert.equal(
      debit.balanceAfterAtomic,
      '3750',
    );

    const account =
      await getServerFinancialAccount(
        userUid,
      );

    assert.equal(
      account.balancesAtomic.usd,
      '3750',
    );
  },
);

test(
  'debit cannot make an account negative',
  async () => {
    const userUid =
      uid(
        'insufficient',
      );

    const opId =
      operationId(
        'insufficient',
      );

    await assert.rejects(
      runServerFinancialMutation(
        {
          operationId:
            opId,

          uid:
            userUid,

          operationType:
            'WITHDRAWAL',

          asset:
            'TZS',

          direction:
            'DEBIT',

          amountAtomic:
            '1',
        },
      ),
      /Insufficient funds/,
    );

    const account =
      await getServerFinancialAccount(
        userUid,
      );

    assert.equal(
      account.balancesAtomic.tzs,
      '0',
    );

    const operationSnapshot =
      await adminDb
        .collection(
          'financial_operations',
        )
        .doc(
          opId,
        )
        .get();

    assert.equal(
      operationSnapshot.exists,
      false,
    );
  },
);

test(
  'same operation ID and same mutation is idempotent',
  async () => {
    const userUid =
      uid(
        'idempotent',
      );

    const opId =
      operationId(
        'idempotent',
      );

    const first =
      await runServerFinancialMutation(
        {
          operationId:
            opId,

          uid:
            userUid,

          operationType:
            'DEPOSIT',

          asset:
            'NTZS',

          direction:
            'CREDIT',

          amountAtomic:
            '7500',
        },
      );

    rememberLedger(
      first.ledgerEntryId,
    );

    const second =
      await runServerFinancialMutation(
        {
          operationId:
            opId,

          uid:
            userUid,

          operationType:
            'DEPOSIT',

          asset:
            'NTZS',

          direction:
            'CREDIT',

          amountAtomic:
            '7500',
        },
      );

    rememberLedger(
      second.ledgerEntryId,
    );

    assert.equal(
      first.idempotent,
      false,
    );

    assert.equal(
      second.idempotent,
      true,
    );

    assert.equal(
      second.balanceAfterAtomic,
      '7500',
    );

    const account =
      await getServerFinancialAccount(
        userUid,
      );

    assert.equal(
      account.balancesAtomic.ntzs,
      '7500',
    );
  },
);

test(
  'operation ID cannot be reused for a different mutation',
  async () => {
    const userUid =
      uid(
        'operation-reuse',
      );

    const opId =
      operationId(
        'operation-reuse',
      );

    const first =
      await runServerFinancialMutation(
        {
          operationId:
            opId,

          uid:
            userUid,

          operationType:
            'DEPOSIT',

          asset:
            'TZS',

          direction:
            'CREDIT',

          amountAtomic:
            '100',
        },
      );

    rememberLedger(
      first.ledgerEntryId,
    );

    await assert.rejects(
      runServerFinancialMutation(
        {
          operationId:
            opId,

          uid:
            userUid,

          operationType:
            'DEPOSIT',

          asset:
            'TZS',

          direction:
            'CREDIT',

          amountAtomic:
            '101',
        },
      ),
      /already been used/,
    );

    const account =
      await getServerFinancialAccount(
        userUid,
      );

    assert.equal(
      account.balancesAtomic.tzs,
      '100',
    );
  },
);

test(
  'transfer atomically debits sender and credits recipient',
  async () => {
    const senderUid =
      uid(
        'transfer-sender',
      );

    const recipientUid =
      uid(
        'transfer-recipient',
      );

    const seedOperationId =
      operationId(
        'transfer-seed',
      );

    const transferOperationId =
      operationId(
        'transfer',
      );

    const seed =
      await runServerFinancialMutation(
        {
          operationId:
            seedOperationId,

          uid:
            senderUid,

          operationType:
            'DEPOSIT',

          asset:
            'PI',

          direction:
            'CREDIT',

          amountAtomic:
            '200000000',
        },
      );

    rememberLedger(
      seed.ledgerEntryId,
    );

    const transfer =
      await runServerFinancialTransfer(
        {
          operationId:
            transferOperationId,

          senderUid,

          recipientUid,

          asset:
            'PI',

          amountAtomic:
            '75000000',

          description:
            'Ledger emulator transfer test',
        },
      );

    rememberLedger(
      transfer.senderLedgerEntryId,
    );

    rememberLedger(
      transfer.recipientLedgerEntryId,
    );

    assert.equal(
      transfer.idempotent,
      false,
    );

    assert.equal(
      transfer.senderBalanceBeforeAtomic,
      '200000000',
    );

    assert.equal(
      transfer.senderBalanceAfterAtomic,
      '125000000',
    );

    assert.equal(
      transfer.recipientBalanceBeforeAtomic,
      '0',
    );

    assert.equal(
      transfer.recipientBalanceAfterAtomic,
      '75000000',
    );

    const sender =
      await getServerFinancialAccount(
        senderUid,
      );

    const recipient =
      await getServerFinancialAccount(
        recipientUid,
      );

    assert.equal(
      sender.balancesAtomic.pi,
      '125000000',
    );

    assert.equal(
      recipient.balancesAtomic.pi,
      '75000000',
    );
  },
);

test(
  'same transfer operation is idempotent and does not transfer twice',
  async () => {
    const senderUid =
      uid(
        'transfer-idempotent-sender',
      );

    const recipientUid =
      uid(
        'transfer-idempotent-recipient',
      );

    const seedOperationId =
      operationId(
        'transfer-idempotent-seed',
      );

    const transferOperationId =
      operationId(
        'transfer-idempotent-operation',
      );

    const seed =
      await runServerFinancialMutation(
        {
          operationId:
            seedOperationId,

          uid:
            senderUid,

          operationType:
            'DEPOSIT',

          asset:
            'USD',

          direction:
            'CREDIT',

          amountAtomic:
            '10000',
        },
      );

    rememberLedger(
      seed.ledgerEntryId,
    );

    const first =
      await runServerFinancialTransfer(
        {
          operationId:
            transferOperationId,

          senderUid,

          recipientUid,

          asset:
            'USD',

          amountAtomic:
            '2500',
        },
      );

    rememberLedger(
      first.senderLedgerEntryId,
    );

    rememberLedger(
      first.recipientLedgerEntryId,
    );

    const second =
      await runServerFinancialTransfer(
        {
          operationId:
            transferOperationId,

          senderUid,

          recipientUid,

          asset:
            'USD',

          amountAtomic:
            '2500',
        },
      );

    rememberLedger(
      second.senderLedgerEntryId,
    );

    rememberLedger(
      second.recipientLedgerEntryId,
    );

    assert.equal(
      first.idempotent,
      false,
    );

    assert.equal(
      second.idempotent,
      true,
    );

    const sender =
      await getServerFinancialAccount(
        senderUid,
      );

    const recipient =
      await getServerFinancialAccount(
        recipientUid,
      );

    assert.equal(
      sender.balancesAtomic.usd,
      '7500',
    );

    assert.equal(
      recipient.balancesAtomic.usd,
      '2500',
    );
  },
);

test(
  'failed transfer leaves both accounts unchanged',
  async () => {
    const senderUid =
      uid(
        'failed-transfer-sender',
      );

    const recipientUid =
      uid(
        'failed-transfer-recipient',
      );

    const seedOperationId =
      operationId(
        'failed-transfer-seed',
      );

    const transferOperationId =
      operationId(
        'failed-transfer-operation',
      );

    const seed =
      await runServerFinancialMutation(
        {
          operationId:
            seedOperationId,

          uid:
            senderUid,

          operationType:
            'DEPOSIT',

          asset:
            'TZS',

          direction:
            'CREDIT',

          amountAtomic:
            '1000',
        },
      );

    rememberLedger(
      seed.ledgerEntryId,
    );

    await assert.rejects(
      runServerFinancialTransfer(
        {
          operationId:
            transferOperationId,

          senderUid,

          recipientUid,

          asset:
            'TZS',

          amountAtomic:
            '5000',
        },
      ),
      /Insufficient funds/,
    );

    const sender =
      await getServerFinancialAccount(
        senderUid,
      );

    const recipient =
      await getServerFinancialAccount(
        recipientUid,
      );

    assert.equal(
      sender.balancesAtomic.tzs,
      '1000',
    );

    assert.equal(
      recipient.balancesAtomic.tzs,
      '0',
    );

    const operationSnapshot =
      await adminDb
        .collection(
          'financial_operations',
        )
        .doc(
          transferOperationId,
        )
        .get();

    assert.equal(
      operationSnapshot.exists,
      false,
    );
  },
);