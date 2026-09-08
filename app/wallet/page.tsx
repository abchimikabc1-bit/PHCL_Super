'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import dynamic from 'next/dynamic';

import Link from 'next/link';

import {
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

import {
  PI_GCV_USD,
  convertAmount,
  formatCurrencyAmount,
} from '@/components/currency';

import {
  useLanguage,
} from '@/hooks/use-language';

import {
  firebaseAuth,
} from '@/lib/firebase-client';

const WalletVoiceAssist =
  dynamic(
    () =>
      import(
        './wallet-voice-assist'
      ),
    {
      ssr: false,
    },
  );

type WalletCurrency =
  | 'usd'
  | 'tzs'
  | 'ntzs'
  | 'pi';

type WalletBalance = {
  atomic: string;
  display: string;
};

type WalletBalances = Record<
  WalletCurrency,
  WalletBalance
>;

type WalletLedgerEntry = {
  id: string;

  operationId:
    | string
    | null;

  operationType: string;

  direction:
    | 'CREDIT'
    | 'DEBIT'
    | 'UNKNOWN';

  asset:
    | 'USD'
    | 'TZS'
    | 'NTZS'
    | 'PI'
    | null;

  amountAtomic: string;

  amount: string;

  balanceAfter: string;

  description: string;

  createdAt:
    | string
    | null;
};

type WalletData = {
  balances: WalletBalances;

  updatedAt:
    | string
    | null;

  ledger:
    WalletLedgerEntry[];
};

type WalletApiResponse = {
  ok?: boolean;

  code?: string;

  message?: string;

  wallet?: WalletData;
};

const EMPTY_BALANCES:
  WalletBalances = {
  usd: {
    atomic: '0',
    display: '0.00',
  },

  tzs: {
    atomic: '0',
    display: '0',
  },

  ntzs: {
    atomic: '0',
    display: '0',
  },

  pi: {
    atomic: '0',
    display: '0.00000000',
  },
};

const WALLET_COPY = {
  en: {
    badge:
      'Enterprise Digital Wallet',

    title:
      'PHCL Super Wallet & Exchange',

    description:
      'Review server-authoritative multi-currency balances and your protected financial ledger.',

    backHome:
      'Back Home',

    availableBalance:
      'Estimated Portfolio Value',

    deposit:
      'Deposit Funds',

    withdraw:
      'Withdraw Funds',

    transfer:
      'Transfer Funds',

    goToCheckout:
      'Checkout',

    openMarketplace:
      'Marketplace',

    openExchange:
      'Exchange',

    profile:
      'Profile & Verification',

    walletsTitle:
      'Authoritative Wallet Balances',

    recentActivity:
      'Recent Financial Ledger Activity',

    noRecentActivity:
      'No financial ledger activity found.',

    debitLabel:
      'Payment Out',

    creditLabel:
      'Funds In',

    loginRequired:
      'Please sign in to access your wallet.',

    login:
      'Sign In',

    loading:
      'Loading protected wallet...',

    refresh:
      'Refresh Wallet',

    refreshing:
      'Refreshing...',

    walletUnavailable:
      'Your wallet could not be loaded. Please try again.',

    secureBalance:
      'Server-authoritative balance',

    lastUpdated:
      'Last updated',

    unavailable:
      'Unavailable',
  },

  sw: {
    badge:
      'Wallet Rasmi ya Kidijitali',

    title:
      'Wallet na Exchange ya PHCL Super',

    description:
      'Kagua salio rasmi la sarafu mbalimbali na kumbukumbu ya miamala inayolindwa na server.',

    backHome:
      'Rudi Nyumbani',

    availableBalance:
      'Makadirio ya Thamani ya Portifolio',

    deposit:
      'Weka Fedha',

    withdraw:
      'Toa Fedha',

    transfer:
      'Tuma Fedha',

    goToCheckout:
      'Nenda Checkout',

    openMarketplace:
      'Marketplace',

    openExchange:
      'Exchange',

    profile:
      'Wasifu na Uthibitishaji',

    walletsTitle:
      'Salio Rasmi la Wallet',

    recentActivity:
      'Shughuli za Karibuni za Ledger',

    noRecentActivity:
      'Bado hakuna shughuli kwenye ledger rasmi.',

    debitLabel:
      'Fedha Zilizotoka',

    creditLabel:
      'Fedha Zilizoingia',

    loginRequired:
      'Tafadhali ingia ili kufungua wallet yako.',

    login:
      'Ingia',

    loading:
      'Inapakia wallet iliyolindwa...',

    refresh:
      'Sasisha Wallet',

    refreshing:
      'Inasasisha...',

    walletUnavailable:
      'Wallet haikuweza kupakiwa. Tafadhali jaribu tena.',

    secureBalance:
      'Salio rasmi kutoka server',

    lastUpdated:
      'Ilisasishwa',

    unavailable:
      'Haipatikani',
  },
} as const;

function isRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      'object' &&
    value !== null &&
    !Array.isArray(
      value,
    )
  );
}

function normalizeDisplayAmount(
  value: unknown,
): string {
  if (
    typeof value !==
      'string' ||
    !/^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(
      value,
    )
  ) {
    return '0';
  }

  return value;
}

function formatExactAmount(
  currency: WalletCurrency,
  rawValue: string,
): string {
  const value =
    normalizeDisplayAmount(
      rawValue,
    );

  const [
    wholePart,
    fractionPart,
  ] =
    value.split('.');

  const groupedWhole =
    wholePart.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      ',',
    );

  const formatted =
    fractionPart !==
      undefined
      ? `${groupedWhole}.${fractionPart}`
      : groupedWhole;

  switch (currency) {
    case 'usd':
      return `$${formatted}`;

    case 'tzs':
      return `TZS ${formatted}`;

    case 'ntzs':
      return `nTZS ${formatted}`;

    case 'pi':
      return `π ${formatted}`;
  }
}

function toDisplayNumber(
  value: string,
): number {
  const parsed =
    Number(
      value,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}

function formatLedgerDate(
  value:
    | string
    | null,
): string {
  if (!value) {
    return '';
  }

  const date =
    new Date(
      value,
    );

  if (
    !Number.isFinite(
      date.getTime(),
    )
  ) {
    return '';
  }

  return date.toLocaleString();
}

function assetToCurrency(
  asset:
    WalletLedgerEntry['asset'],
): WalletCurrency | null {
  switch (asset) {
    case 'USD':
      return 'usd';

    case 'TZS':
      return 'tzs';

    case 'NTZS':
      return 'ntzs';

    case 'PI':
      return 'pi';

    default:
      return null;
  }
}

async function readJsonResponse(
  response: Response,
): Promise<WalletApiResponse> {
  try {
    const parsed:
      unknown =
      await response.json();

    return isRecord(
      parsed,
    )
      ? (
          parsed as
            WalletApiResponse
        )
      : {};
  } catch {
    return {};
  }
}

export default function WalletPage() {
  const {
    language,
  } =
    useLanguage();

  const isSw =
    language ===
    'sw';

  const copy =
    isSw
      ? WALLET_COPY.sw
      : WALLET_COPY.en;

  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<User | null>(
      null,
    );

  const [
    wallet,
    setWallet,
  ] =
    useState<WalletData | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false,
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState(
      '',
    );

  const requestSequence =
    useRef(
      0,
    );

  const loadWallet =
    useCallback(
      async (
        user: User,
        manualRefresh =
          false,
      ) => {
        const requestId =
          requestSequence
            .current +
          1;

        requestSequence.current =
          requestId;

        if (manualRefresh) {
          setRefreshing(
            true,
          );
        } else {
          setLoading(
            true,
          );
        }

        setErrorMessage(
          '',
        );

        try {
          const idToken =
            await user.getIdToken(
              manualRefresh,
            );

          const response =
            await fetch(
              '/api/wallet',
              {
                method:
                  'GET',

                cache:
                  'no-store',

                credentials:
                  'include',

                headers: {
                  Authorization:
                    `Bearer ${idToken}`,
                },
              },
            );

          const data =
            await readJsonResponse(
              response,
            );

          if (
            !response.ok ||
            !data.ok ||
            !data.wallet
          ) {
            throw new Error(
              data.message ||
                'Unable to load wallet.',
            );
          }

          if (
            requestSequence.current !==
            requestId
          ) {
            return;
          }

          setWallet(
            data.wallet,
          );
        } catch {
          if (
            requestSequence.current !==
            requestId
          ) {
            return;
          }

          setWallet(
            null,
          );

          setErrorMessage(
            isSw
              ? WALLET_COPY.sw
                  .walletUnavailable
              : WALLET_COPY.en
                  .walletUnavailable,
          );
        } finally {
          if (
            requestSequence.current ===
            requestId
          ) {
            setLoading(
              false,
            );

            setRefreshing(
              false,
            );
          }
        }
      },
      [
        isSw,
      ],
    );

  useEffect(
    () => {
      if (!firebaseAuth) {
        setLoading(
          false,
        );

        setErrorMessage(
          copy.walletUnavailable,
        );

        return;
      }

      const unsubscribe =
        onAuthStateChanged(
          firebaseAuth,
          (
            user,
          ) => {
            requestSequence
              .current +=
              1;

            setCurrentUser(
              user,
            );

            if (!user) {
              setWallet(
                null,
              );

              setErrorMessage(
                '',
              );

              setLoading(
                false,
              );

              return;
            }

            void loadWallet(
              user,
            );
          },
        );

      return () => {
        requestSequence
          .current +=
          1;

        unsubscribe();
      };
    },
    [
      copy.walletUnavailable,
      loadWallet,
    ],
  );

  const balances =
    wallet?.balances ??
    EMPTY_BALANCES;

  const totalUsd =
    useMemo(
      () => {
        const usd =
          toDisplayNumber(
            balances.usd
              .display,
          );

        const tzs =
          toDisplayNumber(
            balances.tzs
              .display,
          );

        const ntzs =
          toDisplayNumber(
            balances.ntzs
              .display,
          );

        const pi =
          toDisplayNumber(
            balances.pi
              .display,
          );

        return (
          usd +
          convertAmount(
            tzs,
            'tzs',
            'usd',
          ) +
          convertAmount(
            ntzs,
            'ntzs',
            'usd',
          ) +
          convertAmount(
            pi,
            'pi',
            'usd',
          )
        );
      },
      [
        balances,
      ],
    );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <p>
          {copy.loading}
        </p>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center space-y-4 bg-slate-950 p-6 text-center text-white">
        <p className="text-slate-300">
          {copy.loginRequired}
        </p>

        <Link
          href="/login"
          className="rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950"
        >
          {copy.login}
        </Link>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[#1c1607] font-sans text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_35%)]" />

      <section className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-amber-400/20 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />

              {copy.badge}
            </div>

            <h1 className="mt-3 text-3xl font-black text-amber-100 sm:text-4xl">
              {copy.title}
            </h1>

            <p className="mt-1 max-w-2xl text-xs text-slate-300 sm:text-sm">
              {copy.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                refreshing
              }
              onClick={() => {
                void loadWallet(
                  currentUser,
                  true,
                );
              }}
              className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-xs font-semibold text-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing
                ? copy.refreshing
                : copy.refresh}
            </button>

            <Link
              href="/"
              className="rounded-xl border border-white/20 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200"
            >
              {copy.backHome}
            </Link>
          </div>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200"
          >
            {errorMessage}
          </div>
        )}

        <section className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-300/80">
                {copy.availableBalance}
              </p>

              <h2 className="mt-1 text-4xl font-black tracking-tight text-amber-200 sm:text-5xl">
                {formatCurrencyAmount(
                  'usd',
                  totalUsd,
                )}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-lg border border-amber-400/30 bg-amber-400/20 px-3 py-1 font-extrabold text-amber-100">
                  1 PI = $
                  {PI_GCV_USD.toLocaleString(
                    'en-US',
                  )}{' '}
                  GCV
                </span>

                <span className="rounded-lg border border-emerald-400/30 bg-emerald-400/20 px-3 py-1 font-bold text-emerald-300">
                  ✓ {copy.secureBalance}
                </span>
              </div>

              {wallet?.updatedAt && (
                <p className="mt-3 text-[11px] text-slate-500">
                  {copy.lastUpdated}:{' '}
                  {formatLedgerDate(
                    wallet.updatedAt,
                  )}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Link
                href="/deposit"
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-center text-xs font-black text-slate-950 transition hover:scale-105"
              >
                + {copy.deposit}
              </Link>

              <Link
                href="/withdraw"
                className="rounded-xl border border-rose-400/40 bg-rose-500/20 px-4 py-3 text-center text-xs font-black text-rose-200 transition hover:scale-105 hover:bg-rose-500/30"
              >
                ↑ {copy.withdraw}
              </Link>

              <Link
                href="/transfer"
                className="rounded-xl border border-amber-400/40 bg-amber-400/20 px-4 py-3 text-center text-xs font-black text-amber-200 transition hover:scale-105 hover:bg-amber-400/30"
              >
                ⇄ {copy.transfer}
              </Link>
            </div>
          </div>

          <nav className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <Link
              href="/checkout"
              className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300"
            >
              🛒 {copy.goToCheckout}
            </Link>

            <Link
              href="/marketplace"
              className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300"
            >
              🏬 {copy.openMarketplace}
            </Link>

            <Link
              href="/exchange"
              className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-300"
            >
              💱 {copy.openExchange}
            </Link>

            <Link
              href="/profile"
              className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300"
            >
              ✓ {copy.profile}
            </Link>
          </nav>

          <div className="mt-5">
            <WalletVoiceAssist
              balancePi={
                balances.pi
                  .display
              }
              gcvUsd={
                PI_GCV_USD.toLocaleString(
                  'en-US',
                )
              }
            />
          </div>

          <section className="mt-8">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              {copy.walletsTitle}
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <BalanceCard
                icon="🥧"
                badge="Pi Network"
                label="Pi Crypto Asset"
                amount={formatExactAmount(
                  'pi',
                  balances.pi
                    .display,
                )}
                color="amber"
              />

              <BalanceCard
                icon="🇹🇿"
                badge="TZS Cash"
                label="Tanzanian Shilling"
                amount={formatExactAmount(
                  'tzs',
                  balances.tzs
                    .display,
                )}
                color="emerald"
              />

              <BalanceCard
                icon="🇹🇿⚡"
                badge="nTZS Stable"
                label="Digital Shilling"
                amount={formatExactAmount(
                  'ntzs',
                  balances.ntzs
                    .display,
                )}
                color="cyan"
              />

              <BalanceCard
                icon="🇺🇸"
                badge="USD Global"
                label="US Dollar"
                amount={formatExactAmount(
                  'usd',
                  balances.usd
                    .display,
                )}
                color="blue"
              />
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-white/10 bg-slate-950/70 p-5 shadow-inner">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              {copy.recentActivity}
            </p>

            <div className="space-y-3">
              {!wallet ||
              wallet.ledger.length ===
                0 ? (
                <p className="py-3 text-center text-sm text-slate-500">
                  {copy.noRecentActivity}
                </p>
              ) : (
                wallet.ledger.map(
                  (
                    entry,
                  ) => {
                    const currency =
                      assetToCurrency(
                        entry.asset,
                      );

                    const isDebit =
                      entry.direction ===
                      'DEBIT';

                    return (
                      <article
                        key={
                          entry.id
                        }
                        className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-xs transition hover:bg-white/10"
                      >
                        <div>
                          <p className="text-sm font-bold text-white">
                            {isDebit
                              ? copy.debitLabel
                              : copy.creditLabel}

                            {entry.asset
                              ? ` (${entry.asset})`
                              : ''}
                          </p>

                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {entry.description ||
                              entry.operationType}
                          </p>

                          <p className="mt-1 text-[10px] text-slate-500">
                            {formatLedgerDate(
                              entry.createdAt,
                            )}
                          </p>
                        </div>

                        <p
                          className={
                            isDebit
                              ? 'text-sm font-black text-rose-400 sm:text-base'
                              : 'text-sm font-black text-emerald-400 sm:text-base'
                          }
                        >
                          {isDebit
                            ? '-'
                            : '+'}

                          {currency
                            ? formatExactAmount(
                                currency,
                                entry.amount,
                              )
                            : copy.unavailable}
                        </p>
                      </article>
                    );
                  },
                )
              )}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

type BalanceCardProps = {
  icon: string;
  badge: string;
  label: string;
  amount: string;

  color:
    | 'amber'
    | 'emerald'
    | 'cyan'
    | 'blue';
};

const BALANCE_CARD_STYLES = {
  amber:
    'border-amber-400/40 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 text-amber-200',

  emerald:
    'border-emerald-400/30 bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-950 text-emerald-200',

  cyan:
    'border-cyan-400/30 bg-gradient-to-br from-cyan-950/30 via-slate-900 to-slate-950 text-cyan-200',

  blue:
    'border-blue-400/30 bg-gradient-to-br from-blue-950/30 via-slate-900 to-slate-950 text-blue-200',
} as const;

function BalanceCard({
  icon,
  badge,
  label,
  amount,
  color,
}: BalanceCardProps) {
  return (
    <article
      className={`rounded-2xl border p-5 shadow-lg ${BALANCE_CARD_STYLES[color]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-3xl">
          {icon}
        </span>

        <span className="rounded-full border border-current px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          {badge}
        </span>
      </div>

      <p className="mt-4 text-xs font-semibold text-slate-400">
        {label}
      </p>

      <p className="break-words text-xl font-black">
        {amount}
      </p>
    </article>
  );
}