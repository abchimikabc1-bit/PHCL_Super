"use client";

import React, { useState, useEffect } from 'react';
import { CURRENCIES } from '@/lib/currencies';
import { getExchangeRate } from '@/lib/currency-converter';
import { PI_GCV_USD } from '@/components/marketplace/currency-utils';

const LIVE_REFRESH_MIN_MS = 5000;
const LIVE_REFRESH_MAX_MS = 10000;

interface CurrencyExchangerProps {
  initialAmount?: number;
  initialFromCurrency?: string;
  initialToCurrency?: string;
  onExchange?: (result: any) => void;
  showFavorites?: boolean;
}

export function CurrencyExchanger({
  initialAmount = 100,
  initialFromCurrency = 'USD',
  initialToCurrency = 'BTC',
  onExchange,
  showFavorites = true,
}: CurrencyExchangerProps) {
  const [amount, setAmount] = useState<number>(initialAmount);
  const [fromCurrency, setFromCurrency] = useState<string>(initialFromCurrency);
  const [toCurrency, setToCurrency] = useState<string>(initialToCurrency);
  const [result, setResult] = useState<number>(0);
  const [favorites, setFavorites] = useState<string[]>(['BTC', 'ETH', 'USDT', 'SOL', 'XRP', 'ADA', 'DOGE', 'USD', 'TZS', 'PI']);
  const [showAllCurrencies, setShowAllCurrencies] = useState(!showFavorites);
  const [liveCryptoUsd, setLiveCryptoUsd] = useState<Record<string, number>>({});
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [liveMode, setLiveMode] = useState<'live' | 'fallback'>('fallback');
  const [lastSource, setLastSource] = useState<'coingecko' | 'fallback'>('fallback');

  const getUsdValuePerUnit = (currencyCode: string): number => {
    const code = (currencyCode || 'USD').toUpperCase();
    if (code === 'USD') return 1;

    const livePrice = liveCryptoUsd[code];
    if (Number.isFinite(livePrice) && livePrice > 0) {
      return livePrice;
    }

    const fallback = getExchangeRate(code, 'USD');
    if (Number.isFinite(fallback) && fallback > 0) {
      return fallback;
    }

    return 1;
  };

  const getEffectiveExchangeRate = (fromCode: string, toCode: string): number => {
    const from = (fromCode || 'USD').toUpperCase();
    const to = (toCode || 'USD').toUpperCase();
    if (from === to) return 1;

    const fromUsd = getUsdValuePerUnit(from);
    const toUsd = getUsdValuePerUnit(to);
    if (!Number.isFinite(fromUsd) || !Number.isFinite(toUsd) || toUsd <= 0) {
      return 1;
    }

    return fromUsd / toUsd;
  };

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const randomDelay = () =>
      Math.floor(Math.random() * (LIVE_REFRESH_MAX_MS - LIVE_REFRESH_MIN_MS + 1)) + LIVE_REFRESH_MIN_MS;

    const run = async () => {
      try {
        const response = await fetch('/api/exchange/rates', { cache: 'no-store' });

        if (!response.ok) {
          throw new Error(`Live rate request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as {
          success?: boolean;
          source?: 'coingecko' | 'fallback';
          rates?: Record<string, number>;
          fetchedAt?: number;
        };
        const next = payload?.rates ?? {};

        if (Object.keys(next).length > 0) {
          setLiveCryptoUsd(next);
          setLastUpdated(payload?.fetchedAt ?? Date.now());
          setLiveMode(payload?.source === 'coingecko' ? 'live' : 'fallback');
          setLastSource(payload?.source === 'coingecko' ? 'coingecko' : 'fallback');
        } else {
          setLastUpdated(payload?.fetchedAt ?? Date.now());
          setLiveMode('fallback');
          setLastSource('fallback');
        }
      } catch {
        setLiveMode((prev) => (prev === 'live' ? 'live' : 'fallback'));
        setLastSource('fallback');
      } finally {
        setLastUpdated(Date.now());
        if (!stopped) {
          timer = setTimeout(run, randomDelay());
        }
      }
    };

    run();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const rate = getEffectiveExchangeRate(fromCurrency, toCurrency);
    const converted = amount * rate;
    setResult(converted);
    
    if (onExchange) {
      onExchange({
        fromCurrency,
        toCurrency,
        amount,
        result: converted,
        rate,
      });
    }
  }, [amount, fromCurrency, toCurrency, onExchange, liveCryptoUsd]);

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const allCurrencies = Object.entries(CURRENCIES).map(([code, info]) => ({
    code,
    ...info,
  }));

  const favoriteCurrencies = allCurrencies.filter((c) => favorites.includes(c.code));
  const displayCurrencies = showAllCurrencies ? allCurrencies : favoriteCurrencies;

  const formatNumber = (num: number, currency: string): string => {
    if (num < 0.01 && (currency === 'BTC' || currency === 'ETH')) {
      return num.toFixed(8);
    }
    if (num < 1) {
      return num.toFixed(6);
    }
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const fromInfo = CURRENCIES[fromCurrency as keyof typeof CURRENCIES];
  const toInfo = CURRENCIES[toCurrency as keyof typeof CURRENCIES];

  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl border border-violet-200/70 bg-gradient-to-br from-white via-violet-50 to-cyan-50 p-6 shadow-[0_18px_40px_rgba(76,29,149,0.18)]">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-extrabold bg-gradient-to-r from-violet-700 via-fuchsia-700 to-cyan-700 bg-clip-text text-transparent">Currency Exchanger</h2>
        <p className="mt-1 text-sm text-slate-700">Convert between crypto & fiat currencies</p>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-violet-300/60 bg-white/85 px-3 py-1 text-[11px] font-semibold text-violet-700 shadow-sm">
          <span>
            {liveMode === 'live'
              ? 'Live crypto refresh: every 5-10s'
              : 'Live refresh every 5-10s (market-feed fallback active)'}
          </span>
          {lastUpdated ? <span>• Updated {new Date(lastUpdated).toLocaleTimeString()}</span> : null}
          <span>• Source: {lastSource === 'coingecko' ? 'CoinGecko' : 'Internal fallback rates'}</span>
        </div>
      </div>

      {/* Exchange Container */}
      <div className="mb-6 rounded-xl border border-violet-200/70 bg-gradient-to-br from-white to-slate-50 p-6 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
        {/* From Currency */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            You send
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-violet-500"
              placeholder="0"
              step="0.01"
            />
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-violet-500"
            >
              {displayCurrencies.map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.code} - {curr.name}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1 text-xs text-slate-500">{fromInfo?.name || ''}</p>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={handleSwapCurrencies}
            className="rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 p-2 text-white shadow-[0_8px_20px_rgba(67,56,202,0.35)] transition hover:from-violet-700 hover:to-cyan-700"
            title="Swap currencies"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* To Currency */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            You receive
          </label>
          <div className="flex gap-2">
            <div className="flex flex-1 items-center rounded-lg border border-slate-300 bg-slate-50 px-4 py-2">
              <span className="font-semibold text-slate-800">
                {formatNumber(result, toCurrency)}
              </span>
            </div>
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-violet-500"
            >
              {displayCurrencies.map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.code} - {curr.name}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1 text-xs text-slate-500">{toInfo?.name || ''}</p>
        </div>

        {/* Exchange Rate */}
        <div className="mb-4 rounded-lg border border-violet-200/70 bg-gradient-to-r from-violet-50 to-cyan-50 p-3">
          <p className="text-sm text-slate-700">
            <span className="font-semibold">1 {fromCurrency}</span>
            {' = '}
            <span className="font-semibold">
              {formatNumber(getEffectiveExchangeRate(fromCurrency, toCurrency), toCurrency)} {toCurrency}
            </span>
          </p>
          <p className="mt-1 text-xs font-bold text-amber-700">1 PI = ${PI_GCV_USD.toLocaleString('en-US')} GCV</p>
        </div>

        {/* Currency Filter Toggle */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setShowAllCurrencies(!showAllCurrencies)}
            className="text-sm font-semibold text-violet-700 hover:text-violet-800"
          >
            {showAllCurrencies ? 'Show Favorites' : 'Show All Currencies'}
          </button>
          <span className="text-xs text-slate-500">
            {displayCurrencies.length} currencies available
          </span>
        </div>
      </div>

      {/* Quick Conversions */}
      <div className="rounded-xl border border-cyan-200/70 bg-gradient-to-br from-white to-cyan-50 p-6 shadow-[0_10px_24px_rgba(8,47,73,0.1)]">
        <h3 className="mb-4 text-sm font-semibold text-slate-800">Quick Conversions</h3>
        <div className="grid grid-cols-2 gap-3">
          {[100, 1000, 10000, 100000].map((val) => {
            const rate = getEffectiveExchangeRate(fromCurrency, toCurrency);
            const converted = val * rate;
            return (
              <button
                key={val}
                onClick={() => setAmount(val)}
                className="rounded border border-slate-200 bg-white/90 p-2 text-left transition-colors hover:border-violet-300 hover:bg-violet-50"
              >
                <p className="text-xs text-slate-600">{val} {fromCurrency}</p>
                <p className="text-sm font-semibold text-slate-800">
                  {formatNumber(converted, toCurrency)} {toCurrency}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
