"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react'; // Tumeongeza icons za jicho hapa
import { registerCustomer } from '@/lib/customer-registration';
import { getPolicyVersions } from '@/lib/policy-compliance';

export default function SignupPage() {
  const router = useRouter();
  const versions = useMemo(() => getPolicyVersions(), []);
  
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', country: '', password: '', confirmPassword: '',
    tier: 'regular' as 'regular' | 'small_business' | 'corporate',
    idType: '', idNumber: '', companyName: '', companyRegNo: '', mfaEnabled: false,
    livenessVerified: false, agreedToTerms: false, agreedToPrivacy: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // kudhibiti jicho la kwanza
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // kudhibiti jicho la pili

  const nameParts = form.fullName.trim().split(/\s+/);
  const hasThreeNames = nameParts.length >= 3 && nameParts.every(p => p.length >= 2);

  const canSubmit = 
    hasThreeNames && form.email && form.password.length >= 8 && form.password.length <= 12 && form.password === form.confirmPassword && form.agreedToTerms && form.agreedToPrivacy &&
    (form.tier === 'regular' || (form.idType && form.idNumber && form.livenessVerified)) &&
    (form.tier !== 'corporate' || (form.companyName && form.companyRegNo && form.mfaEnabled));

  const updateField = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasThreeNames) {
      toast.error('Tafadhali ingiza majina yako matatu kamili (Jina, Kati, Ukoo)!');
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
    if (form.tier !== 'regular' && !form.livenessVerified) {
      toast.error('Ni lazima ukamilishe uhakiki wa Liveness (Kupepesa Macho)!');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerCustomer({
        fullName: form.fullName, email: form.email, phone: form.phone, country: form.country,
        password: form.password, tier: form.tier, idType: form.idType, idNumber: form.idNumber,
        companyName: form.companyName, companyRegNo: form.companyRegNo, mfaEnabled: form.mfaEnabled,
        livenessVerified: form.livenessVerified, agreedToTerms: form.agreedToTerms, agreedToPrivacy: form.agreedToPrivacy
      });
      if (!result.ok) { toast.error(result.message); return; }
      toast.success('Akaunti yako imeundwa na kiungo cha uthibitisho kimetumwa kwenye barua pepe yako! 🔐');
      router.push('/profile');
    } catch {
      toast.error('Usajili umegonga mwamba.');
    } finally { setIsSubmitting(false); }
  };

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white flex items-center justify-center">
      <div className="w-full max-w-xl space-y-6 my-auto">
        <h1 className="text-3xl font-black text-amber-200">PHCL Onboarding</h1>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-white/10 bg-slate-900 p-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-amber-300">Chagua Aina ya Akaunti</label>
            <select value={form.tier} onChange={(e) => updateField('tier', e.target.value)} className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white focus:outline-none">
              <option value="regular">Kawaida (Tier 1 - Up to 2FA, No KYC)</option>
              <option value="small_business">Mfanyabiashara wa Kawaida (Tier 2 - KYC + Liveness)</option>
              <option value="corporate">Kampuni / Biashara Kubwa (Tier 3 - KYB + 2FA + Vingine)</option>
            </select>
          </div>

          <input type="text" placeholder="Majina matatu kamili" value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white" required />
          <input type="email" placeholder="Barua Pepe" value={form.email} onChange={(e) => updateField('email', e.target.value)} className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white" required />
          <input type="tel" placeholder="Namba ya Simu" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white" required />
          <input type="text" placeholder="Nchi" value={form.country} onChange={(e) => updateField('country', e.target.value)} className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white" required />
          
          {/* NENOSIRI LA KWANZA - LIKIWA NA JICHO */}
          <div className="relative w-full">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Nenosiri gumu (Herufi 8-12)" 
              value={form.password} 
              onChange={(e) => updateField('password', e.target.value)} 
              className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white pr-10" 
              required 
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* NENOSIRI LA KUREJESHA/KURUDIA - LIKIWA NA JICHO */}
          <div className="relative w-full">
            <input 
              type={showConfirmPassword ? "text" : "password"} 
              placeholder="Thibitisha Nenosiri (Rudia)" 
              value={form.confirmPassword} 
              onChange={(e) => updateField('confirmPassword', e.target.value)} 
              className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white pr-10" 
              required 
            />
            <button 
              type="button" 
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {form.tier === 'regular' && (
            <label className="flex items-center gap-2 text-xs pt-2 border-t border-white/5">
              <input type="checkbox" checked={form.mfaEnabled} onChange={(e) => updateField('mfaEnabled', e.target.checked)} />
              <span>Washa ulinzi wa ziada wa 2FA</span>
            </label>
          )}

          {form.tier !== 'regular' && (
            <div className="border-t border-white/10 pt-4 space-y-3">
              <p className="text-xs font-bold text-amber-400">Uhakiki wa Kitambulisho (KYC)</p>
              <select value={form.idType} onChange={(e) => updateField('idType', e.target.value)} className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white" required>
                <option value="">Aina ya Kitambulisho</option>
                <option value="NIDA">NIDA</option>
                <option value="PASSPORT">Passport</option>
                <option value="DRIVING_LICENSE">Leseni</option>
              </select>
              <input type="text" placeholder="Namba ya Kitambulisho" value={form.idNumber} onChange={(e) => updateField('idNumber', e.target.value)} className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white" required />
              
              <div className="rounded-lg bg-slate-950 p-3 border border-white/5 flex items-center justify-between">
                <span className="text-xs text-slate-300">Liveness (Utambuzi wa Sura na Macho)</span>
                <button type="button" onClick={() => updateField('livenessVerified', true)} className={`rounded px-3 py-1 text-[11px] font-bold ${form.livenessVerified ? 'bg-emerald-500 text-slate-950' : 'bg-violet-600 text-white animate-pulse'}`}>
                  {form.livenessVerified ? '✓ Verified' : 'Anza Uhakiki'}
                </button>
              </div>
            </div>
          )}

          {form.tier === 'corporate' && (
            <div className="border-t border-white/10 pt-4 space-y-3">
              <p className="text-xs font-bold text-amber-400">Uhakiki wa Kampuni (KYB)</p>
              <input type="text" placeholder="Jina la Kampuni" value={form.companyName} onChange={(e) => updateField('companyName', e.target.value)} className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white" required />
              <input type="text" placeholder="Namba ya Usajili (BRELA)" value={form.companyRegNo} onChange={(e) => updateField('companyRegNo', e.target.value)} className="w-full rounded bg-slate-800 p-2 h-11 text-sm text-white" required />
              <label className="flex items-center gap-2 text-xs text-amber-300 font-bold"><input type="checkbox" checked={form.mfaEnabled} onChange={(e) => updateField('mfaEnabled', e.target.checked)} required /><span>Washa 2FA ya Lazima kwa Kampuni</span></label>
            </div>
          )}

          <div className="space-y-2 text-xs pt-2 border-t border-white/5">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.agreedToTerms} onChange={(e) => updateField('agreedToTerms', e.target.checked)} required /><span>Ninakubali Terms (v{versions.termsVersion})</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.agreedToPrivacy} onChange={(e) => updateField('agreedToPrivacy', e.target.checked)} required /><span>Ninakubali Privacy (v{versions.privacyVersion})</span></label>
          </div>

          <button type="submit" disabled={isSubmitting || !canSubmit} className="w-full rounded bg-amber-500 p-3 font-bold text-slate-950 disabled:opacity-50 h-11 transition active:scale-[0.98]">
            {isSubmitting ? 'Inasajili...' : 'Sajili Akaunti'}
          </button>
        </form>
      </div>
    </main>
  );
}
