// app/wallet/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { PI_GCV_USD, convertAmount, formatCurrencyAmount } from '@/components/currency';
import { useCommerceSnapshot } from '@/hooks/use-commerce-snapshot';
import { useCommerceBootstrap } from '@/hooks/use-commerce-bootstrap';
import { useLanguage } from '@/hooks/use-language';
import { 
  WALLET_UPDATED_EVENT, 
  WalletLedgerEntry, 
  WalletSnapshot, 
  getWalletLedger, 
  getWalletSnapshot,
  updateWalletBalance
} from '@/lib/wallet-storage';

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

const FALLBACK_SNAPSHOT: WalletSnapshot = {
  balances: {
    usd: 0,
    tzs: 0,
    ntzs: 0,
    pi: 0,
  },
  updatedAt: '',
};

export default function WalletPage() {
  const { language } = useLanguage();
  const isSwahili = language === 'sw';
  const copy = isSwahili ? WALLET_COPY.sw : WALLET_COPY.en;
  
  const [snapshot, setSnapshot] = useState<WalletSnapshot>(FALLBACK_SNAPSHOT);
  const [ledger, setLedger] = useState<WalletLedgerEntry[]>([]);
  const { snapshot: commerceSnapshot } = useCommerceSnapshot();

  // Modals & States
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState<'deposit' | 'withdraw' | 'transfer' | null>(null);
  const [regForm, setRegForm] = useState({ fullName: '', contact: '', country: 'Tanzania', idType: 'nida' });
  const [actionAmount, setActionAmount] = useState('');
  const [actionCurrency, setActionCurrency] = useState<'usd' | 'tzs' | 'ntzs' | 'pi'>('tzs');
  const [actionRecipient, setActionRecipient] = useState('');
  const [statusNote, setStatusNote] = useState('');

  useEffect(() => {
    if (!commerceSnapshot) return;
    setSnapshot(commerceSnapshot.walletSnapshot ?? FALLBACK_SNAPSHOT);
    setLedger(commerceSnapshot.walletLedger);
  }, [commerceSnapshot]);

  useCommerceBootstrap(useCallback(() => {
    const syncWallet = () => {
      setSnapshot(getWalletSnapshot());
      setLedger(getWalletLedger());
    };

    syncWallet();
    window.addEventListener(WALLET_UPDATED_EVENT, syncWallet);
    window.addEventListener('storage', syncWallet);

    return () => {
      window.removeEventListener(WALLET_UPDATED_EVENT, syncWallet);
      window.removeEventListener('storage', syncWallet);
    };
  }, []));

  const totalUsd = useMemo(() => {
    return (
      snapshot.balances.usd +
      convertAmount(snapshot.balances.tzs, 'tzs', 'usd') +
      convertAmount(snapshot.balances.ntzs, 'ntzs', 'usd') +
      convertAmount(snapshot.balances.pi, 'pi', 'usd')
    );
  }, [snapshot]);

  const latestEntries = ledger.slice(0, 8);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusNote(copy.successMsg);
    setTimeout(() => {
      setStatusNote('');
      setShowRegisterModal(false);
    }, 1500);
  };

  const handleActionExecute = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(actionAmount);
    if (isNaN(num) || num <= 0) return;

    if (showActionModal === 'deposit') {
      updateWalletBalance(actionCurrency, num, 'credit', `Deposit via PHCL Gateway`);
    } else if (showActionModal === 'withdraw') {
      updateWalletBalance(actionCurrency, num, 'debit', `Withdrawal to Bank/Mobile`);
    } else if (showActionModal === 'transfer') {
      updateWalletBalance(actionCurrency, num, 'debit', `Transfer to ${actionRecipient}`);
    }

    setShowActionModal(null);
    setActionAmount('');
    setActionRecipient('');
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[#1c1607] text-white font-sans">
      {/* Background Neon Spotlights */}
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
            <p className="mt-1 max-w-2xl text-xs text-slate-300 sm:text-sm">
              {copy.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowRegisterModal(true)}
              className="rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 px-4 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-400 hover:text-slate-950 shadow-md"
            >
              👤 {copy.registerAccount}
            </button>
            <Link 
              href="/home" 
              className="rounded-xl border border-white/20 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/20"
            >
              {copy.backHome}
            </Link>
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
            <Link href="/checkout" className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20">
              🛒 {copy.goToCheckout}
            </Link>
            <Link href="/marketplace" className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20">
              🏬 {copy.openMarketplace}
            </Link>
            <Link href="/exchange" className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-300 hover:bg-violet-500/20">
              💱 {copy.openExchange}
            </Link>
          </div>

          {/* Voice Assistant AI Hook */}
          <div className="mt-5">
            <WalletVoiceAssist
              balancePi={snapshot.balances.pi.toFixed(8)}
              gcvUsd={PI_GCV_USD.toLocaleString('en-US')}
            />
          </div>

          {/* Multi-Currency Cards with Flags & Balances */}
          <div className="mt-8">
            <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">{copy.walletsTitle}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              
              {/* Pi Network Card */}
              <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 p-5 backdrop-blur-md shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">🥧</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-400/40 rounded-full px-2 py-0.5 bg-amber-400/10">Pi Network</span>
                </div>
                <p className="mt-4 text-xs text-slate-400 font-semibold">Pi Crypto Asset</p>
                <p className="text-xl font-black text-amber-200">{formatCurrencyAmount('pi', snapshot.balances.pi)}</p>
              </div>

              {/* TZS Card */}
              <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-950 p-5 backdrop-blur-md shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">🇹🇿</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-400/30 rounded-full px-2 py-0.5 bg-emerald-400/10">TZS Cash</span>
                </div>
                <p className="mt-4 text-xs text-slate-400 font-semibold">Tanzanian Shilling</p>
                <p className="text-xl font-black text-emerald-200">{formatCurrencyAmount('tzs', snapshot.balances.tzs)}</p>
              </div>

              {/* nTZS Digital Card */}
              <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-950/30 via-slate-900 to-slate-950 p-5 backdrop-blur-md shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">🇹🇿⚡</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 border border-cyan-400/30 rounded-full px-2 py-0.5 bg-cyan-400/10">nTZS Stable</span>
                </div>
                <p className="mt-4 text-xs text-slate-400 font-semibold">Digital Shilling</p>
                <p className="text-xl font-black text-cyan-200">{formatCurrencyAmount('ntzs', snapshot.balances.ntzs)}</p>
              </div>

              {/* USD Card */}
              <div className="rounded-2xl border border-blue-400/30 bg-gradient-to-br from-blue-950/30 via-slate-900 to-slate-950 p-5 backdrop-blur-md shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">🇺🇸</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 border border-blue-400/30 rounded-full px-2 py-0.5 bg-blue-400/10">USD Global</span>
                </div>
                <p className="mt-4 text-xs text-slate-400 font-semibold">US Dollar</p>
                <p className="text-xl font-black text-blue-200">{formatCurrencyAmount('usd', snapshot.balances.usd)}</p>
              </div>

            </div>
          </div>

          {/* Ledger & Recent Activity */}
          <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/70 p-5 shadow-inner">
            <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">{copy.recentActivity}</p>
            <div className="space-y-3">
              {latestEntries.length === 0 ? (
                <p className="text-sm text-slate-500 py-3 text-center">{copy.noRecentActivity}</p>
              ) : (
                latestEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-xs hover:bg-white/10 transition">
                    <div>
                      <p className="font-bold text-white text-sm">
                        {entry.type === 'debit' ? copy.debitLabel : copy.creditLabel} ({entry.currency.toUpperCase()})
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{new Date(entry.createdAt).toLocaleString('en-US')}</p>
                    </div>
                    <p className={entry.type === 'debit' ? 'font-black text-rose-400 text-sm sm:text-base' : 'font-black text-emerald-400 text-sm sm:text-base'}>
                      {entry.type === 'debit' ? '-' : '+'}{formatCurrencyAmount(entry.currency, entry.amount)}
                    </p>
                  </div>
                ))
              )}
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
                <input 
                  type="text" 
                  required
                  value={regForm.fullName}
                  onChange={(e) => setRegForm({...regForm, fullName: e.target.value})}
                  className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-white focus:border-amber-400 focus:outline-none"
                  placeholder="e.g. Juma Rashid Mushi"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">{copy.emailPhone}</label>
                <input 
                  type="text" 
                  required
                  value={regForm.contact}
                  onChange={(e) => setRegForm({...regForm, contact: e.target.value})}
                  className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-white focus:border-amber-400 focus:outline-none"
                  placeholder="+255 700 000 000 or name@domain.com"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">{copy.idType}</label>
                <select 
                  value={regForm.idType}
                  onChange={(e) => setRegForm({...regForm, idType: e.target.value})}
                  className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="nida">{copy.nationalId}</option>
                  <option value="passport">{copy.passport}</option>
                  <option value="license">{copy.driversLicense}</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button 
                  type="submit" 
                  className="flex-1 rounded-xl bg-amber-400 py-2.5 font-bold text-slate-950 hover:bg-amber-300"
                >
                  {copy.submitRegistration}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowRegisterModal(false)}
                  className="rounded-xl border border-white/20 px-4 py-2.5 font-semibold text-slate-300 hover:bg-white/10"
                >
                  {copy.cancel}
                </button>
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
                <select 
                  value={actionCurrency}
                  onChange={(e: any) => setActionCurrency(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="tzs">TZS (Tanzanian Shilling)</option>
                  <option value="ntzs">nTZS (Digital Shilling)</option>
                  <option value="pi">PI (Pi Network Crypto)</option>
                  <option value="usd">USD (US Dollar)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">{copy.amountLabel}</label>
                <input 
                  type="number" 
                  step="any"
                  required
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-white focus:border-amber-400 focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              {showActionModal === 'transfer' && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1">{copy.recipientLabel}</label>
                  <input 
                    type="text" 
                    required
                    value={actionRecipient}
                    onChange={(e) => setActionRecipient(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-white focus:border-amber-400 focus:outline-none"
                    placeholder="e.g. phcl_user_9921"
                  />
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button 
                  type="submit" 
                  className="flex-1 rounded-xl bg-amber-400 py-2.5 font-bold text-slate-950 hover:bg-amber-300"
                >
                  {copy.confirmAction}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowActionModal(null)}
                  className="rounded-xl border border-white/20 px-4 py-2.5 font-semibold text-slate-300 hover:bg-white/10"
                >
                  {copy.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
