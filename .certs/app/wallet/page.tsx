"use client";

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { PI_GCV_USD } from '@/components/marketplace/currency-utils';
import { useLanguage } from '@/hooks/use-language';

const WalletVoiceAssist = dynamic(() => import('./wallet-voice-assist'), {
  ssr: false,
});

const WALLET_COPY = {
  en: {
    badge: 'Digital Balance',
    title: 'Wallet',
    description: 'Review your live balance and keep Pi valuation visible as part of the PHCL Super payment flow.',
    backHome: 'Back Home',
    availableBalance: 'Available Balance',
    gcvRateLabel: '1 PI =',
    gcvRateSuffix: 'GCV',
    goToCheckout: 'Go to Checkout',
    openMarketplace: 'Open Marketplace',
    openExchange: 'Open Exchange',
    liveValueTitle: 'Live value',
    liveValueBody: 'Pi visibility stays aligned with the accepted GCV rate.',
    fastAccessTitle: 'Fast access',
    fastAccessBody: 'Move quickly between wallet, checkout, and marketplace actions.',
    trustedViewTitle: 'Trusted view',
    trustedViewBody: 'A cleaner balance surface makes payment review easier at a glance.',
  },
  sw: {
    badge: 'Salio la Kidijitali',
    title: 'Wallet',
    description: 'Kagua salio lako la moja kwa moja na uendelee kuona thamani ya Pi ndani ya mtiririko wa malipo wa PHCL Super.',
    backHome: 'Rudi Nyumbani',
    availableBalance: 'Salio Linalopatikana',
    gcvRateLabel: '1 PI =',
    gcvRateSuffix: 'GCV',
    goToCheckout: 'Nenda Checkout',
    openMarketplace: 'Fungua Marketplace',
    openExchange: 'Fungua Exchange',
    liveValueTitle: 'Thamani ya moja kwa moja',
    liveValueBody: 'Uonekano wa Pi unaendelea kulingana na kiwango kinachokubalika cha GCV.',
    fastAccessTitle: 'Ufikiaji wa haraka',
    fastAccessBody: 'Tembea haraka kati ya wallet, checkout, na vitendo vya marketplace.',
    trustedViewTitle: 'Mwonekano wa kuaminika',
    trustedViewBody: 'Muonekano safi wa salio hurahisisha ukaguzi wa malipo kwa haraka.',
  },
} as const;

export default function WalletPage() {
  const { language } = useLanguage();
  const isSwahili = language === 'sw';
  const copy = isSwahili ? WALLET_COPY.sw : WALLET_COPY.en;

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_22%),radial-gradient(circle_at_bottom_center,rgba(245,158,11,0.12),transparent_25%)]" />
      <section className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-amber-300/30 bg-amber-200/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100">
              {copy.badge}
            </div>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-amber-50/85 sm:text-base">
              {copy.description}
            </p>
          </div>
          <Link href="/" className="rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_16px_36px_rgba(251,191,36,0.24)] transition hover:-translate-y-0.5 hover:from-amber-200 hover:to-yellow-300">{copy.backHome}</Link>
        </div>

        <div className="rounded-2xl border border-amber-200/15 bg-slate-900/45 p-6 global-glass">
          <p className="text-sm text-amber-50/90 ink-soft">{copy.availableBalance}</p>
          <p className="mt-2 text-4xl font-black text-amber-100 ink-glow">Π 128.45000000</p>
          <p className="mt-3 text-sm text-amber-100 ink-soft">{copy.gcvRateLabel} ${PI_GCV_USD.toLocaleString('en-US')} {copy.gcvRateSuffix}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/checkout"
              className="rounded-lg border border-emerald-300/50 bg-emerald-400/20 px-3 py-2 text-xs font-bold text-emerald-50 transition hover:bg-emerald-400/30"
            >
              {copy.goToCheckout}
            </Link>
            <Link
              href="/marketplace"
              className="rounded-lg border border-cyan-300/50 bg-cyan-400/20 px-3 py-2 text-xs font-bold text-cyan-50 transition hover:bg-cyan-400/30"
            >
              {copy.openMarketplace}
            </Link>
            <Link
              href="/exchange"
              className="rounded-lg border border-violet-300/50 bg-violet-400/20 px-3 py-2 text-xs font-bold text-violet-50 transition hover:bg-violet-400/30"
            >
              {copy.openExchange}
            </Link>
          </div>

          <WalletVoiceAssist
            balancePi="128.45000000"
            gcvUsd={PI_GCV_USD.toLocaleString('en-US')}
          />

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-amber-300/20 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-amber-100/80">{copy.liveValueTitle}</p>
              <p className="mt-2 text-sm text-white/90">{copy.liveValueBody}</p>
            </div>
            <div className="rounded-xl border border-amber-300/20 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-amber-100/80">{copy.fastAccessTitle}</p>
              <p className="mt-2 text-sm text-white/90">{copy.fastAccessBody}</p>
            </div>
            <div className="rounded-xl border border-amber-300/20 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-amber-100/80">{copy.trustedViewTitle}</p>
              <p className="mt-2 text-sm text-white/90">{copy.trustedViewBody}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
