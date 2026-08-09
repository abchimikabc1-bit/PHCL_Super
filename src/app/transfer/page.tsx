'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, runTransaction, collection, query, where, getDocs } from 'firebase/firestore';

// Usanidi wa mradi wako wa Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export default function TransferPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'pi' | 'usdt' | 'tzs' | 'btc'>('pi');
  const [statusMessage, setStatusMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!recipientEmail || !amount) {
      setStatusMessage('Tafadhali jaza sehemu zote!');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      setStatusMessage('Tafadhali andika kiasi kilicho sahihi!');
      return;
    }

    setProcessing(true);
    setStatusMessage('Mchakato wa utumaji unaendelea...');

    try {
      // 1. Kutafuta Recipient kwanza kwa kutumia Email yake
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', recipientEmail.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setStatusMessage('Mtumiaji mwenye barua pepe hii hajapatikana!');
        setProcessing(false);
        return;
      }

      const recipientDoc = querySnapshot.docs[0];
      const recipientId = recipientDoc.id;

      if (recipientId === user.uid) {
        setStatusMessage('Huwezi kujitumia fedha mwenyewe!');
        setProcessing(false);
        return;
      }

      // 2. Kuanzisha Muamala wa Kifedha wa Pamoja (Atomic Transfer)
      const senderRef = doc(db, 'users', user.uid);
      const recipientRef = doc(db, 'users', recipientId);
      const txColRef = collection(db, 'transactions');

      await runTransaction(db, async (transaction) => {
        const senderSnap = await transaction.get(senderRef);
        const recipientSnap = await transaction.get(recipientRef);

        let senderBalances = { pi: 0, tzs: 0, usdt: 0, btc: 0 };
        let recipientBalances = { pi: 0, tzs: 0, usdt: 0, btc: 0 };

        if (senderSnap.exists()) senderBalances = senderSnap.data().balances || senderBalances;
        if (recipientSnap.exists()) recipientBalances = recipientSnap.data().balances || recipientBalances;

        // Kuhakiki salio la mtumaji
        if (senderBalances[currency] < transferAmount) {
          throw new Error("Salio lako halitoshi kukamilisha muamala huu!");
        }

        // Hesabu balansi mpya
        const newSenderBalances = {
          ...senderBalances,
          [currency]: senderBalances[currency] - transferAmount
        };

        const newRecipientBalances = {
          ...recipientBalances,
          [currency]: recipientBalances[currency] + transferAmount
        };

        // 1. Sasisha salio la Mtumaji
        transaction.set(senderRef, { balances: newSenderBalances }, { merge: true });

        // 2. Sasisha salio la Mpokeaji
        transaction.set(recipientRef, { balances: newRecipientBalances }, { merge: true });

        // 3. Rekodi muamala wa Mtumaji (Debit)
        const senderTxRef = doc(txColRef);
        transaction.set(senderTxRef, {
          userId: user.uid,
          type: 'send',
          amount: transferAmount,
          currency,
          status: 'completed',
          recipientId,
          timestamp: new Date()
        });

        // 4. Rekodi muamala wa Mpokeaji (Credit)
        const recipientTxRef = doc(txColRef);
        transaction.set(recipientTxRef, {
          userId: recipientId,
          type: 'receive',
          amount: transferAmount,
          currency,
          status: 'completed',
          senderId: user.uid,
          timestamp: new Date()
        });
      });

      setStatusMessage(`Umetuma kwa mafanikio ${transferAmount} ${currency.toUpperCase()} kwenda kwa ${recipientEmail}!`);
      setAmount('');
      setRecipientEmail('');
    } catch (error: any) {
      console.error("Uhamisho umefeli:", error);
      setStatusMessage(error.message || "Hitilafu imetokea wakati wa kuhamisha fedha.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <p className="text-xl font-bold animate-pulse">Inapakia Usalama wa Utumaji... 🔐</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <h1 className="text-3xl font-black mb-4 text-red-500">Ukurasa Imelindwa (Locked)</h1>
        <p className="text-gray-400 mb-6 text-center max-w-md">
          Tafadhali ingia kwenye akaunti yako kwanza ili kuweza kutuma fedha kwa usalama.
        </p>
        <Link href="/signup" className="px-6 py-3 bg-amber-300 text-slate-900 font-bold rounded-xl shadow-lg hover:bg-amber-200">
          Ingia kwenye Akaunti
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] p-6 text-white relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.05),transparent_22%)]" />
      
      <div className="max-w-md mx-auto relative z-10 pt-10">
        <Link href="/wallet" className="text-sm text-amber-300 hover:text-amber-200 mb-6 inline-block">
          ← Rudi Kwenye Pochi
        </Link>
        
        <h1 className="text-3xl font-black mb-8 bg-gradient-to-r from-red-200 to-white bg-clip-text text-transparent">Tuma Crypto (Send)</h1>
        
        <form onSubmit={handleTransfer} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-xl space-y-6">
          {statusMessage && (
            <div className="p-4 rounded-xl bg-white/10 border border-white/20 text-yellow-300 font-semibold text-sm">
              {statusMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Barua Pepe ya Mpokeaji (Recipient Email)</label>
            <input 
              type="email" 
              value={recipientEmail} 
              onChange={(e) => setRecipientEmail(e.target.value)} 
              placeholder="mfano@phclsuper.com" 
              disabled={processing}
              className="w-full p-3 rounded-xl border border-white/10 bg-white/5 focus:border-red-500 outline-none text-white transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Kiasi (Amount)</label>
              <input 
                type="number" 
                step="any"
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                placeholder="0.00" 
                disabled={processing}
                className="w-full p-3 rounded-xl border border-white/10 bg-white/5 focus:border-red-500 outline-none text-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Sarafu (Currency)</label>
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value as any)} 
                disabled={processing}
                className="w-full p-3 rounded-xl border border-white/10 bg-white/5 focus:border-red-500 outline-none text-white transition"
              >
                <option value="pi">Pi Network (π)</option>
                <option value="usdt">USDT (Tether)</option>
                <option value="tzs">TZS (Shilling)</option>
                <option value="btc">Bitcoin (₿)</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={processing}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold transition shadow-lg disabled:opacity-50"
          >
            {processing ? 'Inatuma...' : 'Thibitisha na Utume 💸'}
          </button>
        </form>
      </div>
    </div>
  );
}
