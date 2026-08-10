// src/app/profile/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { auth, logoutUser } from '@/lib/auth';
import { useLanguage } from '@/hooks/use-language';

/**
 * Profile page – displays user information and KYC status.
 * The UI follows the premium glass‑morphism style with the Zambarau (amber),
 * Dhahabu (gold) and Blue‑bahari (deep blue) palette.
 */
export default function ProfilePage() {
  const router = useRouter();
  const { language } = useLanguage();
  const isSw = language === 'sw';

  const copy = {
    title: isSw ? 'Profaili Yako na KYC' : 'Your Profile & KYC',
    subtitle: isSw
      ? 'Simamia akaunti yako, kagua salio la wallet, na kamilisha uhakiki wa utambulisho wako (KYC) kwa usalama.'
      : 'Manage your account, review wallet balances, and complete your secure identity verification (KYC).',
    personalInfo: isSw ? 'Taarifa za Binafsi' : 'Personal Information',
    fullName: isSw ? 'Jina Kamili' : 'Full Name',
    phone: isSw ? 'Namba ya Simu' : 'Phone Number',
    email: isSw ? 'Barua Pepe' : 'Email Address',
    country: isSw ? 'Nchi' : 'Country',
    saveBtn: isSw ? 'Hifadhi Mabadiliko 💾' : 'Save Changes 💾',
    saving: isSw ? 'Inahifadhi...' : 'Saving...',
    walletTitle: isSw ? 'Salio la Pochi (Live Balances)' : 'Wallet Balances',
    kycPending: isSw ? 'KYC haijakamilika' : 'KYC not completed',
    kycCompleted: isSw ? 'KYC imethibitishwa' : 'KYC verified',
    startKyc: isSw ? 'Anza KYC' : 'Start KYC',
  };

  // Placeholder handlers – in a real app these would call backend APIs.
  const handleLogout = async () => {
    try {
      await logoutUser();
      toast.success(isSw ? 'Umetoka' : 'Logged out');
      router.push('/');
    } catch (e) {
      toast.error(isSw ? 'Kosa la kutokutolewa' : 'Logout failed');
    }
  };

  // Dummy KYC status – replace with real data when available.
  const kycCompleted = false;

  return (
    <main className="profile-page container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4 text-amber-300">{copy.title}</h1>
      <p className="mb-6 text-amber-100">{copy.subtitle}</p>

      {/* Personal info placeholder */}
      <section className="glass-card p-6 rounded-xl mb-8 backdrop-blur-md bg-white/10 border border-amber-200/20">
        <h2 className="text-xl font-semibold mb-4 text-amber-200">{copy.personalInfo}</h2>
        <ul className="space-y-2 text-amber-100">
          <li>{copy.fullName}: <span className="font-medium text-amber-300">John Doe</span></li>
          <li>{copy.email}: <span className="font-medium text-amber-300">john@example.com</span></li>
          <li>{copy.phone}: <span className="font-medium text-amber-300">+255 712 345 678</span></li>
          <li>{copy.country}: <span className="font-medium text-amber-300">Tanzania</span></li>
        </ul>
      </section>

      {/* KYC status */}
      <section className="glass-card p-6 rounded-xl mb-8 backdrop-blur-md bg-white/10 border border-amber-200/20">
        <h2 className="text-xl font-semibold mb-4 text-amber-200">KYC</h2>
        <p className="text-amber-100 mb-4">
          {kycCompleted ? copy.kycCompleted : copy.kycPending}
        </p>
        {!kycCompleted && (
          <Link
            href="/kyc"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded"
          >
            {copy.startKyc}
          </Link>
        )}
      </section>

      <button
        onClick={handleLogout}
        className="mt-4 bg-amber-700 hover:bg-amber-800 text-white font-medium py-2 px-4 rounded"
      >
        {isSw ? 'Toka' : 'Logout'}
      </button>
    </main>
  );
}
