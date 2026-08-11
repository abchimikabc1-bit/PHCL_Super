"use client";

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getPolicyVersions } from '@/lib/policy-compliance';
import { validateKycRegistration } from '@/lib/security/kyc-validation';

export default function SignupPage() {
  const router = useRouter();
  const versions = useMemo(() => getPolicyVersions(), []);

  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    fingerprintToken: '',
    faceScanToken: '',
    agreedToTerms: false,
    agreedToPrivacy: false,
    marketingOptIn: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    form.firstName.trim().length >= 3 &&
    form.middleName.trim().length >= 3 &&
    form.lastName.trim().length >= 3 &&
    form.email.trim().length >= 6 &&
    form.password.length >= 8 &&
    form.password === form.confirmPassword &&
    form.fingerprintToken.trim().length >= 16 &&
    form.faceScanToken.trim().length >= 16 &&
    form.agreedToTerms &&
    form.agreedToPrivacy;

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const result = validateKycRegistration(form);
    setErrors(result.errors as Record<string, string>);

    if (!result.valid) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.sanitized),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrors((data?.errors as Record<string, string>) || { form: data?.message || 'Registration failed.' });
        return;
      }

      toast.success('Account created successfully. You can now continue with shopping.');
      router.push('/marketplace');
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-400 focus:border-amber-400/70';

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className={inputClass}
            value={form.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            placeholder="First name"
          />
          {errors.firstName && <p className="text-sm text-red-400">{errors.firstName}</p>}

          <input
            className={inputClass}
            value={form.middleName}
            onChange={(e) => updateField('middleName', e.target.value)}
            placeholder="Middle name"
          />
          {errors.middleName && <p className="text-sm text-red-400">{errors.middleName}</p>}

          <input
            className={inputClass}
            value={form.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            placeholder="Last name"
          />
          {errors.lastName && <p className="text-sm text-red-400">{errors.lastName}</p>}

          <input
            className={inputClass}
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="Email"
          />
          {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}

          <input
            className={inputClass}
            type="password"
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            placeholder="Password (8-12 chars)"
          />
          {errors.password && <p className="text-sm text-red-400">{errors.password}</p>}

          <input
            className={inputClass}
            type="password"
            value={form.confirmPassword}
            onChange={(e) => updateField('confirmPassword', e.target.value)}
            placeholder="Confirm password"
          />
          {errors.confirmPassword && <p className="text-sm text-red-400">{errors.confirmPassword}</p>}

          <input
            className={inputClass}
            value={form.fingerprintToken}
            onChange={(e) => updateField('fingerprintToken', e.target.value)}
            placeholder="Fingerprint verification token"
          />
          {errors.fingerprintToken && <p className="text-sm text-red-400">{errors.fingerprintToken}</p>}

          <input
            className={inputClass}
            value={form.faceScanToken}
            onChange={(e) => updateField('faceScanToken', e.target.value)}
            placeholder="Face verification token"
          />
          {errors.faceScanToken && <p className="text-sm text-red-400">{errors.faceScanToken}</p>}

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
                I voluntarily agree to the{' '}
                <Link href="/terms-of-service" className="font-semibold text-amber-200 underline">
                  Terms of Service
                </Link>{' '}
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
                I voluntarily agree to the{' '}
                <Link href="/privacy-policy" className="font-semibold text-amber-200 underline">
                  Privacy Policy
                </Link>{' '}
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

          {errors.form && <p className="text-sm text-red-400">{errors.form}</p>}

          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            style={{ minHeight: '44px' }}
            className="w-full rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-xs text-amber-50/80">
          Consent records are stored with timestamp and policy versions for compliance audit.
        </p>
      </section>
    </main>
  );
}