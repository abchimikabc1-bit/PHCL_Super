'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { Copy, Check } from 'lucide-react';

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

export default function DepositPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'pi' | 'usdt' | 'tzs' | 'btc'>('pi');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCopyAddress = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <p className="text-xl font-bold animate-pulse">Inapakia Usalama wa Kupokea... 🔐</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <h1 className="text-3xl font-black mb-4 text-green-500">Ukurasa Imelindwa (Locked)</h1>
        <p className="text-gray-400 mb-6 text-center max-w-md">
          Tafadhali ingia kwenye akaunti yako kwanza ili kuweza kupata anwani yako ya pochi na QR code.
        </p>
        <Link href="/signup" className="px-6 py-3 bg-amber-300 text-slate-900 font-bold rounded-xl shadow-lg hover:bg-amber-200">
          Ingia kwenye Akaunti
        </Link>
      </div>
    );
  }

  // Kutengeneza anwani ya kipekee ya QR Code kujiendesha (Google Chart API ya no-cost)
  const qrCodeUrl = `https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=${user.uid}&choe=UTF-8`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] p-6 text-white relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.05),transparent_22%)]" />
      
      <div className="max-w-md mx-auto relative z-10 pt-10">
        <Link href="/wallet" className="text-sm text-amber-300 hover:text-amber-200 mb-6 inline-block">
          ← Rudi Kwenye Pochi
        </Link>
        
        <h1 className="text-3xl font-black mb-8 bg-gradient-to-r from-green-200 to-white bg-clip-text text-transparent">Pokea Crypto (Deposit)</h1>
        
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-xl flex flex-col items-center space-y-6">
          
          <div className="w-full">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 text-center">Chagua Sarafu ya Kupokea</label>
            <select 
              value={currency} 
              onChange={(e) => setCurrency(e.target.value as any)} 
              className="w-full p-3 rounded-xl border border-white/10 bg-white/5 focus:border-green-500 outline-none text-white transition"
            >
              <option value="pi">Pi Network (π)</option>
              <option value="usdt">USDT (Tether)</option>
              <option value="tzs">Tanzanian Shilling (TZS)</option>
              <option value="btc">Bitcoin (₿)</option>
            </select>
          </div>

          {/* QR Code ya Uthibitisho */}
          <div className="p-4 bg-white rounded-2xl shadow-lg relative overflow-hidden flex items-center justify-center w-64 h-64 border border-white/10">
            <img 
              src={qrCodeUrl} 
              alt="Wallet QR Code" 
              className="w-full h-full object-contain"
            />
          </div>

          <div className="w-full space-y-2">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Anwani yako ya Pochi (Wallet Address)</label>
            <div className="flex items-center gap-2 bg-white/5 p-3 rounded-xl border border-white/10 overflow-hidden w-full">
              <p className="text-xs text-gray-300 truncate flex-1 font-mono">{user.uid}</p>
              <button 
                onClick={handleCopyAddress}
                className="p-2 rounded-lg hover:bg-white/10 transition text-amber-300 hover:text-amber-200"
              >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
            {copied && <p className="text-xs text-green-400 text-center font-semibold">Anwani imenakiliwa! 📋</p>}
          </div>

          <div className="text-center text-xs text-gray-400">
            <p>Onyesha au tuma QR Code hii au anwani ya pochi kwa mtumaji ili akutumie {currency.toUpperCase()} salama [1].</p>
          </div>
        </div>
      </div>
    </div>
  );
}
