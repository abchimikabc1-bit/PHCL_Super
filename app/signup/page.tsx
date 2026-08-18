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

  // Kizuizi kali cha Nenosiri kuwa herufi 8 hadi 12 pekee na vitambulisho kukamilika
  const canSubmit =
    form.fullName.trim().length >= 3 &&
    form.email.trim().length >= 6 &&
    form.phone.trim().length >= 7 &&
    form.password.length >= 8 &&
    form.password.length <= 12 &&
    form.password === form.confirmPassword &&
    form.agreedToTerms &&
    form.agreedToPrivacy &&
    (form.tier === 'regular' || (form.idType !== '' && form.idNumber.trim().length >= 5)) &&
    (form.tier !== 'corporate' || (form.companyName.trim().length >= 3 && form.companyRegNo.trim().length >= 3));

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || !canSubmit) return;

    setIsSubmitting(true);
    try {
      const result = await registerCustomer({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        country: form.country,
        password: form.password,
        tier: form.tier,
        idType: form.tier !== 'regular' ? form.idType : undefined,
        idNumber: form.tier !== 'regular' ? form.idNumber : undefined,
        companyName: form.tier === 'corporate' ? form.companyName : undefined,
        companyRegNo: form.tier === 'corporate' ? form.companyRegNo : undefined,
        mfaEnabled: form.tier !== 'regular' ? form.mfaEnabled : false,
        agreedToTerms: form.agreedToTerms,
        agreedToPrivacy: form.agreedToPrivacy,
        marketingOptIn: form.marketingOptIn,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success('Akaunti imeundwa! KYC/KYB inafanyiwa uhakiki.');
      router.push('/marketplace');
    } catch {
      toast.error('Kosa limetokea wakati wa usajili.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_26%)]" />

      <section className="relative mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex rounded-full border border-amber-300/35 bg-amber-200/15 px-3 py-1 text-[11px] font-semibold tracking-[0.24em] text-amber-100">
              SECURE ONBOARDING
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">FNo response
