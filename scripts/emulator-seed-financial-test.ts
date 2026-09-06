import { randomUUID } from 'node:crypto';

import {
  displayAmountToAtomic,
  getServerFinancialAccount,
  runServerFinancialMutation,
} from '../lib/server-financial-ledger';

const REQUIRED_EMULATOR_HOST = '127.0.0.1:8080';

function fail(message: string): never {
  console.error(`\n[PHCL TEST SEED] ${message}\n`);
  process.exit(1);
}

function normalizeUid(value: string | undefined): string {
  const uid = value?.trim();

  if (!uid) {
    fail(
      'Customer UID is required. Usage: npx tsx scripts/emulator-seed-financial-test.ts <CUSTOMER_UID>',
    );
  }

  if (
    uid.length > 256 ||
    uid.includes('/') ||
    uid.includes('\\') ||
    /[\u0000-\u001F\u007F]/.test(uid)
  ) {
    fail('Invalid customer UID.');
  }

  return uid;
}

async function main(): Promise<void> {
  /*
   * ============================================================
   * HARD SAFETY BOUNDARY
   * ============================================================
   *
   * This script must NEVER seed production Firestore.
   */

  const emulatorHost =
    process.env.FIRESTORE_EMULATOR_HOST?.trim();

  if (emulatorHost !== REQUIRED_EMULATOR_HOST) {
    fail(
      `Refusing to run. FIRESTORE_EMULATOR_HOST must be exactly ${REQUIRED_EMULATOR_HOST}.`,
    );
  }

  if (process.env.NODE_ENV === 'production') {
    fail('Refusing to run with NODE_ENV=production.');
  }

  const uid = normalizeUid(process.argv[2]);

  /*
   * USD 100,000.00
   *
   * Enough for local checkout testing while remaining clearly
   * identifiable as emulator-only test money.
   */
  const amountDisplay = '100000.00';

  const amountAtomic =
    displayAmountToAtomic(
      amountDisplay,
      'USD',
    );

  const operationId =
    `emulator_seed_${randomUUID()}`;

  console.log('\nPHCL SUPER — EMULATOR FINANCIAL TEST SEED');
  console.log('------------------------------------------');
  console.log(`Emulator : ${emulatorHost}`);
  console.log(`Customer : ${uid}`);
  console.log(`Asset    : USD`);
  console.log(`Credit   : ${amountDisplay}`);
  console.log('');

  const before =
    await getServerFinancialAccount(uid);

  console.log(
    `USD before: ${before.balancesAtomic.usd} atomic units`,
  );

  const result =
    await runServerFinancialMutation({
      operationId,
      uid,

      operationType: 'DEPOSIT',

      asset: 'USD',

      direction: 'CREDIT',

      amountAtomic,

      description:
        'PHCL emulator-only financial test deposit',

      metadata: {
        environment: 'FIRESTORE_EMULATOR',
        source: 'emulator-seed-financial-test',
        testOnly: true,
      },
    });

  const after =
    await getServerFinancialAccount(uid);

  console.log('');
  console.log('Seed completed.');
  console.log(`Operation ID : ${result.operationId}`);
  console.log(`Ledger ID    : ${result.ledgerEntryId}`);
  console.log(`Idempotent   : ${result.idempotent}`);
  console.log(
    `USD before  : ${result.balanceBeforeAtomic} atomic units`,
  );
  console.log(
    `USD after   : ${result.balanceAfterAtomic} atomic units`,
  );
  console.log(
    `Account USD : ${after.balancesAtomic.usd} atomic units`,
  );
  console.log('');
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : 'Unknown financial seed failure.';

  fail(message);
});