// components/marketplace-products.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  MARKETPLACE_PRODUCTS,
  getMarketplaceProductImage,
  type MarketplaceProduct,
} from '@/lib/marketplace-products';
import { formatCurrencyAmount, PI_GCV_USD, USD_TO_TZS } from '@/components/currency';

type DisplayCurrency = 'usd' | 'tzs' | 'ntzs' | 'pi';

const CATEGORY_META: Record<string, { label: string; className: string }> = {
  Vehicles: { label: 'Vehicles', className: 'text-amber-300' },
  Motorcycles: { label: 'Motorcycles', className: 'text-pink-300' },
  Electronics: { label: 'Electronics', className: 'text-cyan-300' },
  Appliances: { label: 'Appliances', className: 'text-blue-300' },
  Clothing: { label: 'Clothing', className: 'text-orange-300' },
  Industrial: { label: 'Industrial', className: 'text-yellow-300' },
  Tools: { label: 'Tools', className: 'text-lime-300' },
  Food: { label: 'Food', className: 'text-rose-300' },
};

export function MarketplaceCatalog({ currency = 'tzs' }: { currency?: DisplayCurrency }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | string>('all');
  const [usdToTzs, setUsdToTzs] = useState(USD_TO_TZS);
  const [piToUsd, setPiToUsd] = useState(PI_GCV_USD);

  useEffect(() => {
    const loadRates = async () => {
      try {
        const res = await fetch('/api/exchange/rates', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();

        const nextUsdToTzs =
          Number(data?.usdToTzs ?? data?.USD_TO_TZS ?? data?.rates?.USD_TO_TZS) || USD_TO_TZS;
        const nextPiToUsd =
          Number(data?.piToUsd ?? data?.PI_TO_USD ?? data?.rates?.PI_TO_USD) || PI_GCV_USD;

        setUsdToTzs(nextUsdToTzs);
        setPiToUsd(nextPiToUsd);
      } catch {
        // fallback tayari ni constants
      }
    };

    loadRates();
  }, []);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(MARKETPLACE_PRODUCTS.map((p) => p.category)))],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MARKETPLACE_PRODUCTS.filter((p) => {
      const byQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.seller.toLowerCase().includes(q);

      const byCategory = category === 'all' || p.category === category;
      return byQuery && byCategory;
    });
  }, [query, category]);

  const convertFromUsd = (usd: number, to: DisplayCurrency): number => {
    if (to === 'usd') return usd;
    if (to === 'tzs' || to === 'ntzs') return usd * usdToTzs;
    if (to === 'pi') return usd / piToUsd;
    return usd;
  };

  const formatLivePrice = (p: MarketplaceProduct) => {
    const amount = convertFromUsd(p.priceUSD, currency);
    return formatCurrencyAmount(currency.toUpperCase(), amount);
  };

  return (
    <div className="space-y-6">
      <div className="glass-dark rounded-3xl p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-slate-400"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'All Categories' : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="text-xs text-amber-100/80">
        Live rates: 1 USD = {usdToTzs.toLocaleString()} TZS | 1 PI = ${piToUsd.toLocaleString('en-US')}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((p) => (
          <article key={p.id} className="glow-card overflow-hidden p-0 transition hover:-translate-y-1">
            <div className="relative aspect-video bg-slate-900">
              <img
                src={p.image || getMarketplaceProductImage(p)}
                alt={p.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="line-clamp-2 text-base font-bold text-white">{p.name}</h3>
                  <p className={`text-xs font-semibold ${CATEGORY_META[p.category]?.className ?? 'text-amber-200'}`}>
                    {CATEGORY_META[p.category]?.label ?? p.category}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-yellow-200">{formatLivePrice(p)}</p>
                  <p className="text-[11px] text-slate-400">USD ${p.priceUSD.toLocaleString('en-US')}</p>
                </div>
              </div>

              <p className="mt-2 line-clamp-2 text-xs text-slate-300">{p.description}</p>
              <p className="mt-2 text-xs text-amber-100/80">Seller: {p.seller}</p>
              <p className="text-xs text-slate-400">⭐ {p.rating.toFixed(1)} ({p.reviews})</p>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
          No products found.
        </div>
      )}
    </div>
  );
}

export default MarketplaceCatalog;
