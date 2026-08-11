'use client';

import Link from 'next/link';
import { MarketplaceCatalog } from '@/src/components/marketplace-product';

export default function MarketplacePage() {
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_22%),radial-gradient(circle_at_bottom_center,rgba(245,158,11,0.12),transparent_25%)]" />

      <section className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full border border-amber-300/30 bg-amber-200/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100">
              Global Commerce
            </div>
            <h1 className="text-3xl font-black sm:text-4xl">PHCL Marketplace</h1>
            <p className="max-w-2xl text-sm text-amber-50/85 sm:text-base">
              Browse premium products with glass-dark styling, category glow cards, and fast checkout flow.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_16px_36px_rgba(251,191,36,0.24)] transition hover:-translate-y-0.5 hover:from-amber-200 hover:to-yellow-300"
            >
              Back Home
            </Link>
            <Link
              href="/cart"
              className="inline-flex min-h-11 items-center rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100"
            >
              Cart
            </Link>
            <Link
              href="/checkout"
              className="inline-flex min-h-11 items-center rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100"
            >
              Checkout
            </Link>
          </div>
        </div>

        <div className="glass-dark rounded-3xl p-4 sm:p-6">
          <MarketplaceCatalog currency="tzs" />
        </div>
      </section>
    </main>
  );
}