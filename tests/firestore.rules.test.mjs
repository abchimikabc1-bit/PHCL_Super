import {
  readFileSync,
} from 'node:fs';

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
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const PROJECT_ID =
  'phcl-super-f0d21';

const firestoreRules =
  readFileSync(
    new URL(
      '../firestore.rules',
      import.meta.url,
    ),
    'utf8',
  );

let testEnv;

const CUSTOMER_UID =
  'customer-one';

const OTHER_UID =
  'customer-two';

const NEW_CUSTOMER_UID =
  'customer-new';

const CUSTOMER_EMAIL =
  'customer@example.com';

const OTHER_EMAIL =
  'other@example.com';

const NEW_CUSTOMER_EMAIL =
  'new-customer@example.com';

/*
 * These legacy profiles are seeded with
 * security rules disabled.
 *
 * Extra historical fields deliberately remain
 * here to confirm that customers can update
 * permitted basic fields without gaining the
 * ability to mutate legacy privileged fields.
 */
const customerProfile = {
  uid:
    CUSTOMER_UID,

  fullName:
    'PHCL Test Customer',

  email:
    CUSTOMER_EMAIL,

  phone:
    '+255700000001',

  role:
    'user',

  tier:
    'regular',

  kycStatus:
    'NOT_STARTED',

  kysStatus:
    'NOT_STARTED',

  kybStatus:
    'NOT_STARTED',

  balances: {
    usd: 0,
    tzs: 0,
    ntzs: 0,
    pi: 0,
  },

  createdAt:
    new Date(),

  updatedAt:
    new Date(),
};

const otherProfile = {
  uid:
    OTHER_UID,

  fullName:
    'Other Customer',

  email:
    OTHER_EMAIL,

  phone:
    '+255700000002',

  role:
    'user',

  tier:
    'regular',

  kycStatus:
    'NOT_STARTED',

  kysStatus:
    'NOT_STARTED',

  kybStatus:
    'NOT_STARTED',

  balances: {
    usd: 0,
    tzs: 0,
    ntzs: 0,
    pi: 0,
  },

  createdAt:
    new Date(),

  updatedAt:
    new Date(),
};

function authenticatedFirestore(
  uid,
  email,
  extraTokenClaims = {},
) {
  return testEnv
    .authenticatedContext(
      uid,
      {
        email,
        email_verified:
          false,
        ...extraTokenClaims,
      },
    )
    .firestore();
}

function createSafeProfileData({
  uid =
    NEW_CUSTOMER_UID,

  email =
    NEW_CUSTOMER_EMAIL,

  fullName =
    'New PHCL Customer',

  phone =
    '+255700000003',

  role =
    'user',

  tier =
    'regular',

  kycStatus =
    'NOT_STARTED',

  balances = {
    usd: 0,
    tzs: 0,
    ntzs: 0,
    pi: 0,
  },

  extraFields = {},
} = {}) {
  return {
    uid,
    email,
    fullName,
    phone,
    role,
    tier,
    kycStatus,
    balances,

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),

    ...extraFields,
  };
}

async function seedFirestore() {
  await testEnv
    .withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            'users',
            CUSTOMER_UID,
          ),
          customerProfile,
        );

        await setDoc(
          doc(
            db,
            'users',
            OTHER_UID,
          ),
          otherProfile,
        );

        await setDoc(
          doc(
            db,
            'transactions',
            'existing-own-transaction',
          ),
          {
            userId:
              CUSTOMER_UID,

            type:
              'TEST',

            amount:
              100,

            createdAt:
              new Date(),
          },
        );

        await setDoc(
          doc(
            db,
            'transactions',
            'existing-other-transaction',
          ),
          {
            userId:
              OTHER_UID,

            type:
              'TEST',

            amount:
              100,

            createdAt:
              new Date(),
          },
        );

        /*
         * Privileged collections are seeded
         * without rules so client read denial
         * can be tested explicitly.
         */
        await setDoc(
          doc(
            db,
            'financial_ledger',
            'server-ledger-entry',
          ),
          {
            uid:
              CUSTOMER_UID,

            operationId:
              'server-operation',

            amountAtomic:
              '100',
          },
        );

        await setDoc(
          doc(
            db,
            'admin_auth_audit',
            'server-admin-audit',
          ),
          {
            event:
              'LOGIN_SUCCESS',
          },
        );

        await setDoc(
          doc(
            db,
            'withdrawal_requests',
            'server-withdrawal-request',
          ),
          {
            requestId:
              'server-withdrawal-request',

            uid:
              CUSTOMER_UID,

            asset:
              'TZS',

            rail:
              'MOBILE_MONEY',

            providerCode:
              'MPESA',

            amountAtomic:
              '100000',

            destinationMasked:
              '•••3456',

            encryptedDestination: {
              algorithm:
                'aes-256-gcm',

              version:
                1,

              initializationVector:
                'server-only-test-iv',

              ciphertext:
                'server-only-test-ciphertext',

              authenticationTag:
                'server-only-test-tag',
            },

            status:
              'PENDING_REVIEW',

            settlementStatus:
              'NOT_STARTED',

            createdAt:
              new Date(),
          },
        );

        await setDoc(
          doc(
            db,
            'provider_callback_events',
            'server-callback-event',
          ),
          {
            providerCode:
              'MPESA',

            providerEventId:
              'provider-event-001',

            outcome:
              'SUCCESS',
          },
        );

        await setDoc(
          doc(
            db,
            'financial_settlement_audit',
            'server-settlement-audit',
          ),
          {
            action:
              'PROVIDER_SETTLEMENT_CALLBACK',

            uid:
              CUSTOMER_UID,
          },
        );

        await setDoc(
          doc(
            db,
            'financial_operations',
            'server-financial-operation',
          ),
          {
            operationId:
              'server-financial-operation',

            uid:
              CUSTOMER_UID,

            status:
              'COMPLETED',
          },
        );
      },
    );
}

before(async () => {
  testEnv =
    await initializeTestEnvironment({
      projectId:
        PROJECT_ID,

      firestore: {
        rules:
          firestoreRules,
      },
    });
});

beforeEach(async () => {
  await testEnv
    .clearFirestore();

  await seedFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

describe(
  'PHCL Super Firestore Security Rules',
  () => {
    test(
      'authenticated customer can create own safe initial profile',
      async () => {
        const db =
          authenticatedFirestore(
            NEW_CUSTOMER_UID,
            NEW_CUSTOMER_EMAIL,
          );

        await assertSucceeds(
          setDoc(
            doc(
              db,
              'users',
              NEW_CUSTOMER_UID,
            ),
            createSafeProfileData(),
          ),
        );
      },
    );

    test(
      'customer cannot create profile under another UID',
      async () => {
        const db =
          authenticatedFirestore(
            NEW_CUSTOMER_UID,
            NEW_CUSTOMER_EMAIL,
          );

        await assertFails(
          setDoc(
            doc(
              db,
              'users',
              OTHER_UID,
            ),
            createSafeProfileData({
              uid:
                OTHER_UID,
            }),
          ),
        );
      },
    );

    test(
      'customer cannot create profile using a different email',
      async () => {
        const db =
          authenticatedFirestore(
            NEW_CUSTOMER_UID,
            NEW_CUSTOMER_EMAIL,
          );

        await assertFails(
          setDoc(
            doc(
              db,
              'users',
              NEW_CUSTOMER_UID,
            ),
            createSafeProfileData({
              email:
                'forged@example.com',
            }),
          ),
        );
      },
    );

    test(
      'customer without Firebase email claim cannot create profile',
      async () => {
        const db =
          testEnv
            .authenticatedContext(
              NEW_CUSTOMER_UID,
            )
            .firestore();

        await assertFails(
          setDoc(
            doc(
              db,
              'users',
              NEW_CUSTOMER_UID,
            ),
            createSafeProfileData(),
          ),
        );
      },
    );

    test(
      'customer cannot include additional fields during profile creation',
      async () => {
        const db =
          authenticatedFirestore(
            NEW_CUSTOMER_UID,
            NEW_CUSTOMER_EMAIL,
          );

        await assertFails(
          setDoc(
            doc(
              db,
              'users',
              NEW_CUSTOMER_UID,
            ),
            createSafeProfileData({
              extraFields: {
                accountStatus:
                  'ACTIVE',

                verificationStatus:
                  'VERIFIED',
              },
            }),
          ),
        );
      },
    );

    test(
      'customer cannot create Admin role',
      async () => {
        const db =
          authenticatedFirestore(
            NEW_CUSTOMER_UID,
            NEW_CUSTOMER_EMAIL,
          );

        await assertFails(
          setDoc(
            doc(
              db,
              'users',
              NEW_CUSTOMER_UID,
            ),
            createSafeProfileData({
              role:
                'admin',
            }),
          ),
        );
      },
    );

    test(
      'customer cannot create profile with approved KYC',
      async () => {
        const db =
          authenticatedFirestore(
            NEW_CUSTOMER_UID,
            NEW_CUSTOMER_EMAIL,
          );

        await assertFails(
          setDoc(
            doc(
              db,
              'users',
              NEW_CUSTOMER_UID,
            ),
            createSafeProfileData({
              kycStatus:
                'APPROVED',
            }),
          ),
        );
      },
    );

    test(
      'customer cannot create profile with non-zero balances',
      async () => {
        const db =
          authenticatedFirestore(
            NEW_CUSTOMER_UID,
            NEW_CUSTOMER_EMAIL,
          );

        await assertFails(
          setDoc(
            doc(
              db,
              'users',
              NEW_CUSTOMER_UID,
            ),
            createSafeProfileData({
              balances: {
                usd: 1000,
                tzs: 0,
                ntzs: 0,
                pi: 0,
              },
            }),
          ),
        );
      },
    );

    test(
      'customer cannot add an extra balance asset',
      async () => {
        const db =
          authenticatedFirestore(
            NEW_CUSTOMER_UID,
            NEW_CUSTOMER_EMAIL,
          );

        await assertFails(
          setDoc(
            doc(
              db,
              'users',
              NEW_CUSTOMER_UID,
            ),
            createSafeProfileData({
              balances: {
                usd: 0,
                tzs: 0,
                ntzs: 0,
                pi: 0,
                attackerCredit: 999999,
              },
            }),
          ),
        );
      },
    );

    test(
      'authenticated customer can read own profile',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertSucceeds(
          getDoc(
            doc(
              db,
              'users',
              CUSTOMER_UID,
            ),
          ),
        );
      },
    );

    test(
      'authenticated customer cannot read another customer profile',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertFails(
          getDoc(
            doc(
              db,
              'users',
              OTHER_UID,
            ),
          ),
        );
      },
    );

    test(
      'unauthenticated visitor cannot read customer profile',
      async () => {
        const db =
          testEnv
            .unauthenticatedContext()
            .firestore();

        await assertFails(
          getDoc(
            doc(
              db,
              'users',
              CUSTOMER_UID,
            ),
          ),
        );
      },
    );

    test(
      'customer can update own fullName and phone',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertSucceeds(
          updateDoc(
            doc(
              db,
              'users',
              CUSTOMER_UID,
            ),
            {
              fullName:
                'Updated PHCL Customer',

              phone:
                '+255700000009',

              updatedAt:
                serverTimestamp(),
            },
          ),
        );
      },
    );

    test(
      'customer cannot update another customer profile',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertFails(
          updateDoc(
            doc(
              db,
              'users',
              OTHER_UID,
            ),
            {
              fullName:
                'Attacker Changed This',

              updatedAt:
                serverTimestamp(),
            },
          ),
        );
      },
    );

    test(
      'customer cannot promote own role to Admin',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertFails(
          updateDoc(
            doc(
              db,
              'users',
              CUSTOMER_UID,
            ),
            {
              role:
                'admin',

              updatedAt:
                serverTimestamp(),
            },
          ),
        );
      },
    );

    test(
      'customer cannot modify own tier',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertFails(
          updateDoc(
            doc(
              db,
              'users',
              CUSTOMER_UID,
            ),
            {
              tier:
                'corporate',

              updatedAt:
                serverTimestamp(),
            },
          ),
        );
      },
    );

    test(
      'customer cannot modify own email',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertFails(
          updateDoc(
            doc(
              db,
              'users',
              CUSTOMER_UID,
            ),
            {
              email:
                'attacker@example.com',

              updatedAt:
                serverTimestamp(),
            },
          ),
        );
      },
    );

    test(
      'customer cannot modify own balances',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertFails(
          updateDoc(
            doc(
              db,
              'users',
              CUSTOMER_UID,
            ),
            {
              balances: {
                usd: 999999,
                tzs: 999999999,
                ntzs: 999999999,
                pi: 999999,
              },

              updatedAt:
                serverTimestamp(),
            },
          ),
        );
      },
    );

    test(
      'customer cannot approve own KYC',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertFails(
          updateDoc(
            doc(
              db,
              'users',
              CUSTOMER_UID,
            ),
            {
              kycStatus:
                'APPROVED',

              updatedAt:
                serverTimestamp(),
            },
          ),
        );
      },
    );

    test(
      'customer cannot approve own KYS',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertFails(
          updateDoc(
            doc(
              db,
              'users',
              CUSTOMER_UID,
            ),
            {
              kysStatus:
                'APPROVED',

              updatedAt:
                serverTimestamp(),
            },
          ),
        );
      },
    );

    test(
      'customer cannot approve own KYB',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertFails(
          updateDoc(
            doc(
              db,
              'users',
              CUSTOMER_UID,
            ),
            {
              kybStatus:
                'APPROVED',

              updatedAt:
                serverTimestamp(),
            },
          ),
        );
      },
    );

    test(
      'customer cannot change account standing',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertFails(
          updateDoc(
            doc(
              db,
              'users',
              CUSTOMER_UID,
            ),
            {
              accountStatus:
                'ACTIVE',

              updatedAt:
                serverTimestamp(),
            },
          ),
        );
      },
    );

    test(
      'customer cannot delete own profile',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertFails(
          deleteDoc(
            doc(
              db,
              'users',
              CUSTOMER_UID,
            ),
          ),
        );
      },
    );

    test(
      'customer cannot create transaction directly',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertFails(
          setDoc(
            doc(
              db,
              'transactions',
              'forged-transaction',
            ),
            {
              userId:
                CUSTOMER_UID,

              type:
                'CREDIT',

              amount:
                999999999,

              createdAt:
                serverTimestamp(),
            },
          ),
        );
      },
    );

    test(
      'customer can read own existing transaction',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertSucceeds(
          getDoc(
            doc(
              db,
              'transactions',
              'existing-own-transaction',
            ),
          ),
        );
      },
    );

    test(
      'customer cannot read another customer transaction',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertFails(
          getDoc(
            doc(
              db,
              'transactions',
              'existing-other-transaction',
            ),
          ),
        );
      },
    );

    test(
      'customer cannot read authoritative financial ledger',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertFails(
          getDoc(
            doc(
              db,
              'financial_ledger',
              'server-ledger-entry',
            ),
          ),
        );
      },
    );

    test(
      'customer cannot write authoritative financial ledger',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertFails(
          setDoc(
            doc(
              db,
              'financial_ledger',
              'forged-ledger-entry',
            ),
            {
              uid:
                CUSTOMER_UID,

              operationId:
                'forged-operation',

              amountAtomic:
                '999999999',
            },
          ),
        );
      },
    );

    test(
      'customer cannot read Admin security collections',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertFails(
          getDoc(
            doc(
              db,
              'admin_auth_audit',
              'server-admin-audit',
            ),
          ),
        );
      },
    );

    test(
      'customer cannot write Admin security collections',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertFails(
          setDoc(
            doc(
              db,
              'admin_auth_audit',
              'forged-admin-audit',
            ),
            {
              event:
                'LOGIN_SUCCESS',
            },
          ),
        );
      },
    );

    test(
      'customer cannot read server-authoritative withdrawal requests',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertFails(
          getDoc(
            doc(
              db,
              'withdrawal_requests',
              'server-withdrawal-request',
            ),
          ),
        );
      },
    );

    test(
      'customer cannot create or overwrite withdrawal requests',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertFails(
          setDoc(
            doc(
              db,
              'withdrawal_requests',
              'forged-withdrawal-request',
            ),
            {
              requestId:
                'forged-withdrawal-request',

              uid:
                CUSTOMER_UID,

              asset:
                'TZS',

              rail:
                'MOBILE_MONEY',

              providerCode:
                'MPESA',

              amountAtomic:
                '999999999',

              destination:
                '+255700000000',

              status:
                'COMPLETED',

              settlementStatus:
                'PAID',

              createdAt:
                serverTimestamp(),
            },
          ),
        );
      },
    );

    test(
      'unauthenticated visitor cannot read withdrawal requests',
      async () => {
        const db =
          testEnv
            .unauthenticatedContext()
            .firestore();

        await assertFails(
          getDoc(
            doc(
              db,
              'withdrawal_requests',
              'server-withdrawal-request',
            ),
          ),
        );
      },
    );

    test(
      'unauthenticated visitor cannot create withdrawal requests',
      async () => {
        const db =
          testEnv
            .unauthenticatedContext()
            .firestore();

        await assertFails(
          setDoc(
            doc(
              db,
              'withdrawal_requests',
              'anonymous-forged-withdrawal',
            ),
            {
              uid:
                CUSTOMER_UID,

              amountAtomic:
                '999999999',

              status:
                'COMPLETED',
            },
          ),
        );
      },
    );

    test(
      'customer cannot read server-authoritative deposit requests',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertFails(
          getDoc(
            doc(
              db,
              'deposit_requests',
              'server-deposit-request',
            ),
          ),
        );
      },
    );

    test(
      'customer cannot create or overwrite deposit requests',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        await assertFails(
          setDoc(
            doc(
              db,
              'deposit_requests',
              'forged-deposit-request',
            ),
            {
              requestId:
                'forged-deposit-request',

              uid:
                CUSTOMER_UID,

              asset:
                'TZS',

              rail:
                'MOBILE_MONEY',

              providerCode:
                'MPESA',

              amountAtomic:
                '999999999',

              status:
                'COMPLETED',

              providerStatus:
                'COMPLETED',

              settlementStatus:
                'SETTLED',

              credited:
                true,

              createdAt:
                serverTimestamp(),
            },
          ),
        );
      },
    );

    test(
      'unauthenticated visitor cannot read deposit requests',
      async () => {
        const db =
          testEnv
            .unauthenticatedContext()
            .firestore();

        await assertFails(
          getDoc(
            doc(
              db,
              'deposit_requests',
              'server-deposit-request',
            ),
          ),
        );
      },
    );

    test(
      'unauthenticated visitor cannot create deposit requests',
      async () => {
        const db =
          testEnv
            .unauthenticatedContext()
            .firestore();

        await assertFails(
          setDoc(
            doc(
              db,
              'deposit_requests',
              'anonymous-forged-deposit',
            ),
            {
              uid:
                CUSTOMER_UID,

              amountAtomic:
                '999999999',

              status:
                'COMPLETED',

              providerStatus:
                'COMPLETED',

              settlementStatus:
                'SETTLED',

              credited:
                true,
            },
          ),
        );
      },
    );

    test(
      'customer cannot access callback events, settlement audits or financial operations',
      async () => {
        const db =
          authenticatedFirestore(
            CUSTOMER_UID,
            CUSTOMER_EMAIL,
          );

        const protectedDocuments = [
          [
            'provider_callback_events',
            'server-callback-event',
          ],
          [
            'financial_settlement_audit',
            'server-settlement-audit',
          ],
          [
            'financial_operations',
            'server-financial-operation',
          ],
        ];

        for (
          const [
            collectionName,
            documentId,
          ] of protectedDocuments
        ) {
          const reference =
            doc(
              db,
              collectionName,
              documentId,
            );

          await assertFails(
            getDoc(reference),
          );

          await assertFails(
            updateDoc(
              reference,
              {
                compromised:
                  true,
              },
            ),
          );

          await assertFails(
            deleteDoc(reference),
          );

          await assertFails(
            setDoc(
              doc(
                db,
                collectionName,
                `forged-${documentId}`,
              ),
              {
                uid:
                  CUSTOMER_UID,

                status:
                  'COMPLETED',

                compromised:
                  true,
              },
            ),
          );
        }
      },
    );

    test(
      'unauthenticated visitor cannot access callback events, settlement audits or financial operations',
      async () => {
        const db =
          testEnv
            .unauthenticatedContext()
            .firestore();

        const protectedDocuments = [
          [
            'provider_callback_events',
            'server-callback-event',
          ],
          [
            'financial_settlement_audit',
            'server-settlement-audit',
          ],
          [
            'financial_operations',
            'server-financial-operation',
          ],
        ];

        for (
          const [
            collectionName,
            documentId,
          ] of protectedDocuments
        ) {
          await assertFails(
            getDoc(
              doc(
                db,
                collectionName,
                documentId,
              ),
            ),
          );

          await assertFails(
            setDoc(
              doc(
                db,
                collectionName,
                `anonymous-${documentId}`,
              ),
              {
                status:
                  'COMPLETED',

                compromised:
                  true,
              },
            ),
          );
        }
      },
    );
  },
);
