import { readFileSync } from 'node:fs';
import {
  after,
  before,
  beforeEach,
  describe,
  test,
} from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const PROJECT_ID = 'phcl-super-f0d21';

const firestoreRules = readFileSync(
  new URL('../firestore.rules', import.meta.url),
  'utf8',
);

let testEnv;

const CUSTOMER_UID = 'customer-one';
const OTHER_UID = 'customer-two';

const customerProfile = {
  uid: CUSTOMER_UID,
  fullName: 'PHCL Test Customer',
  email: 'customer@example.com',
  phone: '+255700000001',
  role: 'user',
  tier: 'regular',

  kycStatus: 'NOT_STARTED',
  kysStatus: 'NOT_STARTED',
  kybStatus: 'NOT_STARTED',

  balances: {
    usd: 0,
    tzs: 0,
    ntzs: 0,
    pi: 0,
  },

  createdAt: new Date(),
  updatedAt: new Date(),
};

const otherProfile = {
  uid: OTHER_UID,
  fullName: 'Other Customer',
  email: 'other@example.com',
  phone: '+255700000002',
  role: 'user',
  tier: 'regular',

  kycStatus: 'NOT_STARTED',
  kysStatus: 'NOT_STARTED',
  kybStatus: 'NOT_STARTED',

  balances: {
    usd: 0,
    tzs: 0,
    ntzs: 0,
    pi: 0,
  },

  createdAt: new Date(),
  updatedAt: new Date(),
};

async function seedFirestore() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, 'users', CUSTOMER_UID), customerProfile);
    await setDoc(doc(db, 'users', OTHER_UID), otherProfile);

    await setDoc(doc(db, 'transactions', 'existing-own-transaction'), {
      userId: CUSTOMER_UID,
      type: 'TEST',
      amount: 100,
      createdAt: new Date(),
    });

    await setDoc(doc(db, 'transactions', 'existing-other-transaction'), {
      userId: OTHER_UID,
      type: 'TEST',
      amount: 100,
      createdAt: new Date(),
    });
  });
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: firestoreRules,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

describe('PHCL Super Firestore Security Rules', () => {
  test('authenticated customer can read own profile', async () => {
    const db = testEnv
      .authenticatedContext(CUSTOMER_UID)
      .firestore();

    await assertSucceeds(
      getDoc(doc(db, 'users', CUSTOMER_UID)),
    );
  });

  test('authenticated customer cannot read another customer profile', async () => {
    const db = testEnv
      .authenticatedContext(CUSTOMER_UID)
      .firestore();

    await assertFails(
      getDoc(doc(db, 'users', OTHER_UID)),
    );
  });

  test('unauthenticated visitor cannot read customer profile', async () => {
    const db = testEnv
      .unauthenticatedContext()
      .firestore();

    await assertFails(
      getDoc(doc(db, 'users', CUSTOMER_UID)),
    );
  });

  test('customer can update own fullName and phone', async () => {
    const db = testEnv
      .authenticatedContext(CUSTOMER_UID)
      .firestore();

    await assertSucceeds(
      updateDoc(doc(db, 'users', CUSTOMER_UID), {
        fullName: 'Updated PHCL Customer',
        phone: '+255700000009',
        updatedAt: serverTimestamp(),
      }),
    );
  });

  test('customer cannot promote own role to admin', async () => {
    const db = testEnv
      .authenticatedContext(CUSTOMER_UID)
      .firestore();

    await assertFails(
      updateDoc(doc(db, 'users', CUSTOMER_UID), {
        role: 'admin',
        updatedAt: serverTimestamp(),
      }),
    );
  });

  test('customer cannot modify own balances', async () => {
    const db = testEnv
      .authenticatedContext(CUSTOMER_UID)
      .firestore();

    await assertFails(
      updateDoc(doc(db, 'users', CUSTOMER_UID), {
        balances: {
          usd: 999999,
          tzs: 999999999,
          ntzs: 999999999,
          pi: 999999,
        },
        updatedAt: serverTimestamp(),
      }),
    );
  });

  test('customer cannot approve own KYC', async () => {
    const db = testEnv
      .authenticatedContext(CUSTOMER_UID)
      .firestore();

    await assertFails(
      updateDoc(doc(db, 'users', CUSTOMER_UID), {
        kycStatus: 'APPROVED',
        updatedAt: serverTimestamp(),
      }),
    );
  });

  test('customer cannot approve own KYS', async () => {
    const db = testEnv
      .authenticatedContext(CUSTOMER_UID)
      .firestore();

    await assertFails(
      updateDoc(doc(db, 'users', CUSTOMER_UID), {
        kysStatus: 'APPROVED',
        updatedAt: serverTimestamp(),
      }),
    );
  });

  test('customer cannot approve own KYB', async () => {
    const db = testEnv
      .authenticatedContext(CUSTOMER_UID)
      .firestore();

    await assertFails(
      updateDoc(doc(db, 'users', CUSTOMER_UID), {
        kybStatus: 'APPROVED',
        updatedAt: serverTimestamp(),
      }),
    );
  });

  test('customer cannot create transaction directly', async () => {
    const db = testEnv
      .authenticatedContext(CUSTOMER_UID)
      .firestore();

    await assertFails(
      setDoc(doc(db, 'transactions', 'forged-transaction'), {
        userId: CUSTOMER_UID,
        type: 'CREDIT',
        amount: 999999999,
        createdAt: serverTimestamp(),
      }),
    );
  });

  test('customer can read own existing transaction', async () => {
    const db = testEnv
      .authenticatedContext(CUSTOMER_UID)
      .firestore();

    await assertSucceeds(
      getDoc(
        doc(
          db,
          'transactions',
          'existing-own-transaction',
        ),
      ),
    );
  });

  test('customer cannot read another customer transaction', async () => {
    const db = testEnv
      .authenticatedContext(CUSTOMER_UID)
      .firestore();

    await assertFails(
      getDoc(
        doc(
          db,
          'transactions',
          'existing-other-transaction',
        ),
      ),
    );
  });

  test('customer cannot delete or overwrite another customer profile', async () => {
    const db = testEnv
      .authenticatedContext(CUSTOMER_UID)
      .firestore();

    await assertFails(
      setDoc(doc(db, 'users', OTHER_UID), {
        ...otherProfile,
        fullName: 'Attacker Changed This',
      }),
    );
  });
});