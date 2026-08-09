'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/lib/admin-context';
import { convertAmount, formatCurrencyAmount } from '@/components/marketplace/currency-utils';
import { getAdminCurrencyConfig } from '@/lib/admin-currency-rates';

type CurrencyCode = 'usd' | 'tzs' | 'ntzs' | 'pi';

export default function AdminConverterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdmin(); // removed adminUser
  const [loadingGuardElapsed, setLoadingGuardElapsed] = useState(false);
  const [amount, setAmount] = useState<string>('100');

  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>('usd');
  const [conversionResults, setConversionResults] = useState<Record<CurrencyCode, number>>({
    usd: 0,
    tzs: 0,
    ntzs: 0,
    pi: 0,
  });
  const [adminRates, setAdminRates] = useState({
    usdToTzs: 2621.5,
    usdToNTzs: 2621.5,
    piGcvUsd: 314159,
  });

  const refreshSession = () => {
    router.refresh();
  };

  const sessionDebug = {
    hasSession: isAuthenticated,
    sessionAgeMs: null as number | null,
    expiresInMs: null as number | null,
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
      return;
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadingGuardElapsed(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  // Auto-read rates from admin currency config
  useEffect(() => {
    const updateRates = () => {
      try {
        const config = getAdminCurrencyConfig();
        const tzsEntry = config.managed.find((c) => c.code === 'TZS');
        const piEntry = config.managed.find((c) => c.code === 'PI');
        const effectiveUsdToTzs = tzsEntry?.enabled && tzsEntry.rateToUsd ? tzsEntry.rateToUsd : 2621.5;

        setAdminRates({
          usdToTzs: effectiveUsdToTzs,
          usdToNTzs: effectiveUsdToTzs,
          piGcvUsd: piEntry?.enabled && piEntry.rateToUsd ? piEntry.rateToUsd : 314159,
        });
      } catch (error) {
        // Fallback to defaults if config read fails
        setAdminRates({
          usdToTzs: 2621.5,
          usdToNTzs: 2621.5,
          piGcvUsd: 314159,
        });
      }
    };

    updateRates();
    // Listen for rate changes via storage events
    window.addEventListener('storage', updateRates);
    return () => window.removeEventListener('storage', updateRates);
  }, []);

  const loadingActive = isLoading && !loadingGuardElapsed;

  const sessionAgeMinutes =
    sessionDebug.sessionAgeMs !== null ? Math.floor(sessionDebug.sessionAgeMs / 60000) : null;
  const sessionExpiresMinutes =
    sessionDebug.expiresInMs !== null ? Math.floor(sessionDebug.expiresInMs / 60000) : null;

  // Update conversion results whenever amount or currencies change
  useEffect(() => {
    if (!amount || isNaN(Number(amount))) {
      setConversionResults({ usd: 0, tzs: 0, ntzs: 0, pi: 0 });
      return;
    }

    const numAmount = Number(amount);
    setConversionResults({
      usd: convertAmount(numAmount, fromCurrency, 'usd'),
      tzs: convertAmount(numAmount, fromCurrency, 'tzs'),
      ntzs: convertAmount(numAmount, fromCurrency, 'ntzs'),
      pi: convertAmount(numAmount, fromCurrency, 'pi'),
    });
  }, [amount, fromCurrency]);

  if (loadingActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-200">Loading converter...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const getCurrencyLabel = (code: string) => {
    if (code === 'usd') return 'US Dollar (USD)';
    if (code === 'tzs') return 'Tanzania Shilling (TZS)';
    if (code === 'ntzs') return 'Digital Tanzanian Shilling (nTZS)';
    if (code === 'pi') return 'Pi Network (PI)';
    return code.toUpperCase();
  };

  const getCurrencyColor = (code: string) => {
    if (code === 'usd') return 'from-blue-500 to-blue-600';
    if (code === 'tzs') return 'from-amber-500 to-amber-600';
    if (code === 'ntzs') return 'from-cyan-500 to-sky-600';
    if (code === 'pi') return 'from-purple-500 to-purple-600';
    return 'from-slate-500 to-slate-600';
  };

  const getCurrencyBgColor = (code: string) => {
    if (code === 'usd') return 'bg-blue-500/10 border-blue-300/20';
    if (code === 'tzs') return 'bg-amber-500/10 border-amber-300/20';
    if (code === 'ntzs') return 'bg-cyan-500/10 border-cyan-300/20';
    if (code === 'pi') return 'bg-purple-500/10 border-purple-300/20';
    return 'bg-slate-500/10 border-slate-300/20';
  };

  const getCurrencyTextColor = (code: string) => {
    if (code === 'usd') return 'text-blue-300';
    if (code === 'tzs') return 'text-amber-300';
    if (code === 'ntzs') return 'text-cyan-300';
    if (code === 'pi') return 'text-purple-300';
    return 'text-slate-300';
  };

  const currencies = ['usd', 'tzs', 'ntzs', 'pi'] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Currency Converter</h1>
            <p className="text-sm text-slate-400">Convert between Pi, TZS, nTZS, and USD in real-time</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 mb-2">Session Debug: hasSession={sessionDebug.hasSession ? 'yes' : 'no'} • age={sessionAgeMinutes ?? 'n/a'}m</p>
            <Link href="/admin/dashboard" className="text-sm text-slate-400 hover:text-slate-200 underline">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Converter Card */}
        <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Input Section */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-white mb-3">Enter Amount</label>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Amount</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-2">From Currency</label>
                  <select
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value as any)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    {currencies.map((curr) => (
                      <option key={curr} value={curr} className="bg-slate-900">
                        {getCurrencyLabel(curr)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Conversion Card */}
            <div className={`rounded-lg border border-white/20 p-4 bg-gradient-to-br ${getCurrencyColor(fromCurrency)} opacity-20`}>
              <div className="text-center">
                <p className="text-xs text-slate-300 uppercase tracking-wide mb-2">Converting</p>
                <p className="text-2xl font-bold text-white">{formatCurrencyAmount(fromCurrency, Number(amount) || 0)}</p>
                <p className="text-xs text-slate-300 mt-3 uppercase tracking-wide">Selected</p>
              </div>
            </div>
          </div>
        </div>

        {/* Conversion Results */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currencies.map((curr) => (
            <div key={curr} className={`rounded-lg border border-white/10 ${getCurrencyBgColor(curr)} p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">{getCurrencyLabel(curr)}</h3>
                <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${getCurrencyColor(curr)}`} />
              </div>

              <div className={`${getCurrencyTextColor(curr)} font-bold text-2xl mb-2`}>
                {formatCurrencyAmount(curr, conversionResults[curr as keyof typeof conversionResults])}
              </div>

              <p className="text-xs text-slate-400">
                {fromCurrency === curr
                  ? 'Original amount'
                  : `Converted from ${getCurrencyLabel(fromCurrency).split('(')[0].trim()}`}
              </p>
            </div>
          ))}
        </div>

        {/* Conversion Table */}
        <div className="mt-12 bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">All Conversions</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">From</th>
                  <th className="text-right py-3 px-4 text-slate-300 font-semibold">To USD</th>
                  <th className="text-right py-3 px-4 text-slate-300 font-semibold">To TZS</th>
                  <th className="text-right py-3 px-4 text-slate-300 font-semibold">To nTZS</th>
                  <th className="text-right py-3 px-4 text-slate-300 font-semibold">To PI</th>
                </tr>
              </thead>
              <tbody>
                {currencies.map((curr) => {
                  const numAmount = Number(amount) || 0;

                  return (
                    <tr key={`row-${curr}`} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white">{getCurrencyLabel(curr)}</span>
                        <p className="text-xs text-slate-400 mt-1">{formatCurrencyAmount(curr, numAmount)}</p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-blue-300 font-mono font-semibold">{formatCurrencyAmount('usd', convertAmount(numAmount, curr, 'usd'))}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-amber-300 font-mono font-semibold">{formatCurrencyAmount('tzs', convertAmount(numAmount, curr, 'tzs'))}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-cyan-300 font-mono font-semibold">{formatCurrencyAmount('ntzs', convertAmount(numAmount, curr, 'ntzs'))}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-purple-300 font-mono font-semibold">{formatCurrencyAmount('pi', convertAmount(numAmount, curr, 'pi'))}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Exchange Rates Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h4 className="text-sm font-semibold text-white mb-2">Live Admin Rates ✅</h4>
            <p className="text-xs text-slate-400 mb-3">Real-time rates from currency settings:</p>
            <div className="space-y-1 text-xs">
              <p className="text-slate-300">• USD = Base rate (1.00)</p>
              <p className="text-amber-300 font-semibold">• TZS = {adminRates.usdToTzs.toFixed(2)} per USD</p>
              <p className="text-cyan-300 font-semibold">• nTZS = {adminRates.usdToNTzs.toFixed(2)} per USD</p>
              <p className="text-purple-300 font-semibold">• PI = 1 Pi = ${adminRates.piGcvUsd.toLocaleString()}</p>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h4 className="text-sm font-semibold text-white mb-2">Quick Tips</h4>
            <p className="text-xs text-slate-400 mb-3">Usage tips:</p>
            <div className="space-y-1 text-xs">
              <p className="text-slate-300">• Select source currency and enter amount</p>
              <p className="text-slate-300">• Results auto-update for all four currencies</p>
              <p className="text-slate-300">• Rates auto-sync from currency settings</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/orders"
            className="block bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-300/30 rounded-lg p-4 hover:border-emerald-300/60 transition-colors"
          >
            <p className="font-semibold text-emerald-300 mb-1">📊 Orders</p>
            <p className="text-xs text-slate-400">View financial transactions</p>
          </Link>

          <Link
            href="/admin/currencies"
            className="block bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-300/30 rounded-lg p-4 hover:border-purple-300/60 transition-colors"
          >
            <p className="font-semibold text-purple-300 mb-1">💱 Currency Settings</p>
            <p className="text-xs text-slate-400">Manage exchange rates</p>
          </Link>

          <Link
            href="/admin/dashboard"
            className="block bg-gradient-to-br from-slate-500/20 to-slate-600/20 border border-slate-300/30 rounded-lg p-4 hover:border-slate-300/60 transition-colors"
          >
            <p className="font-semibold text-slate-300 mb-1">📈 Dashboard</p>
            <p className="text-xs text-slate-400">Return to dashboard</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
