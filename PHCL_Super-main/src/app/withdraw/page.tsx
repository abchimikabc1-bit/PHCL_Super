'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, runTransaction, collection } from 'firebase/firestore';

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

export default function WithdrawPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'pi' | 'usdt' | 'tzs' | 'btc'>('pi');
  const [destination, setDestination] = useState('');
  const [bankName, setBankName] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!amount || !destination) {
      setStatusMessage('Tafadhali jaza sehemu zote!');
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      setStatusMessage('Tafadhali andika kiasi kilicho sahihi!');
      return;
    }

    if (currency === 'tzs' && !bankName) {
      setStatusMessage('Tafadhali chagua au andika Jina la Benki!');
      return;
    }

    setProcessing(true);
    setStatusMessage('Mchakato wa utoaji fedha unaendelea...');

    try {
      const senderRef = doc(db, 'users', user.uid);
      const txColRef = collection(db, 'transactions');

      await runTransaction(db, async (transaction) => {
        const senderSnap = await transaction.get(senderRef);

        let senderBalances = { pi: 0, tzs: 0, usdt: 0, btc: 0 };
        if (senderSnap.exists()) {
          senderBalances = senderSnap.data().balances || senderBalances;
        }

        // Kuhakiki salio
        if (senderBalances[currency] < withdrawAmount) {
          throw new Error("Salio lako halitoshi kukamilisha utoaji huu wa fedha!");
        }

        // Hesabu balansi mpya
        const newSenderBalances = {
          ...senderBalances,
          [currency]: senderBalances[currency] - withdrawAmount
        };

        // 1. Sasisha salio la Mtumiaji
        transaction.set(senderRef, { balances: newSenderBalances }, { merge: true });

        // 2. Rekodi muamala wa utoaji (Withdraw Debit)
        const txRef = doc(txColRef);
        transaction.set(txRef, {
          userId: user.uid,
          type: 'withdraw',
          amount: withdrawAmount,
          currency,
          status: 'completed', // 'completed' au unaweza kuweka 'pending' kama unataka admin aidhinishe kwanza
          destinationAddress: destination,
          bankName: currency === 'tzs' ? bankName : null,
          timestamp: new Date()
        });
      });

      setStatusMessage(`Umetoa kwa mafanikio ${withdrawAmount} ${currency.toUpperCase()} kwenda ${destination}!`);
      setAmount('');
      setDestination('');
      setBankName('');
    } catch (error: any) {
      console.error("Utoaji umefeli:", error);
      setStatusMessage(error.message || "Hitilafu imetokea wakati wa kutoa fedha.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <p className="text-xl font-bold animate-pulse">Inapakia Usalama wa Utoaji... 🔐</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <h1 className="text-3xl font-black mb-4 text-purple-500">Ukurasa Imelindwa (Locked)</h1>
        <p className="text-gray-400 mb-6 text-center max-w-md">
          Tafadhali ingia kwenye akaunti yako kwanza ili kuweza kufanya utoaji wa fedha salama.
        </p>
        <Link href="/signup" className="px-6 py-3 bg-amber-300 text-slate-900 font-bold rounded-xl shadow-lg hover:bg-amber-200">
          Ingia kwenye Akaunti
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] p-6 text-white relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(167,139,250,0.05),transparent_22%)]" />
      
      <div className="max-w-md mx-auto relative z-10 pt-10">
        <Link href="/wallet" className="text-sm text-amber-300 hover:text-amber-200 mb-6 inline-block">
          ← Rudi Kwenye Pochi
        </Link>
        
        <h1 className="text-3xl font-black mb-8 bg-gradient-to-r from-purple-200 to-white bg-clip-text text-transparent">Kutoa Fedha (Withdraw)</h1>
        
        <form onSubmit={handleWithdraw} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-xl space-y-6">
          {statusMessage && (
            <div className="p-4 rounded-xl bg-white/10 border border-white/20 text-yellow-300 font-semibold text-sm">
              {statusMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Chagua Sarafu ya Kutoa</label>
            <select 
              value={currency} 
              onChange={(e) => setCurrency(e.target.value as any)} 
              className="w-full p-3 rounded-xl border border-white/10 bg-white/5 focus:border-purple-500 outline-none text-white transition"
            >
              <option value="pi">Pi Network (π)</option>
              <option value="usdt">USDT (Tether)</option>
              <option value="tzs">Tanzanian Shilling (TZS)</option>
              <option value="btc">Bitcoin (₿)</option>
            </select>
          </div>

          {currency === 'tzs' ? (
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Chagua Benki ya Mpokeaji</label>
              <select 
                value={bankName} 
                onChange={(e) => setBankName(e.target.value)} 
                className="w-full p-3 rounded-xl border border-white/10 bg-white/5 focus:border-purple-500 outline-none text-white transition"
              >
                <option value="">-- Chagua Benki --</option>
                <option value="crdb">CRDB Bank</option>
                <option value="nmb">NMB Bank</option>
                <option value="nbc">NBC Bank</option>
                <option value="exim">Exim Bank</option>
                <option value="mobile">M-Pesa / TigoPesa / AirtelMoney</option>
              </select>
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {currency === 'tzs' ? 'Namba ya Akaunti ya Benki au Simu' : 'Anwani ya Pochi ya Nje (External Wallet Address)'}
            </label>
            <input 
              type="text" 
              value={destination} 
              onChange={(e) => setDestination(e.target.value)} 
              placeholder={currency === 'tzs' ? 'Namba ya akaunti au simu...' : 'Anwani ya kadi k.m. 0x...'} 
              disabled={processing}
              className="w-full p-3 rounded-xl border border-white/10 bg-white/5 focus:border-purple-500 outline-none text-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Kiasi cha Kutoa (Amount)</label>
            <input 
              type="number" 
              step="any"
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              placeholder="0.00" 
              disabled={processing}
              className="w-full p-3 rounded-xl border border-white/10 bg-white/5 focus:border-purple-500 outline-none text-white transition"
            />
          </div>

          <button 
            type="submit" 
            disabled={processing}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold transition shadow-lg disabled:opacity-50"
          >
            {processing ? 'Inafanya kazi...' : 'Thibitisha na Kutoa 💸'}
          </button>
        </form>
      </div>
    </div>
  );
}
