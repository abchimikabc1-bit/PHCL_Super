const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Pakia ufunguo wako wa siri wa JSON
const serviceAccount = require('./service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const auth = getAuth();
const db = getFirestore();

async function resetAdmin() {
  const email = 'admin@phclsuper.com';
  const newPassword = 'Xxdeveloper@phclsuper1'; // Nenosiri jipya
  let uid;

  try {
    console.log('Inatafuta mtumiaji kiserver...');
    const userRecord = await auth.getUserByEmail(email);
    uid = userRecord.uid;
    
    // Ikiwepo, sasisha password yake
    await auth.updateUser(uid, { password: newPassword });
    console.log('✓ Nenosiri la Admin aliyekuwepo limesasishwa kiserver!');
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.log('Mtumiaji hayupo. Inatengeneza akaunti mpya ya Admin...');
      // Isipokuwepo, itengeneze upya kiotomatiki
      const newUser = await auth.createUser({
        email: email,
        password: newPassword,
        emailVerified: true
      });
      uid = newUser.uid;
      console.log('✓ Akaunti mpya ya Admin imetengenezwa kiserver!');
    } else {
      throw error;
    }
  }

  // Sasisha Firestore Roles na Profile
  const userRef = db.collection('users').doc(uid);
  await userRef.set({
    uid: uid,
    email: email,
    fullName: 'PHCL Administrator',
    role: 'admin',
    adminSetupComplete: true,
    kycStatus: 'APPROVED',
    createdAt: new Date(),
    updatedAt: new Date(),
    balances: { usd: 0, tzs: 0, ntzs: 0, pi: 0 }
  }, { merge: true });

  console.log('✓ Dori ya u-admin imepitishwa kiserver kwenye Firestore!');
  console.log('\n=============================================');
  console.log('USAFISHAJI NA UREJESHAJI UMEKAMILIKA!');
  console.log(`Email: ${email}`);
  console.log(`Nenosiri Jipya: ${newPassword}`);
  console.log('=============================================');
}

resetAdmin().catch((err) => {
  console.error('Kosa limetokea wakati wa kurejesha:', err);
});
