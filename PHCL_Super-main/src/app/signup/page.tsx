'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { Sparkles, User, Mail, Lock } from 'lucide-react';

// Usanidi thabiti wa mradi wako wa Firebase
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

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setStatusMessage('Tafadhali jaza sehemu zote!');
      return;
    }

    if (password.length < 8) {
      setStatusMessage('Nenosiri lazima liwe na herufi zisizopungua 8!');
      return;
    }

    setProcessing(true);
    setStatusMessage('Tunaunda akaunti na kupakia bakshishi yako...');

    try {
      // 1. Kuunda Mtumiaji kwenye Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const user = userCredential.user;

      // 2. Kusasisha Jina la Mtumiaji kwenye Auth Profile
      await updateProfile(user, { displayName: name.trim() });

      // 3. Kuanzisha faili la pochi (Wallet Document) kule Firestore na kumpa zawadi ya karibu ya USD 2.00 (no-cost)
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        displayName: name.trim(),
        email: email.trim().toLowerCase(),
        balances: {
          pi: 0, 
          tzs: 0,
          usdt: 2.00, // Zawadi ya kwanza ya no-cost ya USD 2.00 (USDT) kama bakshishi!
          btc: 0
        },
        createdAt: new Date()
      });

      setStatusMessage('Hongera! Akaunti imefunguliwa na umepewa USD 2.00 kama zawadi ya karibu! Inakupeleka kwenye Pochi...');
      // Kuelekeza kwenye pochi baada ya sekunde 2
      setTimeout(() => {
        window.location.href = '/wallet';
      }, 2000);

    } catch (error: any) {
      console.error("Usajili umefeli:", error);
      setStatusMessage(error.message || "Hitilafu imetokea wakati wa usajili.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] p-6 text-white flex items-center justify-center relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(167,139,250,0.05),transparent_22%)]" />
      
      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/35 bg-amber-200/15 px-3 py-1 text-xs font-semibold text-white shadow-lg animate-pulse mb-4">
            <Sparkles size={14} className="text-yellow-400" />
            PHCL Super Platform
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-amber-100 to-white bg-clip-text text-transparent">Fungua Akaunti</h1>
          <p className="text-sm text-gray-400 mt-2">Sajili na upokee USD 2.00 kama zawadi ya karibu!</p>
        </div>

        <form onSubmit={handleSignup} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-xl space-y-6">
          {statusMessage && (
            <div className="p-4 rounded-xl bg-white/10 border border-white/20 text-yellow-300 font-semibold text-sm">
              {statusMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Jina Kamili (Full Name)</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400"><User size={18} /></span>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Andika jina lako..." 
                disabled={processing}
                className="w-full pl-10 p-3 rounded-xl border border-white/10 bg-white/5 focus:border-amber-300 outline-none text-white transition text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Barua Pepe (Email Address)</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400"><Mail size={18} /></span>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Andika barua pepe..." 
                disabled={processing}
                className="w-full pl-10 p-3 rounded-xl border border-white/10 bg-white/5 focus:border-amber-300 outline-none text-white transition text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Nenosiri (Password - herufi 8+)</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400"><Lock size={18} /></span>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Andika nenosiri lako..." 
                disabled={processing}
                className="w-full pl-10 p-3 rounded-xl border border-white/10 bg-white/5 focus:border-amber-300 outline-none text-white transition text-sm"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={processing}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 hover:from-amber-200 hover:to-yellow-300 text-slate-900 font-bold transition shadow-lg disabled:opacity-50"
          >
            {processing ? 'Tunafungua akaunti...' : 'Sajili na Upokee Zawadi ya USD 2.00 🔐'}
          </button>

          <p className="text-center text-xs text-gray-400">
            Tayari una akaunti? <Link href="/login" className="text-amber-300 hover:underline">Ingia hapa</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
