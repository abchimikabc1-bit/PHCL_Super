'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@phclsuper.com');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Barua pepe na nenosiri vinahitajika!');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(data?.message || 'Kosa la kuingia! Jaribu tena.');
        return;
      }

      // Angalia kama Admin ameshaweka password yake mpya ya herufi 12-24
      if (data?.adminSetupComplete === false) {
        toast.info('Karibu! Tafadhali weka nenosiri lako jipya la herufi 12-24 kwanza.');
        router.replace('/admin/setup-password'); // Njia ya dharura ya kwanza
      } else {
        toast.success('Kuingia kumefanikiwa kikamilifu!');
        router.replace('/admin/dashboard'); // Kuingia moja kwa moja
      }
    } catch {
      toast.error('Kosa la mtandao! Jaribu tena.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-amber-500/20 rounded-2xl p-8 shadow-[0_0_40px_rgba(245,158,11,0.15)]">
        <h1 className="text-2xl font-black text-amber-200 mb-2">PHCL Admin Center</h1>
        <p className="text-xs text-gray-400 mb-6">Ukurasa huu una ulinzi thabiti wa kibenki kuzuia maingilio yasiyoruhusiwa.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-amber-300 mb-1">Email ya Admin</label>
            <input
              id="email"
              type="email"
              required
              className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white focus:border-amber-400 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold text-amber-300 mb-1">Password</label>
            <input
              id="password"
              type="password"
              required
              className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white focus:border-amber-400 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-sm transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Inahakiki msimbo...' : 'Kuingia Kama Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}
