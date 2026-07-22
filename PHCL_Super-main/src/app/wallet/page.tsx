'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, collection, query, where, getDocs, limit, orderBy, Timestamp } from 'firebase/firestore';
import { getUserWalletBalance } from '../../lib/wallet-service';
import { ArrowUpRight, ArrowDownLeft, Wallet, Calendar, AlertCircle } from 'lucide-react';

// Usanidi thabiti wa Firebase
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

interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'swap' | 'withdraw';
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  timestamp: Timestamp;
}

export default function WalletPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState({ pi: 0, tzs: 0, usdt: 0, btc: 0 });
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          // 1. Kusoma salio halisi la mtumiaji kutoka Firestore
          const userBalances = await getUserWalletBalance(currentUser.uid);
          setBalances(userBalances);

          // 2. Kusoma miamala 3 ya hivi karibuni kabisa
          const txColRef = collection(db, 'transactions');
          const q = query(
            txColRef,
            where('userId', '==', currentUser.uid),
            orderBy('timestamp', 'desc'),
            limit(3)
          );
          const txSnap = await getDocs(q);
          const txList: Transaction[] = [];
          txSnap.forEach((doc) => {
            txList.push({ id: doc.id, ...doc.data() } as Transaction);
          });
          setRecentTxs(txList);
        } catch (error) {
          console.error("Kosa la kusoma data za pochi:", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <p className="text-xl font-bold animate-pulse">Inapakia Pochi Salama... 🔐</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <h1 className="text-3xl font-black mb-4 text-yellow-400">Pochi Imelindwa (Locked)</h1>
        <p className="text-gray-400 mb-6 text-center max-w-md">
          Tafadhali jisajili au ingia kwenye akaunti yako kwanza ili kuona balansi zako na kufanya miamala salama ya kifedha.
        </p>
        <Link href="/signup" className="px-6 py-3 bg-gradient-to-r from-amber-300 to-yellow-400 text-slate-900 font-bold rounded-xl shadow-lg hover:bg-amber-200">
          Ingia kwenye Akaunti
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] p-6 text-white relative pb-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.08),transparent_22%)]" />

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-amber-100 to-white bg-clip-text text-transparent">Pochi Yako (Wallet)</h1>
          <Link href="/" className="text-sm text-amber-300 hover:text-amber-200 font-semibold">
            ← Rudi Home
          </Link>
        </div>

        <div className="rounded-2xl border border-amber-200/20 bg-white/5 p-8 mb-6 backdrop-blur-md shadow-xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-400 rounded-full blur-3xl opacity-20" />
          
          <p className="text-amber-100/80 mb-2 text-sm font-semibold uppercase tracking-wider">Salio la Pi Network (π)</p>
          <p className="text-5xl font-black text-yellow-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">
            π {balances.pi.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </p>
          <p className="text-xs text-gray-400 mt-4">Kiwango cha GCV: 1 PI = $314,159</p>
        </div>

        {/* Assets nyingine za Wallet */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <AssetCard name="USDT (Tether)" value={`$${balances.usdt.toFixed(2)}`} color="text-green-400" />
          <AssetCard name="Bitcoin" value={`₿${balances.btc.toFixed(5)}`} color="text-amber-500" />
          <AssetCard name="Tanzanian Shilling (TZS)" value={`TZS ${balances.tzs.toLocaleString()}`} color="text-blue-400" />
        </div>

        {/* 4 Working Action Buttons! */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link href="/transfer" className="bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-4 rounded-xl hover:from-red-500 hover:to-red-600 transition shadow-lg text-center flex items-center justify-center">
            Tuma Crypto 💸
          </Link>
          <Link href="/deposit" className="bg-gradient-to-r from-green-600 to-green-700 text-white font-bold py-4 rounded-xl hover:from-green-500 hover:to-green-600 transition shadow-lg text-center flex items-center justify-center">
            Pokea Crypto 📥
          </Link>
          <Link href="/withdraw" className="bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold py-4 rounded-xl hover:from-purple-500 hover:to-purple-600 transition shadow-lg text-center flex items-center justify-center">
            Kutoa Fedha 🏦
          </Link>
          <Link href="/transactions" className="bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-4 rounded-xl hover:from-blue-500 hover:to-blue-600 transition shadow-lg text-center flex items-center justify-center">
            Historia 📊
          </Link>
        </div>

        {/* Recent Transactions Section with Live Data */}
        <div className="rounded-2xl border border-amber-200/20 bg-white/5 p-6 backdrop-blur-md shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-100 to-white bg-clip-text text-transparent">Miamala ya Hivi Karibuni</h2>
            <Link href="/transactions" className="text-xs text-amber-300 hover:underline">Tazama Zote</Link>
          </div>
          
          {recentTxs.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              <p>Bado haujafanya miamala yoyote kwenye akaunti hii.</p>
            </div>
          ) : (
            <div className="space-y-3 divide-y divide-white/5">
              {recentTxs.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center pt-3 first:pt-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white/5 border border-white/10 ${getIconColor(tx.type)}`}>
                      {getIcon(tx.type)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-200 text-sm uppercase tracking-wide">{getTransactionTitle(tx)}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{tx.timestamp?.toDate().toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-base font-black ${getAmountColor(tx.type)}`}>
                      {getAmountSign(tx.type)} {tx.amount.toLocaleString()} {tx.currency.toUpperCase()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssetCard({ name, value, color }: { name: string, value: string, color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
      <p className="text-xs text-gray-400 font-semibold">{name}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function getIcon(type: string) {
  if (type === 'send' || type === 'withdraw') return <ArrowUpRight size={14} />;
  if (type === 'receive') return <ArrowDownLeft size={14} />;
  return <Wallet size={14} />;
}

function getIconColor(type: string) {
  if (type === 'send' || type === 'withdraw') return 'text-red-400';
  if (type === 'receive') return 'text-green-400';
  return 'text-purple-400';
}

function getAmountColor(type: string) {
  if (type === 'send' || type === 'withdraw') return 'text-red-400';
  if (type === 'receive') return 'text-green-400';
  return 'text-purple-400';
}

function getAmountSign(type: string) {
  if (type === 'send' || type === 'withdraw') return '-';
  if (type === 'receive') return '+';
  return '±';
}

function getTransactionTitle(tx: any) {
  if (tx.type === 'send') return `Sent ${tx.currency.toUpperCase()}`;
  if (tx.type === 'receive') return `Received ${tx.currency.toUpperCase()}`;
  if (tx.type === 'withdraw') return `Withdrew ${tx.currency.toUpperCase()}`;
  return `Swapped ${tx.currency.toUpperCase()}`;
}
