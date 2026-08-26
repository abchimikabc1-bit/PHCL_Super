'use client';

import React, { useState } from 'react';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function Web3LoginButton() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Tafadhali sakinisha MetaMask!');
      return;
    }

    setLoading(true);
    try {
      // 1. Omba anwani ya pochi (Wallet Address)
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const walletAddress = accounts[0];

      // 2. Omba nonce kutoka kwenye API yetu
      const resNonce = await fetch('/api/get-nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      });
      const { nonce, error: nonceErr } = await resNonce.json();
      if (nonceErr) throw new Error(nonceErr);

      // 3. Omba mtumiaji asaini ujumbe huo
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [nonce, walletAddress],
      });

      // 4. Tuma saini ili ihakikiwe na upokee Custom Token
      const resVerify = await fetch('/api/verify-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, signature })
      });
      const { customToken, error: verifyErr } = await resVerify.json();
      if (verifyErr) throw new Error(verifyErr);

      // 5. Ingia Firebase kwa kutumia Custom Token
      const auth = getAuth();
      const userCredential = await signInWithCustomToken(auth, customToken);
      const user = userCredential.user;

      // 6. USALAMA WA FIRESTORE: Wasajili watumiaji wapya ili kukidhi Security Rules zako!
      const db = getFirestore(); // Inapata hifadhidata ya Firestore upande wa client
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Kama wasifu haupo, tunamtengenezea wa kwanza ili asizuiliwe na sheria zako za usalama (Firestore Rules)
        await setDoc(userDocRef, {
          uid: user.uid,
          fullName: "Mtumiaji wa Web3", // Jina la muda
          email: `${user.uid}@phclsuper.com`, // Email ya kipekee kutokana na pochi
          role: 'user', // Muhimu ili kuendana na sheria ya: request.resource.data.role == 'user'
          createdAt: serverTimestamp()
        });
        console.log("Usajili wa kwanza wa Web3 umekamilika kwenye Firestore!");
      } else {
        console.log("Karibu tena! Wasifu wako tayari upo.");
      }

      alert('Umeingia kikamilifu na wasifu wako upo salama!');
    } catch (err: any) {
      alert(err.message || 'Kosa limetokea');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleLogin} 
      disabled={loading}
      className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
    >
      {loading ? 'Inaunganisha...' : 'Ingia na Web3 Wallet'}
    </button>
  );
}
