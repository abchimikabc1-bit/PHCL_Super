'use client';

import React, {
  useState,
} from 'react';

import {
  AnimatePresence,
  motion,
} from 'framer-motion';

import {
  CURRENCIES,
  type CurrencyCode,
  convertCurrency,
  formatCurrency,
} from './currency';

import {
  PAYMENT_METHODS,
  type CurrencyCode as PaymentCurrencyCode,
  type PaymentMethod,
} from '@/lib/currencies';

export interface Transaction {
  id: string;

  type:
    | 'DEPOSIT'
    | 'WITHDRAW'
    | 'PURCHASE'
    | 'REFUND';

  amount: number;

  currency: CurrencyCode;

  provider: string;

  date: string;

  status:
    | 'COMPLETED'
    | 'PENDING'
    | 'FAILED';
}

/**
 * Marketplace UI currently displays the digital
 * shilling as "nTZS", while the PHCL financial
 * core uses the canonical asset code "NTZS".
 *
 * Keep this conversion at the UI boundary.
 *
 * Financial/server code should use:
 *   USD
 *   TZS
 *   NTZS
 *   PI
 */
const toPaymentCurrencyCode = (
  currency: CurrencyCode,
): PaymentCurrencyCode => {
  if (currency === 'nTZS') {
    return 'NTZS';
  }

  return currency as PaymentCurrencyCode;
};

const supportsCurrency = (
  method: PaymentMethod,
  currency: CurrencyCode,
): boolean =>
  method.supportedCurrencies.includes(
    toPaymentCurrencyCode(currency),
  );

export default function Wallet() {
  /**
   * DEMO / UI balances only.
   *
   * These values are NOT authoritative wallet
   * balances and must not be used for production
   * financial settlement.
   */
  const [
    balances,
    setBalances,
  ] = useState<
    Record<CurrencyCode, number>
  >({
    USD: 1450.0,
    TZS: 3850000,
    nTZS: 1200000.0,
    PI: 420.5,
  });

  const [
    activeTab,
    setActiveTab,
  ] = useState<
    'OVERVIEW' |
    'DEPOSIT' |
    'WITHDRAW'
  >('OVERVIEW');

  const [
    selectedCurrency,
    setSelectedCurrency,
  ] =
    useState<CurrencyCode>(
      'TZS',
    );

  const [
    selectedPayment,
    setSelectedPayment,
  ] =
    useState<PaymentMethod>(
      PAYMENT_METHODS[2] ||
        PAYMENT_METHODS[0],
    );

  const [
    amountInput,
    setAmountInput,
  ] = useState('');

  const [
    accountInput,
    setAccountInput,
  ] = useState('');

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  /**
   * DEMO transaction history.
   *
   * Production transaction history will later
   * come from the server-side immutable ledger.
   */
  const [
    transactions,
    setTransactions,
  ] = useState<Transaction[]>([
    {
      id: 'TX-9012',
      type: 'DEPOSIT',
      amount: 150000,
      currency: 'TZS',
      provider: 'MPESA',
      date: 'Leo, 14:20',
      status: 'COMPLETED',
    },

    {
      id: 'TX-8841',
      type: 'PURCHASE',
      amount: 850,
      currency: 'USD',
      provider: 'VISA',
      date: 'Juzi, 09:15',
      status: 'COMPLETED',
    },

    {
      id: 'TX-7310',
      type: 'DEPOSIT',
      amount: 15.0,
      currency: 'PI',
      provider: 'PI_NETWORK',
      date: '18 Julai, 2026',
      status: 'COMPLETED',
    },
  ]);

  const availablePayments =
    PAYMENT_METHODS.filter(
      (method) =>
        supportsCurrency(
          method,
          selectedCurrency,
        ),
    );

  const handleTransactionSubmit = (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    const numericAmount =
      Number.parseFloat(
        amountInput,
      );

    if (
      !Number.isFinite(
        numericAmount,
      ) ||
      numericAmount <= 0 ||
      !accountInput.trim()
    ) {
      alert(
        'Tafadhali jaza kiasi na taarifa za akaunti kwa usahihi!',
      );

      return;
    }

    if (
      activeTab ===
        'WITHDRAW' &&
      numericAmount >
        balances[
          selectedCurrency
        ]
    ) {
      alert(
        'Salio lako halitoshi kufanya muamala huu!',
      );

      return;
    }

    if (
      activeTab ===
      'OVERVIEW'
    ) {
      return;
    }

    setIsProcessing(true);

    /**
     * DEMO UI simulation only.
     *
     * Production deposits/withdrawals MUST NOT
     * mutate balances here. They will be sent
     * to authenticated server-side payment and
     * ledger endpoints.
     */
    window.setTimeout(() => {
      setBalances(
        (previous) => ({
          ...previous,

          [selectedCurrency]:
            activeTab ===
            'DEPOSIT'
              ? previous[
                  selectedCurrency
                ] +
                numericAmount
              : previous[
                  selectedCurrency
                ] -
                numericAmount,
        }),
      );

      const newTransaction:
        Transaction = {
        id: `TX-${Math.floor(
          1000 +
            Math.random() *
              9000,
        )}`,

        type:
          activeTab ===
          'DEPOSIT'
            ? 'DEPOSIT'
            : 'WITHDRAW',

        amount:
          numericAmount,

        currency:
          selectedCurrency,

        provider:
          selectedPayment.provider ||
          selectedPayment.name,

        date:
          'Punde Hivi',

        status:
          'COMPLETED',
      };

      setTransactions(
        (previous) => [
          newTransaction,
          ...previous,
        ],
      );

      setIsProcessing(false);
      setAmountInput('');
      setAccountInput('');
      setActiveTab(
        'OVERVIEW',
      );
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
              Financial Engine
              & Digital Vault
            </span>

            <h1 className="flex items-center gap-3 text-3xl font-extrabold text-white sm:text-4xl">
              💼 Wallet &
              Salio Lako
            </h1>
          </div>

          <div className="flex items-center gap-1 rounded-2xl border border-slate-800 bg-slate-900 p-1.5">
            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  'OVERVIEW',
                )
              }
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab ===
                'OVERVIEW'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              📊 Muhtasari
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  'DEPOSIT',
                )
              }
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab ===
                'DEPOSIT'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              📥 Weka Salio
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  'WITHDRAW',
                )
              }
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab ===
                'WITHDRAW'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              📤 Toa Salio
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            Object.keys(
              CURRENCIES,
            ) as CurrencyCode[]
          ).map((code) => {
            const config =
              CURRENCIES[
                code
              ];

            const balance =
              balances[
                code
              ] || 0;

            return (
              <motion.div
                key={code}
                whileHover={{
                  y: -4,
                }}
                className="group relative overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900/90 p-5 shadow-lg"
              >
                <div className="mb-4 flex items-start justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {
                      config.name
                    }
                  </span>

                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-xs font-bold text-amber-400">
                    {
                      config.symbol
                    }
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-100">
                    {formatCurrency(
                      balance,
                      code,
                    )}
                  </h3>

                  <p className="text-[10px] text-slate-500">
                    Kisia: ~
                    {formatCurrency(
                      convertCurrency(
                        balance,
                        code,
                        'USD',
                      ),
                      'USD',
                    )}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {activeTab ===
        'OVERVIEW' ? (
          <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="flex items-center justify-between text-lg font-bold text-slate-100">
              <span>
                📜 Kumbukumbu
                za Miamala
                (Transaction
                History)
              </span>

              <span className="text-xs font-normal text-slate-500">
                Miamala ya Hivi
                Karibuni
              </span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">
                      Muamala
                    </th>

                    <th className="px-4 py-3">
                      Njia
                      (Provider)
                    </th>

                    <th className="px-4 py-3">
                      Tarehe
                    </th>

                    <th className="px-4 py-3">
                      Hali
                      (Status)
                    </th>

                    <th className="px-4 py-3 text-right">
                      Kiasi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60">
                  {transactions.map(
                    (
                      transaction,
                    ) => (
                      <tr
                        key={
                          transaction.id
                        }
                        className="transition hover:bg-slate-800/30"
                      >
                        <td className="flex items-center gap-2 px-4 py-4 font-semibold text-slate-100">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              transaction.type ===
                              'DEPOSIT'
                                ? 'bg-emerald-400'
                                : 'bg-rose-400'
                            }`}
                          />

                          {
                            transaction.type
                          }{' '}
                          (
                          {
                            transaction.id
                          }
                          )
                        </td>

                        <td className="px-4 py-4 font-mono text-xs text-slate-400">
                          {
                            transaction.provider
                          }
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-400">
                          {
                            transaction.date
                          }
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                            {
                              transaction.status
                            }
                          </span>
                        </td>

                        <td
                          className={`px-4 py-4 text-right font-bold ${
                            transaction.type ===
                            'DEPOSIT'
                              ? 'text-emerald-400'
                              : 'text-slate-100'
                          }`}
                        >
                          {transaction.type ===
                          'DEPOSIT'
                            ? '+'
                            : '-'}

                          {formatCurrency(
                            transaction.amount,
                            transaction.currency,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.form
              key={activeTab}
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
              }}
              onSubmit={
                handleTransactionSubmit
              }
              className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8"
            >
              <h2 className="flex items-center justify-between border-b border-slate-800 pb-3 text-xl font-bold text-slate-100">
                <span>
                  {activeTab ===
                  'DEPOSIT'
                    ? '📥 Weka Salio (Deposit)'
                    : '📤 Toa Salio (Withdraw)'}
                </span>

                <span className="font-mono text-xs text-amber-500">
                  Fast Gateway
                </span>
              </h2>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">
                  1. Chagua
                  Sarafu:
                </label>

                <div className="grid grid-cols-4 gap-2">
                  {(
                    Object.keys(
                      CURRENCIES,
                    ) as CurrencyCode[]
                  ).map(
                    (code) => (
                      <button
                        type="button"
                        key={code}
                        onClick={() => {
                          setSelectedCurrency(
                            code,
                          );

                          const valid =
                            PAYMENT_METHODS.filter(
                              (
                                method,
                              ) =>
                                supportsCurrency(
                                  method,
                                  code,
                                ),
                            );

                          if (
                            valid.length >
                            0
                          ) {
                            setSelectedPayment(
                              valid[0],
                            );
                          }
                        }}
                        className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                          selectedCurrency ===
                          code
                            ? 'border-amber-500 bg-amber-500 text-slate-950'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {
                          code
                        }
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">
                  2. Chagua Njia
                  ya Malipo:
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {availablePayments.map(
                    (
                      baseMethod,
                    ) => {
                      const method =
                        baseMethod as PaymentMethod & {
                          icon?: string;
                        };

                      const isSelected =
                        selectedPayment.id ===
                        method.id;

                      return (
                        <button
                          type="button"
                          key={
                            method.id
                          }
                          onClick={() =>
                            setSelectedPayment(
                              method,
                            )
                          }
                          className={`flex items-center justify-between rounded-2xl border p-3.5 text-left transition ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500/10 text-white'
                              : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className="flex items-center gap-2 text-xs font-bold">
                            {method.icon && (
                              <span>
                                {
                                  method.icon
                                }
                              </span>
                            )}

                            {
                              method.name
                            }
                          </span>

                          <span
                            className={`h-3.5 w-3.5 rounded-full border ${
                              isSelected
                                ? 'border-amber-500 bg-amber-500'
                                : 'border-slate-600'
                            }`}
                          />
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Kiasi (
                    {
                      selectedCurrency
                    }
                    ):
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder={`Weka kiasi cha ${selectedCurrency}`}
                    value={
                      amountInput
                    }
                    onChange={(
                      event,
                    ) =>
                      setAmountInput(
                        event.target
                          .value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100 transition focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Namba ya Akaunti
                    / Namba ya Simu:
                  </label>

                  <input
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="Weka taarifa za akaunti yako..."
                    value={
                      accountInput
                    }
                    onChange={(
                      event,
                    ) =>
                      setAccountInput(
                        event.target
                          .value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100 transition focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  isProcessing
                }
                className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-black text-slate-950 shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  activeTab ===
                  'DEPOSIT'
                    ? 'bg-emerald-400 hover:bg-emerald-300'
                    : 'bg-amber-500 hover:bg-amber-400'
                }`}
              >
                {isProcessing ? (
                  <>
                    🌀
                    Inachakata
                    Muamala...
                  </>
                ) : (
                  <>
                    {activeTab ===
                    'DEPOSIT'
                      ? '📥 Thibitisha Kuweka Salio'
                      : '📤 Thibitisha Kutoa Salio'}
                  </>
                )}
              </button>
            </motion.form>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}