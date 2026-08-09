/**
 * Unit Tests for Firestore Security Rules
 * Verifies authentication checks, ownership rules, and immunity against self-assigned roles.
 */

const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const fs = require('fs');
const path = require('path');

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-security-test',
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Firestore Security Rules Audit', () => {
  test('Denies unauthenticated read/write access (Deny-by-Default)', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthDb.collection('users').doc('user123').get());
    await assertFails(
      unauthDb.collection('users').doc('user123').set({
        displayName: 'Hacker',
        role: 'admin',
      })
    );
  });

  test('Allows user to read and create their own profile with role user', async () => {
    const aliceDb = testEnv.authenticatedContext('alice_uid').firestore();
    await assertSucceeds(
      aliceDb.collection('users').doc('alice_uid').set({
        displayName: 'Alice Smith',
        email: 'alice@example.com',
        role: 'user',
        createdAt: new Date(),
      })
    );
  });

  test('Denies user trying to create profile with admin role (Self-assigned role check)', async () => {
    const attackerDb = testEnv.authenticatedContext('attacker_uid').firestore();
    await assertFails(
      attackerDb.collection('users').doc('attacker_uid').set({
        displayName: 'Attacker',
        email: 'attacker@example.com',
        role: 'admin', // SHURUTI: Lazima ikataliwe!
        createdAt: new Date(),
      })
    );
  });

  test('Denies user trying to change their role to admin on update (Privilege Escalation check)', async () => {
    // Weuka user profile kama admin kwanza kwa setup
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('bob_uid').set({
        displayName: 'Bob',
        email: 'bob@example.com',
        role: 'user',
        createdAt: new Date(),
      });
    });

    const bobDb = testEnv.authenticatedContext('bob_uid').firestore();
    await assertFails(
      bobDb.collection('users').doc('bob_uid').update({
        role: 'admin', // SHURUTI: Lazima ikataliwe!
      })
    );
  });
});
