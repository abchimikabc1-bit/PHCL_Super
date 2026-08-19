'use client';

import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getUserProfile, UserProfile } from '@/lib/user-profile';
import Link from 'next/link';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userProfile = await getUserProfile(currentUser.uid);
        setProfile(userProfile);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Inapakia wasifu...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4 p-6 text-center">
        <p className="text-gray-300">Tafadhali ingia kwenye akaunti yako ili kuona wasifu wako.</p>
        <Link href="/login" className="rounded-xl bg-amber-500 px-6 py-2.5 text-slate-950 font-bold text-sm">Kuingia (Login)</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] text-white p-6 pb-24">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-black">Wasifu Wako (My Profile)</h1>
        
        {profile ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 space-y-5 backdrop-blur-md">
            <div>
              <p className="text-xs text-amber-500 font-bold uppercase tracking-wider">Majina Matatu</p>
              <p className="text-xl font-black text-white">{profile.fullName}</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-amber-500 font-bold uppercase tracking-wider">Barua Pepe</p>
                <p className="text-sm text-gray-300">{profile.email}</p>
              </div>
              <div>
                <p className="text-xs text-amber-500 font-bold uppercase tracking-wider">Namba ya Simu</p>
                <p className="text-sm text-gray-300">{profile.phone}</p>
              </div>
            </div>

            {/* SEHEMU YA WALLET BALANCES */}
            <div className="border-t border-white/10 pt-4">
              <p className="text-xs text-amber-500 font-bold uppercase tracking-wider mb-2">Salio la Wallet Binafsi</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-950/60 p-3 border border-white/5"><p className="text-[10px] text-gray-400">USD</p><p className="text-base font-bold text-amber-300">${profile.balances?.usd || 0}</p></div>
                <div className="rounded-xl bg-slate-950/60 p-3 border border-white/5"><p className="text-[10px] text-gray-400">TZS</p><p className="text-base font-bold text-amber-300">{profile.balances?.tzs || 0} TZS</p></div>
                <div className="rounded-xl bg-slate-950/60 p-3 border border-white/5"><p className="text-[10px] text-gray-400">nTZS</p><p className="text-base font-bold text-amber-300">{profile.balances?.ntzs || 0} nTZS</p></div>
                <div className="rounded-xl bg-slate-950/60 p-3 border border-white/5"><p className="text-[10px] text-gray-400">Pi</p><p className="text-base font-bold text-amber-300">{profile.balances?.pi || 0} PI</p></div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-red-400">Wasifu haujapatikana kwenye database yetu.</p>
        )}
      </div>
    </main>
  );
}
