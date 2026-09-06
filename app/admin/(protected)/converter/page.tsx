'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  convertAmount,
  formatCurrencyAmount,
  PI_GCV_USD,
  USD_TO_NTZS,
  USD_TO_TZS,
} from '@/components/currency';
import { useAdmin } from '@/lib/admin-context';

type CurrencyCode =
  | 'usd'
  | 'tzs'
  | 'ntzs'
  | 'pi';

const CURRENCIES: readonly CurrencyCode[] = [
  'usd',
  'tzs',
  'ntzs',
  'pi',
];

const isCurrencyCode = (
  value: string,
): value is CurrencyCode =>
  CURRENCIES.includes(
    value as CurrencyCode,
  );

const EMPTY_RESULTS: Record<
  CurrencyCode,
  number
> = {
  usd: 0,
  tzs: 0,
  ntzs: 0,
  pi: 0,
};

export default function AdminConverterPage() {
  const router = useRouter();

  const {
    isAuthenticated,
    isLoading,
  } = useAdmin();

  const [
    loadingGuardElapsed,
    setLoadingGuardElapsed,
  ] = useState(false);

  const [
    amount,
    setAmount,
  ] = useState('100');

  const [
    fromCurrency,
    setFromCurrency,
  ] =
    useState<CurrencyCode>('usd');

  const [
    conversionResults,
    setConversionResults,
  ] = useState<
    Record<CurrencyCode, number>
  >(EMPTY_RESULTS);

  useEffect(() => {
    if (
      !isLoading &&
      !isAuthenticated
    ) {
      router.push('/admin/login');
    }
  }, [
    isAuthenticated,
    isLoading,
    router,
  ]);

  useEffect(() => {
    const timer =
      window.setTimeout(
        () =>
          setLoadingGuardElapsed(
            true,
          ),
        4000,
      );

    return () =>
      window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const numericAmount =
      Number(amount);

    if (
      amount.trim() === '' ||
      !Number.isFinite(
        numericAmount,
      )
    ) {
      setConversionResults(
        EMPTY_RESULTS,
      );
      return;
    }

    setConversionResults({
      usd: convertAmount(
        numericAmount,
        fromCurrency,
        'usd',
      ),

      tzs: convertAmount(
        numericAmount,
        fromCurrency,
        'tzs',
      ),

      ntzs: convertAmount(
        numericAmount,
        fromCurrency,
        'ntzs',
      ),

      pi: convertAmount(
        numericAmount,
        fromCurrency,
        'pi',
      ),
    });
  }, [
    amount,
    fromCurrency,
  ]);

  const loadingActive =
    isLoading &&
    !loadingGuardElapsed;

  if (loadingActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />

          <p className="text-purple-200">
            Loading converter...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const getCurrencyLabel = (
    code: CurrencyCode,
  ) => {
    switch (code) {
      case 'usd':
        return 'US Dollar (USD)';

      case 'tzs':
        return 'Tanzania Shilling (TZS)';

      case 'ntzs':
        return 'Digital Tanzanian Shilling (nTZS)';

      case 'pi':
        return 'Pi Network (PI)';
    }
  };

  const getCurrencyColor = (
    code: CurrencyCode,
  ) => {
    switch (code) {
      case 'usd':
        return 'from-blue-500 to-blue-600';

      case 'tzs':
        return 'from-amber-500 to-amber-600';

      case 'ntzs':
        return 'from-cyan-500 to-sky-600';

      case 'pi':
        return 'from-purple-500 to-purple-600';
    }
  };

  const getCurrencyBgColor = (
    code: CurrencyCode,
  ) => {
    switch (code) {
      case 'usd':
        return 'bg-blue-500/10 border-blue-300/20';

      case 'tzs':
        return 'bg-amber-500/10 border-amber-300/20';

      case 'ntzs':
        return 'bg-cyan-500/10 border-cyan-300/20';

      case 'pi':
        return 'bg-purple-500/10 border-purple-300/20';
    }
  };

  const getCurrencyTextColor = (
    code: CurrencyCode,
  ) => {
    switch (code) {
      case 'usd':
        return 'text-blue-300';

      case 'tzs':
        return 'text-amber-300';

      case 'ntzs':
        return 'text-cyan-300';

      case 'pi':
        return 'text-purple-300';
    }
  };

  const numericAmount =
    Number.isFinite(
      Number(amount),
    )
      ? Number(amount)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Currency Converter
            </h1>

            <p className="text-sm text-slate-400">
              Convert between USD,
              TZS, nTZS and PI using
              PHCL configured reference
              rates
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-400 mb-2">
              Protected Admin
              Converter
            </p>

            <Link
              href="/admin/dashboard"
              className="text-sm text-slate-400 hover:text-slate-200 underline"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-white mb-3">
                Enter Amount
              </label>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-2">
                    Amount
                  </label>

                  <input
                    type="number"
                    value={amount}
                    onChange={(event) =>
                      setAmount(
                        event.target.value,
                      )
                    }
                    placeholder="0"
                    step="any"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-2">
                    From Currency
                  </label>

                  <select
                    value={fromCurrency}
                    onChange={(event) => {
                      const value =
                        event.target
                          .value;

                      if (
                        isCurrencyCode(
                          value,
                        )
                      ) {
                        setFromCurrency(
                          value,
                        );
                      }
                    }}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    {CURRENCIES.map(
                      (currency) => (
                        <option
                          key={
                            currency
                          }
                          value={
                            currency
                          }
                          className="bg-slate-900"
                        >
                          {getCurrencyLabel(
                            currency,
                          )}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div
              className={`rounded-lg border border-white/20 p-4 bg-gradient-to-br ${getCurrencyColor(
                fromCurrency,
              )}`}
            >
              <div className="text-center">
                <p className="text-xs text-white/80 uppercase tracking-wide mb-2">
                  Converting
                </p>

                <p className="text-2xl font-bold text-white">
                  {formatCurrencyAmount(
                    fromCurrency,
                    numericAmount,
                  )}
                </p>

                <p className="text-xs text-white/80 mt-3 uppercase tracking-wide">
                  Selected
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CURRENCIES.map(
            (currency) => (
              <div
                key={currency}
                className={`rounded-lg border border-white/10 ${getCurrencyBgColor(
                  currency,
                )} p-6`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white">
                    {getCurrencyLabel(
                      currency,
                    )}
                  </h3>

                  <div
                    className={`w-3 h-3 rounded-full bg-gradient-to-br ${getCurrencyColor(
                      currency,
                    )}`}
                  />
                </div>

                <div
                  className={`${getCurrencyTextColor(
                    currency,
                  )} font-bold text-2xl mb-2`}
                >
                  {formatCurrencyAmount(
                    currency,
                    conversionResults[
                      currency
                    ],
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  {fromCurrency ===
                  currency
                    ? 'Original amount'
                    : `Converted from ${getCurrencyLabel(
                        fromCurrency,
                      )
                        .split(
                          '(',
                        )[0]
                        .trim()}`}
                </p>
              </div>
            ),
          )}
        </div>

        <div className="mt-12 bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            All Conversions
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">
                    From
                  </th>

                  <th className="text-right py-3 px-4 text-slate-300 font-semibold">
                    To USD
                  </th>

                  <th className="text-right py-3 px-4 text-slate-300 font-semibold">
                    To TZS
                  </th>

                  <th className="text-right py-3 px-4 text-slate-300 font-semibold">
                    To nTZS
                  </th>

                  <th className="text-right py-3 px-4 text-slate-300 font-semibold">
                    To PI
                  </th>
                </tr>
              </thead>

              <tbody>
                {CURRENCIES.map(
                  (currency) => (
                    <tr
                      key={`row-${currency}`}
                      className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white">
                          {getCurrencyLabel(
                            currency,
                          )}
                        </span>

                        <p className="text-xs text-slate-400 mt-1">
                          {formatCurrencyAmount(
                            currency,
                            numericAmount,
                          )}
                        </p>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="text-blue-300 font-mono font-semibold">
                          {formatCurrencyAmount(
                            'usd',
                            convertAmount(
                              numericAmount,
                              currency,
                              'usd',
                            ),
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="text-amber-300 font-mono font-semibold">
                          {formatCurrencyAmount(
                            'tzs',
                            convertAmount(
                              numericAmount,
                              currency,
                              'tzs',
                            ),
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="text-cyan-300 font-mono font-semibold">
                          {formatCurrencyAmount(
                            'ntzs',
                            convertAmount(
                              numericAmount,
                              currency,
                              'ntzs',
                            ),
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="text-purple-300 font-mono font-semibold">
                          {formatCurrencyAmount(
                            'pi',
                            convertAmount(
                              numericAmount,
                              currency,
                              'pi',
                            ),
                          )}
                        </span>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h4 className="text-sm font-semibold text-white mb-2">
              PHCL Reference Rates
              ✅
            </h4>

            <p className="text-xs text-slate-400 mb-3">
              Client display rates.
              Server-side financial
              settlement remains the
              authoritative source.
            </p>

            <div className="space-y-1 text-xs">
              <p className="text-slate-300">
                • USD = Base currency
                (1.00)
              </p>

              <p className="text-amber-300 font-semibold">
                • 1 USD ={' '}
                {USD_TO_TZS.toLocaleString(
                  'en-US',
                )}{' '}
                TZS
              </p>

              <p className="text-cyan-300 font-semibold">
                • 1 USD ={' '}
                {USD_TO_NTZS.toLocaleString(
                  'en-US',
                )}{' '}
                nTZS
              </p>

              <p className="text-cyan-200">
                • 1 TZS = 1 nTZS
                configured parity
              </p>

              <p className="text-purple-300 font-semibold">
                • 1 PI = USD{' '}
                {PI_GCV_USD.toLocaleString(
                  'en-US',
                )}{' '}
                PHCL reference/GCV
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h4 className="text-sm font-semibold text-white mb-2">
              Conversion Security
            </h4>

            <div className="space-y-2 text-xs text-slate-300">
              <p>
                • This page is a
                conversion and display
                interface.
              </p>

              <p>
                • Browser calculations
                must never authorize a
                payment or balance
                mutation.
              </p>

              <p>
                • Checkout, payment
                quotes, ledger and
                exchanger must use
                server-authoritative
                rates.
              </p>

              <p>
                • nTZS and TZS can have
                equal configured value
                while remaining
                different payment
                assets.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/orders"
            className="block bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-300/30 rounded-lg p-4 hover:border-emerald-300/60 transition-colors"
          >
            <p className="font-semibold text-emerald-300 mb-1">
              📊 Orders
            </p>

            <p className="text-xs text-slate-400">
              View financial
              transactions
            </p>
          </Link>

          <Link
            href="/admin/currencies"
            className="block bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-300/30 rounded-lg p-4 hover:border-purple-300/60 transition-colors"
          >
            <p className="font-semibold text-purple-300 mb-1">
              💱 Currency Settings
            </p>

            <p className="text-xs text-slate-400">
              Manage exchange rates
            </p>
          </Link>

          <Link
            href="/admin/dashboard"
            className="block bg-gradient-to-br from-slate-500/20 to-slate-600/20 border border-slate-300/30 rounded-lg p-4 hover:border-slate-300/60 transition-colors"
          >
            <p className="font-semibold text-slate-300 mb-1">
              📈 Dashboard
            </p>

            <p className="text-xs text-slate-400">
              Return to dashboard
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}