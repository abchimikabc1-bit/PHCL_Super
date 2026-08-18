const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Anzisha Firebase Admin SDK
// (Itatumia faili la JSON uliloweka kwenye GOOGLE_APPLICATION_CREDENTIALS)
initializeApp();
const db = getFirestore();

async function safishaDuplications() {
  console.log('Mchakato wa kusafisha data umeanza...');
  const batch = db.batch();

  // 1. KUSAFISHA PROFILES (/users) - Kulingana na Email
  const usersRef = db.collection('users');
  const userSnapshot = await usersRef.get();
  const seenEmails = new Set();
  let userDeletes = 0;

  userSnapshot.forEach((doc) => {
    const data = doc.data();
    const email = data.email;
    if (email) {
      // Badilisha barua pepe kuwa herufi ndogo ili kulinganisha kwa usahihi
      const normalizedEmail = email.toLowerCase().trim();
      if (seenEmails.has(normalizedEmail)) {
        batch.delete(doc.ref); // Weka alama ya kufuta nakala iliyojirudia
        userDeletes++;
      } else {
        seenEmails.add(normalizedEmail);
      }
    }
  });

  // 2. KUSAFISHA PAGES/POSTS (/posts) - Kulingana na Title
  const postsRef = db.collection('posts');
  const postSnapshot = await postsRef.get();
  const seenTitles = new Set();
  let postDeletes = 0;

  postSnapshot.forEach((doc) => {
    const data = doc.data();
    const title = data.title;
    if (title) {
      // Kusafisha nafasi na herufi kubwa/ndogo kwenye vichwa vya habari
      const normalizedTitle = title.toLowerCase().trim();
      if (seenTitles.has(normalizedTitle)) {
        batch.delete(doc.ref); // Weka alama ya kufuta nakala iliyojirudia
        postDeletes++;
      } else {
        seenTitles.add(normalizedTitle);
      }
    }
  });

  // 3. Tekeleza mabadiliko yote kwa mara moja (Batch Commit)
  if (userDeletes > 0 || postDeletes > 0) {
    await batch.commit();
    console.log('\n=============================================');
    console.log('USAFISHAJI UMEKAMILIKA KIKAMILIFU!');
    console.log(`- Profiles (Watumiaji) zilizofutwa: ${userDeletes}`);
    console.log(`- Posts (Kurasa) zilizofutwa: ${postDeletes}`);
    console.log('=============================================');
  } else {
    console.log('\nHakuna data zilizojirudia zilizopatikana kwenye database yako.');
  }
}

// Endesha mchakato na dhibiti makosa
safishaDuplications().catch((error) => {
  console.error('\nKosa limetokea wakati wa kusafisha data:', error);
});
