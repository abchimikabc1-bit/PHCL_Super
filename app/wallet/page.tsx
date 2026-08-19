"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, adjustUserBalance, UserProfile } from '@/lib/user-profile';
import { PI_GCV_USD, convertAmount, formatCurrencyAmount } from '@/components/currency';
import { useLanguage } from '@/hooks/use-language';

const WalletVoiceAssist = dynamic(() => import('./wallet-voice-assist'), {
  ssr: false,
});

const WALLET_COPY = {
  en: {
    badge: 'Enterprise Digital Wallet',
    title: 'PHCL Super Wallet & Exchange',
    description: 'Review your live multi-currency balances, register your identity, perform instant deposits or withdrawals, and track transactions.',
    backHome: 'Back Home',
    availableBalance: 'Total Estimated Portfolio',
    gcvRateLabel: '1 PI =',
    gcvRateSuffix: 'GCV USD',
    goToCheckout: 'Checkout',
    openMarketplace: 'Marketplace',
    openExchange: 'Exchange',
    deposit: 'Deposit Funds',
    withdraw: 'Withdraw Cash',
    transfer: 'Transfer / Send',
    registerAccount: 'Register / Verify KYC',
    registerTitle: 'Quick Registration & Identity Setup',
    registerDesc: 'Complete your PHCL Super profile to unlock high-limit transactions.',
    walletsTitle: 'Supported Currencies & Live Assets',
    recentActivity: 'Recent Wallet Activity & Ledger',
    noRecentActivity: 'No recent wallet activity found.',
    debitLabel: 'Payment Out',
    creditLabel: 'Top Up / Deposit',
    fullName: 'Full Name',
    emailPhone: 'Email or Phone Number',
    country: 'Country / Jurisdiction',
    idType: 'Identity Document Type',
    nationalId: 'National ID / NIDA',
    passport: 'Passport',
    driversLicense: 'Driver License',
    submitRegistration: 'Save & Verify Identity',
    cancel: 'Cancel',
    successMsg: 'Registration info saved successfully!',
    depositTitle: 'Deposit Funds to Wallet',
    withdrawTitle: 'Withdraw Funds from Wallet',
    transferTitle: 'Transfer Funds to User',
    amountLabel: 'Amount',
    currencyLabel: 'Currency',
    recipientLabel: 'Recipient Wallet Address or Username',
    confirmAction: 'Confirm Action',
  },
  sw: {
    badge: 'Wallet Rasmi ya Kidijitali',
    title: 'Wallet na Exchange ya PHCL Super',
    description: 'Kagua salio lako la sarafu mbalimbali, jisajili na uthibitishe kitambulisho, fanya miamala ya haraka, na fuatilia mfumo wa akiba.',
    backHome: 'Rudi Nyumbani',
    availableBalance: 'Jumla ya Salio la Portifolio',
    gcvRateLabel: '1 PI =',
    gcvRateSuffix: 'GCV USD',
    goToCheckout: 'Nenda Checkout',
    openMarketplace: 'Fungua Marketplace',
    openExchange: 'Fungua Exchange',
    deposit: 'Weka Salio',
    withdraw: 'Toa Fedha',
    transfer: 'Tuma Fedha',
    registerAccount: 'Jisajili / Thibitisha KYC',
    registerTitle: 'Usajili wa Haraka na Kitambulisho',
    registerDesc: 'Kamilisha profaili yako ya PHCL Super ili kuongeza ukomo wa miamala.',
    walletsTitle: 'Sarafu Zinazokubalika & Bendera',
    recentActivity: 'Shughuli za Karibuni za Wallet',
    noRecentActivity: 'Bado hakuna shughuli yoyote ya wallet.',
    debitLabel: 'Malipo Yaliyotoka',
    creditLabel: 'Ongezeko la Salio',
    fullName: 'Jina Kamili',
    emailPhone: 'Barua Pepe au Namba ya Simu',
    country: 'Nchi Unayotoka',
    idType: 'Aina ya Kitambulisho',
    nationalId: 'Vitambulisho vya Taifa (NIDA)',
    passport: 'Pasi ya Kusafiria (Passport)',
    driversLicense: 'Laiseni ya Udereva',
    submitRegistration: 'Hifadhi & Thibitisha Profiling',
    cancel: 'Ghairi',
    successMsg: 'Taarifa za usajili zimehifadhiwa kikamilifu!',
    depositTitle: 'Weka Salio Kwenye Wallet',
    withdrawTitle: 'Toa Fedha Kutoka Kwenye Wallet',
    transferTitle: 'Tuma Fedha kwa Mtumiaji Mwengine',
    amountLabel: 'Kiasi cha Fedha',
    currencyLabel: 'Aina ya Sarafu',
    recipientLabel: 'Anwani ya Wallet au Jina la Mtumiaji',
    confirmAction: 'Thibitisha Muamala',
  },
} as const;

export default function WalletPage() {
  const { language } = useLanguage();
  const isSwahili = language === 'sw';
  const copy = isSwahili ? WALLET_COPY.sw : WALLET_COPY.en;
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals & States
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState<'deposit' | 'withdraw' | 'transfer' | null>(null);
  const [regForm, setRegForm] = useState({ fullName: '', contact: '', country: 'Tanzania', idType: 'nida' });
  const [actionAmount, setActionAmount] = useState('');
  const [actionCurrency, setActionCurrency] = useState<'usd' | 'tzs' | 'ntzs' | 'pi'>('tzs');
  const [actionRecipient, setActionRecipient] = useState('');
  const [statusNote, setStatusNote] = useState('');

  // 1. KUSIKILIZA HALI YA AUTH & FIRESTORE REAL-TIME BALANCES
  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (currentUser === user) return; // Kuzuia loops zisizohitajika
      setCurrentUser(user);
      if (user && db) {
        // Sikiliza mabadiliko ya salio kwenye Firestore kimaendeleo (onSnapshot)
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (snapshot) => {
          if (snapshot.exists()) {
            setProfile({ uid: user.uid, ...snapshot.data() } as UserProfile);
          }
          setLoading(false);
        });
        return () => unsubscribeSnapshot();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, [currentUser]);

  // 2. KUKADIRIA THAMANI YA PORTIFOLIO KWA USD (GCV)
  const totalUsd = useMemo(() => {
    if (!profile || !profile.balances) return 0;
    return (
      (profile.balances.usd || 0) +
      convertAmount(profile.balances.tzs || 0, 'tzs', 'usd') +
      convertAmount(profile.balances.ntzs || 0, 'ntzs', 'usd') +
      convertAmount(profile.balances.pi || 0, 'pi', 'usd')
    );
  }, [profile]);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusNote(copy.successMsg);
    setTimeout(() => {
      setStatusNote('');
      setShowRegisterModal(false);
    }, 1500);
  };

  // 3. KUTEKELEZA MIAMALA YA KWELI KWENYE FIRESTORE
  const handleActionExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(actionAmount);
    if (isNaN(num) || num <= 0 || !currentUser) return;

    try {
      if (showActionModal === 'deposit') {
        await adjustUserBalance(currentUser.uid, actionCurrency, num);
      } else if (showActionModal === 'withdraw') {
        // Toa fedha (ingiza kiasi hasi kwenye database)
        await adjustUserBalance(currentUser.uid, actionCurrency, -num);
      } else if (showActionModal === 'transfer') {
        // Tuma fedha (Toa kwako, weka kwa mwingine)
        await adjustUserBalance(currentUser.uid, actionCurrency, -num);
        if (actionRecipient.trim()) {
          await adjustUserBalance(actionRecipient, actionCurrency, num);
        }
      }
      toast.success('Muamala umekamilika kikamilifu!');
    } catch {
      toast.error('Kosa limetokea wakati wa muamala.');
    } finally {
      setShowActionModal(null);
      setActionAmount('');
      setActionRecipient('');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Inapakia Wallet...</div>;
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4 text-center p-6">
        <p className="text-gray-300">Tafadhali ingia kwenye akaunti yako ili kufungua Wallet Ledger.</p>
        <Link href="/login" className="rounded-xl bg-amber-500 px-6 py-2.5 text-slate-950 font-bold text-sm">Kuingia (Login)</Link>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[#1c1607] text-white font-sans">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_35%)]" />

      <section className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-amber-400/20 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              {copy.badge}
            </div>
            <h1 className="mt-3 text-3xl font-black text-amber-100 sm:text-4xl">{copy.title}</h1>
            <p className="mt-1 max-w-2xl text-xs text-slate-300 sm:text-sm">{copy.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowRegisterModal(true)}
              className="rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 px-4 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-400 hover:text-slate-950 shadow-md animate-pulse"
            >
              👤 {copy.registerAccount}
            </button>
            <Link href="/" className="rounded-xl border border-white/20 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/20">{copy.backHome}</Link>
          </div>
        </div>

        {statusNote && (
          <div className="mb-6 rounded-xl border border-emerald-400/40 bg-emerald-500/20 p-4 text-center text-sm font-bold text-emerald-200 animate-bounce">
            {statusNote}
          </div>
        )}

        {/* Main Dashboard Balance Card */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-amber-300/80 font-bold">{copy.availableBalance}</p>
              <h2 className="mt-1 text-4xl sm:text-5xl font-black tracking-tight text-amber-200">
                {formatCurrencyAmount('usd', totalUsd)}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-amber-100/90">
                <span className="rounded-lg bg-amber-400/20 px-3 py-1 font-extrabold border border-amber-400/30">
                  {copy.gcvRateLabel} ${PI_GCV_USD.toLocaleString('en-US')} {copy.gcvRateSuffix}
                </span>
                <span className="rounded-lg bg-emerald-400/20 px-3 py-1 font-bold border border-emerald-400/30 text-emerald-300">
                  ✓ Verified Live Rates
                </span>
              </div>
            </div>

            {/* Quick Miamala Action Buttons */}
            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap items-center">
              <button 
                onClick={() => setShowActionModal('deposit')}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-center text-xs font-black text-slate-950 shadow-lg transition hover:scale-105"
              >
                + {copy.deposit}
              </button>
              <button 
                onClick={() => setShowActionModal('withdraw')}
                className="rounded-xl border border-rose-400/40 bg-rose-500/20 px-4 py-3 text-center text-xs font-black text-rose-200 transition hover:bg-rose-500/30 hover:scale-105"
              >
                ↑ {copy.withdraw}
              </button>
              <button 
                onClick={() => setShowActionModal('transfer')}
                className="rounded-xl border border-amber-400/40 bg-amber-400/20 px-4 py-3 text-center text-xs font-black text-amber-200 transition hover:bg-amber-400/30 hover:scale-105"
              >
                ⇄ {copy.transfer}
              </button>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <Link href="/checkout" className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20">🛒 {copy.goToCheckout}</Link>
            <Link href="/marketplace" className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20">🏬 {copy.openMarketplace}</Link>
            <Link href="/exchange" className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-300 hover:bg-violet-500/20">💱 {copy.openExchange}</Link>
          </div>

          {/* Voice Assistant AI Hook */}
          <div className="mt-5">
            <WalletVoiceAssist
              balancePi={profile?.balances?.pi ? profile.balances.pi.toFixed(8) : "0.00"}
              gcvUsd={PI_GCV_USD.toLocaleString('en-US')}
            />
          </div>

          {/* Multi-Currency Cards with Flags & Balances */}
          <div className="mt-8">
            <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">{copy.walletsTitle}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              
              {/* Pi Network Card */}
              <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">🥧</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-400/40 rounded-full px-2 py-0.5 bg-amber-400/10">Pi Network</span>
                </div>
                <p className="mt-4 text-xs text-slate-400 font-semibold">Pi Crypto Asset</p>
                <p className="text-xl font-black text-amber-200">{formatCurrencyAmount('pi', profile?.balances?.pi || 0)}</p>
              </div>

              {/* TZS Card */}
              <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-950 p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">🇹🇿</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-400/30 rounded-full px-2 py-0.5 bg-emerald-400/10">TZS Cash</span>
                </div>
                <p className="mt-4 text-xs text-slate-400 font-semibold">Tanzanian Shilling</p>
                <p className="text-xl font-black text-emerald-200">{formatCurrencyAmount('tzs', profile?.balances?.tzs || 0)}</p>
              </div>

              {/* nTZS Digital Card */}
              <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-950/30 via-slate-900 to-slate-950 p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">🇹🇿⚡</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 border border-cyan-400/30 rounded-full px-2 py-0.5 bg-cyan-400/10">nTZS Stable</span>
                </div>
                <p className="mt-4 text-xs text-slate-400 font-semibold">Digital Shilling</p>
                <p className="text-xl font-black text-cyan-200">{formatCurrencyAmount('ntzs', profile?.balances?.ntzs || 0)}</p>
              </div>

              {/* USD Card */}
              <div className="rounded-2xl border border-blue-400/30 bg-gradient-to-br from-blue-950/30 via-slate-900 to-slate-950 p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">🇺🇸</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 border border-blue-400/30 rounded-full px-2 py-0.5 bg-blue-400/10">USD Global</span>
                </div>
                <p className="mt-4 text-xs text-slate-400 font-semibold">US Dollar</p>
                <p className="text-xl font-black text-blue-200">{formatCurrencyAmount('usd', profile?.balances?.usd || 0)}</p>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* --- REGISTRATION / KYC MODAL --- */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-amber-400/40 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-black text-amber-200">{copy.registerTitle}</h3>
            <p className="mt-1 text-xs text-slate-400">{copy.registerDesc}</p>

            <form onSubmit={handleRegisterSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">{copy.fullName}</label>
                <input type="text" required value={regForm.fullName} onChange={(e) => setRegForm({...regForm, fullName: e.target.value})} className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-white focus:outline-none" placeholder="e.g. Juma Rashid Mushi" />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">{copy.emailPhone}</label>
                <input type="text" required value={regForm.contact} onChange={(e) => setRegForm({...regForm, contact: e.target.value})} className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-white focus:outline-none" placeholder="+255 700 000 000" />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">{copy.idType}</label>
                <select value={regForm.idType} onChange={(e) => setRegForm({...regForm, idType: e.target.value})} className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-white focus:outline-none">
                  <option value="nida">{copy.nationalId}</option>
                  <option value="passport">{copy.passport}</option>
                  <option value="license">{copy.driversLicense}</option>
                </select>
              </div>
              <div className="pt-2 flex gap-2">
                <button type="submit" className="flex-1 rounded-xl bg-amber-400 py-2.5 font-bold text-slate-950 hover:bg-amber-300">{copy.submitRegistration}</button>
                <button type="button" onClick={() => setShowRegisterModal(false)} className="rounded-xl border border-white/20 px-4 py-2.5 font-semibold text-slate-300 hover:bg-white/10">{copy.cancel}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ACTION MODAL (DEPOSIT / WITHDRAW / TRANSFER) --- */}
      {showActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-amber-400/40 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-black text-amber-200 capitalize">
              {showActionModal === 'deposit' && copy.depositTitle}
              {showActionModal === 'withdraw' && copy.withdrawTitle}
              {showActionModal === 'transfer' && copy.transferTitle}
            </h3>

            <form onSubmit={handleActionExecute} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">{copy.currencyLabel}</label>
                <select value={actionCurrency} onChange={(e: any) => setActionCurrency(e.target.value)} className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-white focus:outline-none">
                  <option value="tzs">TZS (Tanzanian Shilling)</option>
                  <option value="ntzs">nTZS (Digital Shilling)</option>
                  <option value="pi">PI (Pi Network Crypto)</option>
                  <option value="usd">USD (US Dollar)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">{copy.amountLabel}</label>
                <input type="number" step="any" required value={actionAmount} onChange={(e) => setActionAmount(e.target.value)} className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-white focus:outline-none" placeholder="0.00" />
              </div>
              {showActionModal === 'transfer' && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1">{copy.recipientLabel}</label>
                  <input type="text" required value={actionRecipient} onChange={(e) => setActionRecipient(e.target.value)} className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-white focus:outline-none" placeholder="Namba ya utambulisho (UID) ya mpokeaji" />
                </div>
              )}
              <div className="pt-2 flex gap-2">
                <button type="submit" className="flex-1 rounded-xl bg-amber-400 py-2.5 font-bold text-slate-950 hover:bg-amber-300">{copy.confirmAction}</button>
                <button type="button" onClick={() => setShowActionModal(null)} className="rounded-xl border border-white/20 px-4 py-2.5 font-semibold text-slate-300 hover:bg-white/10">{copy.cancel}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
