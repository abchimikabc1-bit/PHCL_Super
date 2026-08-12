// components/marketplace-products.tsx
'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import {
  MARKETPLACE_PRODUCTS,
  getMarketplaceProductImage,
  type MarketplaceProduct,
} from '@/lib/marketplace-products';
import { formatCurrencyAmount, PI_GCV_USD, USD_TO_TZS } from '@/components/currency';

type DisplayCurrency = 'usd' | 'tzs' | 'ntzs' | 'pi';
type SortMode = 'featured' | 'price-low' | 'price-high' | 'top-rated';

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

function normalizeText(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function MarketplaceCatalog({ currency = 'tzs' }: { currency?: DisplayCurrency }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | string>('all');
  const [sortBy, setSortBy] = useState<SortMode>('featured');
  const [cardZoom, setCardZoom] = useState(100);
  const [converterAmount, setConverterAmount] = useState('1');
  const [converterFrom, setConverterFrom] = useState<DisplayCurrency>('usd');
  const [usdToTzs, setUsdToTzs] = useState(USD_TO_TZS);
  const [piToUsd, setPiToUsd] = useState(PI_GCV_USD);
  const [ratesStatus, setRatesStatus] = useState<'live' | 'fallback'>('fallback');

  useEffect(() => {
    const loadRates = async () => {
      try {
        const res = await fetch('/api/exchange/rates', { cache: 'no-store' });
        if (!res.ok) {
          setRatesStatus('fallback');
          return;
        }
        const data = await res.json();

        const nextUsdToTzs =
          Number(data?.usdToTzs ?? data?.USD_TO_TZS ?? data?.rates?.USD_TO_TZS) || USD_TO_TZS;
        const nextPiToUsd =
          Number(data?.piToUsd ?? data?.PI_TO_USD ?? data?.rates?.PI_TO_USD) || PI_GCV_USD;

        setUsdToTzs(nextUsdToTzs);
        setPiToUsd(nextPiToUsd);
        setRatesStatus('live');
      } catch (error) {
        console.error('Failed to load exchange rates for marketplace', error);
        setRatesStatus('fallback');
      }
    };

    loadRates();
  }, []);

  const catalogProducts = useMemo(() => {
    const seenKeys = new Set<string>();
    const imageUsageCount = new Map<string, number>();

    return MARKETPLACE_PRODUCTS.reduce<Array<MarketplaceProduct & { resolvedImage: string }>>((acc, product) => {
      const uniqueKey = `${normalizeText(product.name)}|${normalizeText(product.category)}|${normalizeText(product.seller)}`;
      if (seenKeys.has(uniqueKey)) return acc;
      seenKeys.add(uniqueKey);

      const imageKey = product.image?.trim() ?? '';
      const used = imageKey ? imageUsageCount.get(imageKey) ?? 0 : 0;
      if (imageKey) imageUsageCount.set(imageKey, used + 1);

      const resolvedImage =
        imageKey && used === 0
          ? imageKey
          : getMarketplaceProductImage(product);

      acc.push({ ...product, resolvedImage });
      return acc;
    }, []);
  }, []);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(catalogProducts.map((p) => p.category)))],
    [catalogProducts]
  );

  const filtered = useMemo<Array<MarketplaceProduct & { resolvedImage: string }>>(() => {
    const q = query.trim().toLowerCase();
    const results = catalogProducts.filter((p) => {
      const byQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.seller.toLowerCase().includes(q);

      const byCategory = category === 'all' || p.category === category;
      return byQuery && byCategory;
    });

    if (sortBy === 'price-low') return [...results].sort((a, b) => a.priceUSD - b.priceUSD);
    if (sortBy === 'price-high') return [...results].sort((a, b) => b.priceUSD - a.priceUSD);
    if (sortBy === 'top-rated') return [...results].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    return results;
  }, [query, category, catalogProducts, sortBy]);

  const convertFromUsd = (usd: number, to: DisplayCurrency): number => {
    if (to === 'usd') return usd;
    if (to === 'tzs' || to === 'ntzs') return usd * usdToTzs;
    if (to === 'pi') return usd / piToUsd;
    return usd;
  };

  const convertBetween = (amount: number, from: DisplayCurrency, to: DisplayCurrency): number => {
    if (from === to) return amount;

    let usdAmount = amount;
    if (from === 'tzs' || from === 'ntzs') usdAmount = amount / usdToTzs;
    if (from === 'pi') usdAmount = amount * piToUsd;

    return convertFromUsd(usdAmount, to);
  };

  const formatLivePrice = (p: MarketplaceProduct) => {
    const amount = convertFromUsd(p.priceUSD, currency);
    return formatCurrencyAmount(currency.toUpperCase(), amount);
  };

  const parsedConverterAmount = Number(converterAmount) || 0;
  const converterResults = {
    usd: convertBetween(parsedConverterAmount, converterFrom, 'usd'),
    tzs: convertBetween(parsedConverterAmount, converterFrom, 'tzs'),
    ntzs: convertBetween(parsedConverterAmount, converterFrom, 'ntzs'),
    pi: convertBetween(parsedConverterAmount, converterFrom, 'pi'),
  };
  const gridZoomClass =
    cardZoom >= 110
      ? 'sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
      : cardZoom <= 90
        ? 'sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
        : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <div className="space-y-6">
      <div className="glass-dark rounded-3xl p-4 sm:p-6">
        <div className="grid gap-3 md:grid-cols-3">
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
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortMode)}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
          >
            <option value="featured">Featured</option>
            <option value="top-rated">Top rated</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <span className="text-xs text-amber-100/75">Zoom</span>
          <button
            type="button"
            onClick={() => setCardZoom((prev) => Math.max(85, prev - 5))}
            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-sm font-bold text-white hover:bg-white/10"
          >
            -
          </button>
          <span className="min-w-11 text-center text-xs font-semibold text-amber-100">{cardZoom}%</span>
          <button
            type="button"
            onClick={() => setCardZoom((prev) => Math.min(120, prev + 5))}
            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-sm font-bold text-white hover:bg-white/10"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-100/80">
        <span>
          Live rates: 1 USD = {usdToTzs.toLocaleString()} TZS | 1 PI = ${piToUsd.toLocaleString('en-US')}
        </span>
        <span className={`rounded-full px-3 py-1 ${ratesStatus === 'live' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/15 text-amber-200'}`}>
          {ratesStatus === 'live' ? 'Live price mode' : 'Fallback price mode'}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200">
          Showing {filtered.length} of {catalogProducts.length} products
        </span>
      </div>

      <div className="glass-dark rounded-3xl border border-white/10 p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-amber-200">Converter</h3>
          <span className="text-xs text-amber-100/75">GCV PI: 1 = USD 314,159</span>
        </div>
        <div className="grid gap-3 md:grid-cols-[1.3fr_1fr_1fr_1fr_1fr_1fr]">
          <input
            type="number"
            min="0"
            step="any"
            value={converterAmount}
            onChange={(e) => setConverterAmount(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-slate-400"
            placeholder="Amount"
          />
          <select
            value={converterFrom}
            onChange={(e) => setConverterFrom(e.target.value as DisplayCurrency)}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
          >
            <option value="usd">USD</option>
            <option value="tzs">TZS</option>
            <option value="ntzs">nTZS</option>
            <option value="pi">PI</option>
          </select>
          <div className="rounded-xl border border-blue-300/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-100">{formatCurrencyAmount('usd', converterResults.usd)}</div>
          <div className="rounded-xl border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">{formatCurrencyAmount('tzs', converterResults.tzs)}</div>
          <div className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">{formatCurrencyAmount('ntzs', converterResults.ntzs)}</div>
          <div className="rounded-xl border border-violet-300/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-100">{formatCurrencyAmount('pi', converterResults.pi)}</div>
        </div>
      </div>

      <div className={`grid gap-4 ${gridZoomClass}`}>
        {filtered.map((p) => (
          <article key={p.id} className="glow-card overflow-hidden border border-white/10 bg-slate-950/50 p-0 transition hover:-translate-y-1 hover:border-amber-300/35">
            <div className="relative aspect-video bg-slate-900">
              <img
                src={p.resolvedImage}
                alt={p.name}
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                loading="lazy"
                onError={(event) => {
                  const img = event.currentTarget;
                  if (img.dataset.fallbackApplied === '1') return;
                  img.dataset.fallbackApplied = '1';
                  img.src = getMarketplaceProductImage(p);
                }}
              />
              <div className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                Verified
              </div>
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
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg border border-blue-300/20 bg-blue-500/10 px-2 py-1 text-blue-100">
                  USD: {formatCurrencyAmount('usd', p.priceUSD)}
                </div>
                <div className="rounded-lg border border-amber-300/20 bg-amber-500/10 px-2 py-1 text-amber-100">
                  TZS: {formatCurrencyAmount('tzs', convertFromUsd(p.priceUSD, 'tzs'))}
                </div>
                <div className="rounded-lg border border-cyan-300/20 bg-cyan-500/10 px-2 py-1 text-cyan-100">
                  nTZS: {formatCurrencyAmount('ntzs', convertFromUsd(p.priceUSD, 'ntzs'))}
                </div>
                <div className="rounded-lg border border-violet-300/20 bg-violet-500/10 px-2 py-1 text-violet-100">
                  PI: {formatCurrencyAmount('pi', convertFromUsd(p.priceUSD, 'pi'))}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${p.inStock ? 'bg-emerald-500/15 text-emerald-200' : 'bg-red-500/15 text-red-200'}`}>
                  {p.inStock ? 'In stock' : 'Out of stock'}
                </span>
                <Link
                  href={`/product/${p.id}`}
                  className="rounded-lg border border-amber-300/30 bg-amber-300/12 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/25"
                >
                  View details
                </Link>
              </div>
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
