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
    fullName: '',
    email: '',
    phone: '',
    country: '',
    password: '',
    confirmPassword: '',
    agreedToTerms: false,
    agreedToPrivacy: false,
    marketingOptIn: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    form.fullName.trim().length >= 3 &&
    form.email.trim().length >= 6 &&
    form.phone.trim().length >= 7 &&
    form.country.trim().length >= 2 &&
    form.password.length >= 8 &&
    form.password === form.confirmPassword &&
    form.agreedToTerms &&
    form.agreedToPrivacy;

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Password confirmation does not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = registerCustomer({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        country: form.country,
        password: form.password,
        agreedToTerms: form.agreedToTerms,
        agreedToPrivacy: form.agreedToPrivacy,
        marketingOptIn: form.marketingOptIn,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success('Account created successfully. You can now continue with shopping.');
      router.push('/marketplace');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_26%),radial-gradient(circle_at_bottom_center,rgba(245,158,11,0.12),transparent_25%)]" />

      <section className="relative mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex rounded-full border border-amber-300/35 bg-amber-200/15 px-3 py-1 text-[11px] font-semibold tracking-[0.24em] text-amber-100">
              CUSTOMER ONBOARDING
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Create Account</h1>
            <p className="mt-2 text-sm text-amber-50/85">
              Register with explicit consent to Terms of Service and Privacy Policy.
            </p>
          </div>
          <Link
            href="/"
            style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }}
            className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100"
          >
            Back Home
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-amber-200/20 bg-slate-900/45 p-5 global-glass space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              placeholder="Full name"
              style={{ minHeight: '44px' }}
              className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-amber-300"
              required
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="Email"
              style={{ minHeight: '44px' }}
              className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-amber-300"
              required
            />
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="Phone"
              style={{ minHeight: '44px' }}
              className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-amber-300"
              required
            />
            <input
              type="text"
              value={form.country}
              onChange={(e) => updateField('country', e.target.value)}
              placeholder="Country"
              style={{ minHeight: '44px' }}
              className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-amber-300"
              required
            />
            <input
              type="password"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              placeholder="Password (min 8 chars)"
              style={{ minHeight: '44px' }}
              className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-amber-300"
              required
            />
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              placeholder="Confirm password"
              style={{ minHeight: '44px' }}
              className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-amber-300"
              required
            />
          </div>

          <div className="rounded-xl border border-amber-200/20 bg-amber-500/10 p-4 space-y-3 text-sm">
            <label className="flex items-start gap-2 text-amber-50">
              <input
                type="checkbox"
                checked={form.agreedToTerms}
                onChange={(e) => updateField('agreedToTerms', e.target.checked)}
                className="mt-1"
                required
              />
              <span>
                I voluntarily agree to the
                {' '}
                <Link href="/terms-of-service" className="font-semibold text-amber-200 underline">
                  Terms of Service
                </Link>
                {' '}
                (version {versions.termsVersion}).
              </span>
            </label>

            <label className="flex items-start gap-2 text-amber-50">
              <input
                type="checkbox"
                checked={form.agreedToPrivacy}
                onChange={(e) => updateField('agreedToPrivacy', e.target.checked)}
                className="mt-1"
                required
              />
              <span>
                I voluntarily agree to the
                {' '}
                <Link href="/privacy-policy" className="font-semibold text-amber-200 underline">
                  Privacy Policy
                </Link>
                {' '}
                (version {versions.privacyVersion}).
              </span>
            </label>

            <label className="flex items-start gap-2 text-amber-50/90">
              <input
                type="checkbox"
                checked={form.marketingOptIn}
                onChange={(e) => updateField('marketingOptIn', e.target.checked)}
                className="mt-1"
              />
              <span>I agree to receive product updates and service announcements.</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            style={{ minHeight: '44px' }}
            className="w-full rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-xs text-amber-50/80">
            Consent records are stored with timestamp and policy versions for compliance audit.
          </p>
        </form>
      </section>
    </main>
  );
}
