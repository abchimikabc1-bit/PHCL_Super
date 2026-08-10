'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { ArrowUpRight, ArrowDownLeft, Wallet, Calendar, AlertCircle } from 'lucide-react';

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

interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'swap' | 'withdraw';
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  timestamp: Timestamp;
  recipientId?: string;
  senderId?: string;
  bankName?: string;
}

export default function TransactionsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          // Kusoma miamala yote ya mtumiaji kutoka Firestore (kuanzia mpya zaidi)
          const txRef = collection(db, 'transactions');
          const q = query(
            txRef, 
            where('userId', '==', currentUser.uid),
            orderBy('timestamp', 'desc')
          );
          
          const querySnapshot = await getDocs(q);
          const txList: Transaction[] = [];
          querySnapshot.forEach((doc) => {
            txList.push({ id: doc.id, ...doc.data() } as Transaction);
          });
          setTransactions(txList);
        } catch (error) {
          console.error("Kosa la kusoma miamala:", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <p className="text-xl font-bold animate-pulse">Inapakia Historia ya Miamala... 🔐</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <h1 className="text-3xl font-black mb-4 text-purple-500">Ukurasa Imelindwa (Locked)</h1>
        <p className="text-gray-400 mb-6 text-center max-w-md">
          Tafadhali ingia kwenye akaunti yako kwanza ili kuweza kuona historia yako ya miamala.
        </p>
        <Link href="/signup" className="px-6 py-3 bg-amber-300 text-slate-900 font-bold rounded-xl shadow-lg hover:bg-amber-200">
          Ingia kwenye Akaunti
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] p-6 text-white relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.05),transparent_22%)]" />
      
      <div className="max-w-2xl mx-auto relative z-10 pt-10">
        <Link href="/wallet" className="text-sm text-amber-300 hover:text-amber-200 mb-6 inline-block">
          ← Rudi Kwenye Pochi
        </Link>
        
        <h1 className="text-3xl font-black mb-8 bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent">Daftari la Miamala (History)</h1>
        
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <FilterButton label="Zote" active={filter === 'all'} onClick={() => setFilter('all')} />
          <FilterButton label="Utumaji (Send)" active={filter === 'send'} onClick={() => setFilter('send')} />
          <FilterButton label="Mapokezi (Receive)" active={filter === 'receive'} onClick={() => setFilter('receive')} />
          <FilterButton label="Utoaji (Withdraw)" active={filter === 'withdraw'} onClick={() => setFilter('withdraw')} />
          <FilterButton label="Mabadilishano (Swap)" active={filter === 'swap'} onClick={() => setFilter('swap')} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-xl space-y-4">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="mx-auto h-12 w-12 mb-3 text-gray-600" />
              <p className="font-semibold">Hakuna miamala iliyopatikana kwenye kundi hili.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-white/5 border border-white/10 ${getIconColor(tx.type)}`}>
                      {getIcon(tx.type)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-200 uppercase tracking-wide text-sm">{getTransactionTitle(tx)}</p>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Calendar size={12} />
                        {tx.timestamp?.toDate().toLocaleString('en-US') || 'Sasa hivi'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${getAmountColor(tx.type)}`}>
                      {getAmountSign(tx.type)} {tx.amount.toLocaleString()} {tx.currency.toUpperCase()}
                    </p>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${getStatusColor(tx.status)}`}>
                      {tx.status}
                    </span>
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

function FilterButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${active ? 'bg-amber-300 text-slate-900 shadow-md' : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'}`}
    >
      {label}
    </button>
  );
}

function getIcon(type: string) {
  if (type === 'send' || type === 'withdraw') return <ArrowUpRight size={18} />;
  if (type === 'receive') return <ArrowDownLeft size={18} />;
  return <Wallet size={18} />;
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

function getStatusColor(status: string) {
  if (status === 'completed') return 'bg-green-500/20 text-green-300 border border-green-500/30';
  if (status === 'pending') return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
  return 'bg-red-500/20 text-red-300 border border-red-500/30';
}

function getTransactionTitle(tx: Transaction) {
  if (tx.type === 'send') return `Sent to ${tx.recipientId ? 'User' : 'External Wallet'}`;
  if (tx.type === 'receive') return `Received ${tx.currency.toUpperCase()}`;
  if (tx.type === 'withdraw') return `Withdrew to ${tx.bankName ? tx.bankName.toUpperCase() : 'Wallet'}`;
  return `Swapped ${tx.currency.toUpperCase()}`;
}
