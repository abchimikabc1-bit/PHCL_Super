'use client';

import Link from 'next/link';
import { MarketplaceCatalog } from '@/src/components/marketplace-product';

export default function MarketplacePage() {
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_22%),radial-gradient(circle_at_bottom_center,rgba(245,158,11,0.12),transparent_25%)]" />

      <section className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-black sm:text-4xl">PHCL Marketplace</h1>
          <div className="flex gap-2">
            <Link href="/" className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-900">Back Home</Link>
            <Link href="/cart" className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100">Cart</Link>
          </div>
        </div>

        <div className="glass-dark rounded-3xl p-4 sm:p-6">
          <MarketplaceCatalog currency="tzs" />
        </div>
      </section>
    </main>
  );
}