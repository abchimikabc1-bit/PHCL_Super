import Link from 'next/link';
import { getPolicyVersions } from '@/lib/policy-compliance';

export default function SettingsPage() {
  const policyVersions = getPolicyVersions();

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-900/60 via-emerald-700/50 to-lime-500/40 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.16),transparent_20%),radial-gradient(circle_at_bottom_center,rgba(134,239,172,0.18),transparent_26%)]" />
      <section className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-50">
              Preferences Hub
            </div>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Settings</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">
              Manage language, notifications, security preferences, and payment defaults from one clear control area.
            </p>
          </div>
          <Link href="/" className="rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_14px_34px_rgba(251,191,36,0.24)] transition hover:-translate-y-0.5 hover:from-amber-200 hover:to-yellow-300">Back Home</Link>
        </div>

        <div className="rounded-3xl border border-white/20 bg-white/10 p-6 global-glass">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/20 bg-white/12 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-50/90">Language</p>
              <p className="mt-2 text-sm text-white/95">Choose the reading experience that fits your daily use across PHCL Super.</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/12 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-50/90">Notifications</p>
              <p className="mt-2 text-sm text-white/95">Keep alerts visible for orders, wallet events, and marketplace activity.</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/12 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-50/90">Security</p>
              <p className="mt-2 text-sm text-white/95">Review protection options and account controls in a cleaner readable surface.</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/12 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-50/90">Payments</p>
              <p className="mt-2 text-sm text-white/95">Set your preferred payment defaults for USD, TZS, and PI checkout flow.</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/20 bg-white/12 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-50/90">Policies & Compliance</p>
            <p className="mt-2 text-sm text-white/95">Review legal pages before checkout and account operations.</p>
            <p className="mt-2 text-xs text-white/80">
              Active versions: Terms v{policyVersions.termsVersion} • Privacy v{policyVersions.privacyVersion}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/terms-of-service"
                style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }}
                className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-900"
              >
                Terms of Service
              </Link>
              <Link
                href="/privacy-policy"
                style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-amber-100"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
