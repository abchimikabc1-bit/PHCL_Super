"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { registerCustomer } from '@/lib/customer-registration';
import { getPolicyVersions } from '@/lib/policy-compliance';

export default function SignupPage() {
  const router = useRouter();
  const versions = useMemo(() => getPolicyVersions(), []);
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', country: '', password: '', confirmPassword: '',
    tier: 'regular' as 'regular' | 'small_business' | 'corporate',
    idType: '', idNumber: '', companyName: '', companyRegNo: '', mfaEnabled: false,
    agreedToTerms: false, agreedToPrivacy: false, marketingOptIn: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Uhakiki wa majina matatu (majina yaliyotenganishwa na space)
  const nameParts = form.fullName.trim().split(/\s+/);
  const hasThreeNames = nameParts.length >= 3 && nameParts.every(p => p.length >= 2);

  const canSubmit = 
    hasThreeNames && 
    form.email && 
    form.password.length >= 8 && 
    form.password.length <= 12 && 
    form.password === form.confirmPassword && 
    form.agreedToTerms && 
    form.agreedToPrivacy;

  const updateField = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasThreeNames) {
      toast.error('Tafadhali ingiza majina yako matatu kamili!');
      return;
    }
    if (form.password.length < 8 || form.password.length > 12) {
      toast.error('Nenosiri lazima liwe na urefu wa herufi 8 hadi 12 pekee!');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Nenosiri la kurudia halifanani! Thibitisha upya.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerCustomer({
        fullName: form.fullName, email: form.email, phone: form.phone, country: form.country,
        password: form.password, tier: form.tier, idType: form.idType, idNumber: form.idNumber,
        companyName: form.companyName, companyRegNo: form.companyRegNo, mfaEnabled: form.mfaEnabled,
        agreedToTerms: form.agreedToTerms, agreedToPrivacy: form.agreedToPrivacy, marketingOptIn: form.marketingOptIn
      });
      if (!result.ok) { toast.error(result.message); return; }
      toast.success('Akaunti yako ya PHCL Super imeundwa kikamilifu!');
      router.push('/marketplace');
    } catch {
      toast.error('Usajili umegonga mwamba.');
    } finally { setIsSubmitting(false); }
  };

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-3xl font-black">Fungua Akaunti</h1>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-white/10 bg-slate-900 p-6">
          <select value={form.tier} onChange={(e) => updateField('tier', e.target.value)} className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white">
            <option value="regular">Regular User (Tier 1)</option>
            <option value="small_business">Small Business (Tier 2)</option>
            <option value="corporate">Corporate (Tier 3)</option>
          </select>
          <input type="text" placeholder="Majina matatu kamili (mfano: Juma Rashid Mushi)" value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white" required />
          <input type="email" placeholder="Barua Pepe (Email)" value={form.email} onChange={(e) => updateField('email', e.target.value)} className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white" required />
          <input type="tel" placeholder="Namba ya Simu" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white" required />
          <input type="text" placeholder="Nchi Unayotoka" value={form.country} onChange={(e) => updateField('country', e.target.value)} className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white" required />
          <input type="password" placeholder="Nenosiri gumu (Herufi 8-12)" value={form.password} onChange={(e) => updateField('password', e.target.value)} className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white" required />
          <input type="password" placeholder="Thibitisha Nenosiri (Rudia)" value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white" required />

          {form.tier !== 'regular' && (
            <div className="border-t border-white/10 pt-4 space-y-3">
              <select value={form.idType} onChange={(e) => updateField('idType', e.target.value)} className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white" required>
                <option value="">Chagua Aina ya Kitambulisho</option>
                <option value="NIDA">NIDA</option>
                <option value="PASSPORT">Passport</option>
                <option value="DRIVING_LICENSE">Leseni</option>
              </select>
              <input type="text" placeholder="Namba ya Kitambulisho" value={form.idNumber} onChange={(e) => updateField('idNumber', e.target.value)} className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white" required />
            </div>
          )}

          {form.tier === 'corporate' && (
            <div className="space-y-3">
              <input type="text" placeholder="Jina la Kampuni" value={form.companyName} onChange={(e) => updateField('companyName', e.target.value)} className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white" required />
              <input type="text" placeholder="Namba ya Usajili (BRELA)" value={form.companyRegNo} onChange={(e) => updateField('companyRegNo', e.target.value)} className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white" required />
            </div>
          )}

          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.agreedToTerms} onChange={(e) => updateField('agreedToTerms', e.target.checked)} required /><span>Ninakubali Terms (v{versions.termsVersion})</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.agreedToPrivacy} onChange={(e) => updateField('agreedToPrivacy', e.target.checked)} required /><span>Ninakubali Privacy (v{versions.privacyVersion})</span></label>
          </div>

          <button type="submit" disabled={isSubmitting || !canSubmit} className="w-full rounded bg-amber-500 p-3 font-bold text-slate-950 disabled:opacity-50 h-11 transition">
            {isSubmitting ? 'Inasajili...' : 'Sajili Akaunti'}
          </button>
        </form>
      </div>
    </main>
  );
}
