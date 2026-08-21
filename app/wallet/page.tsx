"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, addDoc, query, where, orderBy, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db, adjustUserBalance, UserProfile } from '@/lib/user-profile';
import { PI_GCV_USD, convertAmount, formatCurrencyAmount } from '@/components/currency';
import { useLanguage } from '@/hooks/use-language';
import { toast } from 'sonner';

const WalletVoiceAssist = dynamic(() => import('./wallet-voice-assist'), { ssr: false });

const WALLET_COPY = {
  en: {
    badge: 'Enterprise Digital Wallet', title: 'PHCL Super Wallet & Exchange',
    description: 'Review your live multi-currency balances, performs instant transactions, and track records.',
    backHome: 'Back Home', availableBalance: 'Total Estimated Portfolio', gcvRateLabel: '1 PI =', gcvRateSuffix: 'GCV USD',
    goToCheckout: 'Checkout', openMarketplace: 'Marketplace', openExchange: 'Exchange',
    deposit: 'Deposit Funds', withdraw: 'Withdraw Cash', transfer: 'Transfer / Send',
    registerAccount: 'Register / Verify KYC', registerTitle: 'Quick Registration & Identity Setup',
    registerDesc: 'Complete your PHCL Super profile to unlock high-limit transactions.',
    walletsTitle: 'Supported Currencies & Live Assets', recentActivity: 'Recent Wallet Activity & Ledger',
    noRecentActivity: 'No recent wallet activity found.', debitLabel: 'Payment Out', creditLabel: 'Top Up / Deposit',
    depositTitle: 'Deposit Funds to Wallet', withdrawTitle: 'Withdraw Funds from Wallet', transferTitle: 'Transfer Funds to User',
    amountLabel: 'Amount', currencyLabel: 'Currency', recipientLabel: 'Recipient Wallet Address (UID)', confirmAction: 'Confirm Action', cancel: 'Cancel', successMsg: 'Registration info saved successfully!',
  },
  sw: {
    badge: 'Wallet Rasmi ya Kidijitali', title: 'Wallet na Exchange ya PHCL Super',
    description: 'Kagua salio lako la sarafu mbalimbali, fanya miamala ya haraka, na fuatilia mfumo wa akiba.',
    backHome: 'Rudi Nyumbani', availableBalance: 'Jumla ya Salio la Portifolio', GcvRateLabel: '1 PI =', gcvRateSuffix: 'GCV USD',
    goToCheckout: 'Nenda Checkout', openMarketplace: 'Fungua Marketplace', openExchange: 'Fungua Exchange',
    deposit: 'Weka Salio', withdraw: 'Toa Fedha', transfer: 'Tuma Fedha',
    registerAccount: 'Jisajili / Thibitisha KYC', registerTitle: 'Usajili wa Haraka na Kitambulisho',
    registerDesc: 'Kamilisha profaili yako ya PHCL Super ili kuongeza ukomo wa miamala.',
    walletsTitle: 'Sarafu Zinazokubalika & Bendera', recentActivity: 'Shughuli za Karibuni za Wallet',
    noRecentActivity: 'Bado hakuna shughuli yoyote ya wallet.', debitLabel: 'Malipo Yaliyotoka', creditLabel: 'Ongezeko la Salio',
    depositTitle: 'Weka Salio Kwenye Wallet', withdrawTitle: 'Toa Fedha Kutoka Kwenye Wallet', transferTitle: 'Tuma Fedha kwa Mtumiaji Mwengine',
    amountLabel: 'Kiasi cha Fedha', currencyLabel: 'Aina ya Sarafu', recipientLabel: 'Anwani ya Wallet (UID) ya Mpokeaji', confirmAction: 'Thibitisha Muamala', cancel: 'Ghairi', successMsg: 'Taarifa za usajili zimehifadhiwa kikamilifu!',
  },
} as const;

export default function WalletPage() {
  const { language } = useLanguage();
  const isSw = language === 'sw';
  const copy = isSw ? WALLET_COPY.sw : WALLET_COPY.en;
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & States
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState<'deposit' | 'withdraw' | 'transfer' | null>(null);
  const [regForm, setRegForm] = useState({ fullName: '', contact: '', country: 'Tanzania', tier: 'regular' as 'regular' | 'small_business' | 'corporate', idType: 'NIDA', idNumber: '', companyName: '', companyRegNo: '', mfaEnabled: false, livenessVerified: false });
  const [actionAmount, setActionAmount] = useState('');
  const [actionCurrency, setActionCurrency] = useState<'usd' | 'tzs' | 'ntzs' | 'pi'>('tzs');
  const [actionRecipient, setActionRecipient] = useState('');

  // 1. FIRESTORE REAL-TIME BALANCES & TRANSACTIONS
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && db) {
        const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (snap) => {
          if (snap.exists()) setProfile({ uid: user.uid, ...snap.data() } as UserProfile);
        });
        const q = query(collection(db, 'transactions'), where('uid', '==', user.uid), orderBy('createdAt', 'desc'));
        const unsubLedger = onSnapshot(q, (snap) => {
          setLedger(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
        });
        return () => { unsubProfile(); unsubLedger(); };
      } else { setProfile(null); setLoading(false); }
    });
    return () => unsubscribeAuth();
  }, [currentUser]);

  const totalUsd = useMemo(() => {
    if (!profile || !profile.balances) return 0;
    return (profile.balances.usd || 0) + convertAmount(profile.balances.tzs || 0, 'tzs', 'usd') + convertAmount(profile.balances.ntzs || 0, 'ntzs', 'usd') + convertAmount(profile.balances.pi || 0, 'pi', 'usd');
  }, [profile]);

  // 2. KUSALIMISHA KYC KISERVER
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !db) return;

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        fullName: regForm.fullName,
        phone: regForm.contact,
        country: regForm.country,
        tier: regForm.tier,
        idType: regForm.tier !== 'regular' ? regForm.idType : null,
        idNumber: regForm.tier !== 'regular' ? regForm.idNumber : null,
        companyName: regForm.tier === 'corporate' ? regForm.companyName : null,
        companyRegNo: regForm.tier === 'corporate' ? regForm.companyRegNo : null,
        mfaEnabled: regForm.tier !== 'regular' ? regForm.mfaEnabled : false,
        livenessVerified: regForm.tier !== 'regular' ? regForm.livenessVerified : false,
        kycStatus: regForm.tier !== 'regular' ? 'PENDING_REVIEW' : 'APPROVED',
        updatedAt: serverTimestamp(),
      });
      toast.success('Uhakiki wa kitambulisho umehifadhiwa kikamilifu!');
      setShowRegisterModal(false);
    } catch {
      toast.error('Kosa limetokea wakati wa kuhifadhi KYC.');
    }
  };

 // 2. KUKATA SALIO NA KUREJESHA RISITI MAALUM YA MUAMALA (DETAILED RECEIPT)
const handleActionExecute = async (e: React.FormEvent) => {
  e.preventDefault();
  const num = parseFloat(actionAmount);
  if (isNaN(num) || num <= 0 || !currentUser || !db) return;

  try {
    const txRef = collection(db, 'transactions');
    let successMessage = '';

    if (showActionModal === 'deposit') {
      await adjustUserBalance(currentUser.uid, actionCurrency, num);
      await addDoc(txRef, { uid: currentUser.uid, type: 'credit', currency: actionCurrency, amount: num, createdAt: serverTimestamp() });
      
      successMessage = isSw 
        ? `Muamala Umefanikiwa! Umeweka ${formatCurrencyAmount(actionCurrency, num)} kwenye wallet yako.`
        : `Success! Deposited ${formatCurrencyAmount(actionCurrency, num)} into your wallet.`;
        
    } else if (showActionModal === 'withdraw') {
      await adjustUserBalance(currentUser.uid, actionCurrency, -num);
      await addDoc(txRef, { uid: currentUser.uid, type: 'debit', currency: actionCurrency, amount: num, createdAt: serverTimestamp() });
      
      successMessage = isSw 
        ? `Muamala Umefanikiwa! Umetoa ${formatCurrencyAmount(actionCurrency, num)} kwenda Benki/M-Pesa.`
        : `Success! Withdrew ${formatCurrencyAmount(actionCurrency, num)} to your bank/mobile wallet.`;
        
    } else if (showActionModal === 'transfer') {
      await adjustUserBalance(currentUser.uid, actionCurrency, -num);
      await addDoc(txRef, { uid: currentUser.uid, type: 'debit', currency: actionCurrency, amount: num, createdAt: serverTimestamp() });
      
      if (actionRecipient.trim()) {
        await adjustUserBalance(actionRecipient.trim(), actionCurrency, num);
        await addDoc(txRef, { uid: actionRecipient.trim(), type: 'credit', currency: actionCurrency, amount: num, createdAt: serverTimestamp() });
      }
      
      successMessage = isSw 
        ? `Muamala Umefanikiwa! Umetuma ${formatCurrencyAmount(actionCurrency, num)} kwenda kwa Mpokeaji (UID: ${actionRecipient}).`
        : `Success! Transferred ${formatCurrencyAmount(actionCurrency, num)} to recipient (UID: ${actionRecipient}).`;
    }

    // Risiti inakaa sekunde 5 (duration: 5000) ili mtumiaji asome taarifa zote kwa utulivu
    toast.success(successMessage, { duration: 5000 });
  } catch (error) {
    toast.error(isSw ? 'Kosa la muamala limetokea. Salio halijaguswa!' : 'Transaction failed. No changes were made.');
  } finally {
    setShowActionModal(null); setActionAmount(''); setActionRecipient('');
  }
};


  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Inapakia...</div>;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4 text-center p-6">
        <p className="text-gray-300">Tafadhali ingia ili kufungua Wallet Ledger.</p>
        <Link href="/login" className="rounded-xl bg-amber-500 px-6 py-2.5 text-slate-950 font-bold text-sm">Kuingia (Login)</Link>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[#1c1607] text-white font-sans">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_35%)]" />
      <section className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-amber-400/20 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              {copy.badge}
            </div>
            <h1 className="mt-3 text-3xl font-black text-amber-100 sm:text-4xl">{copy.title}</h1>
            <p className="mt-1 max-w-2xl text-xs text-slate-300 sm:text-sm">{copy.description}</p>
          </div>
          <Link href="/" className="rounded-xl border border-white/20 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200">{copy.backHome}</Link>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-amber-300/80 font-bold">{copy.availableBalance}</p>
              <h2 className="mt-1 text-4xl sm:text-5xl font-black tracking-tight text-amber-200">{formatCurrencyAmount('usd', totalUsd)}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-amber-100/90">
                <span className="rounded-lg bg-amber-400/20 px-3 py-1 font-extrabold border border-amber-400/30">1 PI = ${PI_GCV_USD.toLocaleString('en-US')} GCV</span>
                <span className="rounded-lg bg-emerald-400/20 px-3 py-1 font-bold border border-emerald-400/30 text-emerald-300">✓ Verified Live Rates</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap items-center">
              <button onClick={() => setShowActionModal('deposit')} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-center text-xs font-black text-slate-950 transition hover:scale-105">+ {copy.deposit}</button>
              <button onClick={() => setShowActionModal('withdraw')} className="rounded-xl border border-rose-400/40 bg-rose-500/20 px-4 py-3 text-center text-xs font-black text-rose-200 transition hover:bg-rose-500/30 hover:scale-105">↑ {copy.withdraw}</button>
              <button onClick={() => setShowActionModal('transfer')} className="rounded-xl border border-amber-400/40 bg-amber-400/20 px-4 py-3 text-center text-xs font-black text-amber-200 transition hover:bg-amber-400/30 hover:scale-105">⇄ {copy.transfer}</button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <Link href="/checkout" className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300">🛒 {copy.goToCheckout}</Link>
            <Link href="/marketplace" className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300">🏬 {copy.openMarketplace}</Link>
            <Link href="/exchange" className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-300">💱 {copy.openExchange}</Link>
          </div>

          <div className="mt-5">
            <WalletVoiceAssist balancePi={profile?.balances?.pi ? profile.balances.pi.toFixed(8) : "0.00"} gcvUsd={PI_GCV_USD.toLocaleString('en-US')} />
          </div>

          <div className="mt-8">
            <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">{copy.walletsTitle}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 p-5"><div className="flex items-center justify-between"><span className="text-3xl">🥧</span><span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-400/40 rounded-full px-2 py-0.5">Pi Network</span></div><p className="mt-4 text-xs text-slate-400 font-semibold">Pi Crypto Asset</p><p className="text-xl font-black text-amber-200">{formatCurrencyAmount('pi', profile?.balances?.pi || 0)}</p></div>
              <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-950 p-5"><div className="flex items-center justify-between"><span className="text-3xl">🇹🇿</span><span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-400/30 rounded-full px-2 py-0.5">TZS Cash</span></div><p className="mt-4 text-xs text-slate-400 font-semibold">Tanzanian Shilling</p><p className="text-xl font-black text-emerald-200">{formatCurrencyAmount('tzs', profile?.balances?.tzs || 0)}</p></div>
              <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-950/30 via-slate-900 to-slate-950 p-5"><div className="flex items-center justify-between"><span className="text-3xl">🇹🇿⚡</span><span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 border border-cyan-400/30 rounded-full px-2 py-0.5">nTZS Stable</span></div><p className="mt-4 text-xs text-slate-400 font-semibold">Digital Shilling</p><p className="text-xl font-black text-cyan-200">{formatCurrencyAmount('ntzs', profile?.balances?.ntzs || 0)}</p></div>
              <div className="rounded-2xl border border-blue-400/30 bg-gradient-to-br from-blue-950/30 via-slate-900 to-slate-950 p-5"><div className="flex items-center justify-between"><span className="text-3xl">🇺🇸</span><span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 border border-blue-400/30 rounded-full px-2 py-0.5">USD Global</span></div><p className="mt-4 text-xs text-slate-400 font-semibold">US Dollar</p><p className="text-xl font-black text-blue-200">{formatCurrencyAmount('usd', profile?.balances?.usd || 0)}</p></div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">{copy.recentActivity}</p>
            <div className="space-y-3">
              {ledger.length === 0 ? (
                <p className="text-sm text-slate-500 py-3 text-center">{copy.noRecentActivity}</p>
              ) : (
                ledger.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-xs hover:bg-white/10">
                    <div>
                      <p className="font-bold text-white text-sm">{entry.type === 'debit' ? copy.debitLabel : copy.creditLabel} ({entry.currency.toUpperCase()})</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{entry.createdAt ? new Date(entry.createdAt.seconds * 1000).toLocaleString('en-US') : ''}</p>
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
          <div className="w-full max-w-md rounded-3xl border border-amber-400/40 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-amber-200">{copy.registerTitle}</h3>
            <p className="mt-1 text-xs text-slate-400">{copy.registerDesc}</p>

            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Chagua Daraja la Akaunti (User Tier)</label>
                <select value={regForm.tier} onChange={(e) => setRegForm({...regForm, tier: e.target.value as any})} className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-white">
                  <option value="regular">Kawaida (Tier 1 - Up to 2FA, No KYC)</option>
                  <option value="small_business">Mfanyabiashara wa Kawaida (Tier 2 - KYC + Liveness)</option>
                  <option value="corporate">Kampuni / Biashara Kubwa (Tier 3 - KYB + 2FA + Vingine)</option>
                </select>
              </div>

              <input type="text" required placeholder="Majina matatu kamili" value={regForm.fullName} onChange={(e) => setRegForm({...regForm, fullName: e.target.value})} className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-white" />
              <input type="text" required placeholder="Barua Pepe au Namba ya Simu" value={regForm.contact} onChange={(e) => setRegForm({...regForm, contact: e.target.value})} className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-white" />

              {regForm.tier !== 'regular' && (
                <div className="border-t border-white/5 pt-3 space-y-3">
                  <select value={regForm.idType} onChange={(e) => setRegForm({...regForm, idType: e.target.value})} className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-white">
                    <option value="NIDA">NIDA</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="DRIVING_LICENSE">Leseni</option>
                  </select>
                  <input type="text" required placeholder="Namba ya Kitambulisho" value={regForm.idNumber} onChange={(e) => setRegForm({...regForm, idNumber: e.target.value})} className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-white" />
                  
                  <div className="rounded-lg bg-slate-950 p-3 border border-white/5 flex items-center justify-between">
                    <span className="text-xs text-slate-300">Liveness (Kupepesa Macho)</span>
                    <button type="button" onClick={() => setRegForm({...regForm, livenessVerified: true})} className={`rounded px-3 py-1 text-[11px] font-bold ${regForm.livenessVerified ? 'bg-emerald-500 text-slate-950' : 'bg-violet-600 text-white animate-pulse'}`}>
                      {regForm.livenessVerified ? '✓ Verified' : 'Anza'}
                    </button>
                  </div>
                </div>
              )}

              {regForm.tier === 'corporate' && (
                <div className="border-t border-white/5 pt-3 space-y-3">
                  <input type="text" required placeholder="Jina la Kampuni" value={regForm.companyName} onChange={(e) => setRegForm({...regForm, companyName: e.target.value})} className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-white" />
                  <input type="text" required placeholder="Namba ya Usajili (BRELA)" value={regForm.companyRegNo} onChange={(e) => setRegForm({...regForm, companyRegNo: e.target.value})} className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-white" />
                  <label className="flex items-center gap-2 text-xs text-amber-300 font-bold"><input type="checkbox" checked={regForm.mfaEnabled} onChange={(e) => setRegForm({...regForm, mfaEnabled: e.target.checked})} required /><span>Washa 2FA (Lazima)</span></label>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button type="submit" className="flex-1 rounded-xl bg-amber-400 py-2.5 font-bold text-slate-950 hover:bg-amber-300">Hifadhi & Thibitisha KYC</button>
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
                  <input type="text" required value={actionRecipient} onChange={(e) => setActionRecipient(e.target.value)} className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-white focus:outline-none" placeholder="Anwani ya Wallet (UID) ya mpokeaji" />
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
