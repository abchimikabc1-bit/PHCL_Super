'use client';

import { useState } from 'react';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

type EthereumRequestArgs = {
  method: string;
  params?: readonly unknown[] | Record<string, unknown>;
};

type EthereumProvider = {
  request: (args: EthereumRequestArgs) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export default function Web3LoginButton() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const ethereum = window.ethereum;

    if (!ethereum) {
      alert('Tafadhali sakinisha MetaMask!');
      return;
    }

    setLoading(true);

    try {
      // 1. Omba anwani ya pochi (Wallet Address)
      const accountsResult = await ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!Array.isArray(accountsResult) || accountsResult.length === 0) {
        throw new Error('Hakuna wallet address iliyopatikana.');
      }

      const walletAddress = accountsResult[0];

      if (typeof walletAddress !== 'string') {
        throw new Error('Wallet address si sahihi.');
      }

      // 2. Omba nonce kutoka kwenye API yetu
      const resNonce = await fetch('/api/get-nonce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });

      if (!resNonce.ok) {
        throw new Error('Imeshindikana kupata nonce.');
      }

      const {
        nonce,
        error: nonceErr,
      }: {
        nonce?: string;
        error?: string;
      } = await resNonce.json();

      if (nonceErr) {
        throw new Error(nonceErr);
      }

      if (!nonce) {
        throw new Error('Nonce haikupatikana.');
      }

      // 3. Omba mtumiaji asaini ujumbe
      const signatureResult = await ethereum.request({
        method: 'personal_sign',
        params: [nonce, walletAddress],
      });

      if (typeof signatureResult !== 'string') {
        throw new Error('Signature haikupatikana.');
      }

      const signature = signatureResult;

      // 4. Tuma signature kwa API ili ihakikiwe
      const resVerify = await fetch('/api/verify-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          signature,
        }),
      });

      if (!resVerify.ok) {
        throw new Error('Imeshindikana kuhakiki signature.');
      }

      const {
        customToken,
        error: verifyErr,
      }: {
        customToken?: string;
        error?: string;
      } = await resVerify.json();

      if (verifyErr) {
        throw new Error(verifyErr);
      }

      if (!customToken) {
        throw new Error('Firebase custom token haikupatikana.');
      }

      // 5. Ingia Firebase kwa kutumia Custom Token
      const auth = getAuth();
      const userCredential = await signInWithCustomToken(
        auth,
        customToken
      );

      const user = userCredential.user;

      // 6. Hakikisha Web3 user ana profile kwenye Firestore
      const db = getFirestore();
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          fullName: 'Mtumiaji wa Web3',
          email: `${user.uid}@phclsuper.com`,
          role: 'user',
          walletAddress,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        console.log(
          'Usajili wa kwanza wa Web3 umekamilika kwenye Firestore!'
        );
      } else {
        console.log('Karibu tena! Wasifu wako tayari upo.');
      }

      alert('Umeingia kikamilifu na Web3 Wallet!');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Kosa limetokea wakati wa kuingia kwa Web3.';

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={loading}
      className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
    >
      {loading ? 'Inaunganisha...' : 'Ingia na Web3 Wallet'}
    </button>
  );
}