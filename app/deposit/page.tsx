'use client';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';

import Link from 'next/link';

import {
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

import {
  firebaseAuth,
} from '@/lib/firebase-client';

type DepositAsset =
  | 'TZS'
  | 'USD'
  | 'PI';

type DepositRail =
  | 'BANK'
  | 'MOBILE_MONEY'
  | 'BLOCKCHAIN';

type ProviderOption = {
  value:
    string;

  label:
    string;
};

type DepositResult = {
  requestId:
    string;

  operationId:
    string;

  asset:
    DepositAsset;

  rail:
    DepositRail;

  providerCode:
    string;

  amount:
    string;

  status:
    'PENDING_PROVIDER_INITIATION';

  idempotent:
    boolean;

  expiresAt:
    string;
};

type PaymentInstruction = {
  type:
    'USSD_PROMPT';

  message:
    string;

  expiresAtMs:
    number | null;
};

type DepositApiResponse = {
  ok?:
    unknown;

  code?:
    unknown;

  message?:
    unknown;

  deposit?:
    unknown;

  paymentInstructions?:
    unknown;
};

const MOBILE_MONEY_PROVIDERS:
  ProviderOption[] = [
    {
      value:
        'MPESA',

      label:
        'M-Pesa',
    },
    {
      value:
        'AIRTEL_MONEY',

      label:
        'Airtel Money',
    },
    {
      value:
        'MIXX_BY_YAS',

      label:
        'Mixx by Yas',
    },
    {
      value:
        'HALOPESA',

      label:
        'HaloPesa',
    },
  ];

const BANK_PROVIDERS:
  ProviderOption[] = [
    {
      value:
        'CRDB',

      label:
        'CRDB Bank',
    },
    {
      value:
        'NMB',

      label:
        'NMB Bank',
    },
    {
      value:
        'NBC',

      label:
        'NBC Bank',
    },
    {
      value:
        'EXIM',

      label:
        'Exim Bank',
    },
    {
      value:
        'OTHER_BANK',

      label:
        'Benki nyingine',
    },
  ];

const USD_BANK_PROVIDERS:
  ProviderOption[] = [
    {
      value:
        'OTHER_BANK',

      label:
        'International/approved bank',
    },
  ];

const PI_PROVIDERS:
  ProviderOption[] = [
    {
      value:
        'PI_NETWORK',

      label:
        'Pi Network',
    },
  ];

function createOperationId():
  string {
  if (
    typeof crypto !==
      'undefined' &&
    typeof crypto.randomUUID ===
      'function'
  ) {
    return `deposit-${crypto.randomUUID()}`;
  }

  return [
    'deposit',
    Date.now()
      .toString(
        36,
      ),
    Math.random()
      .toString(
        36,
      )
      .slice(
        2,
      ),
  ].join(
    '-',
  );
}

function isPlainObject(
  value:
    unknown,
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

function parseDepositResult(
  value:
    unknown,
): DepositResult | null {
  if (
    !isPlainObject(
      value,
    )
  ) {
    return null;
  }

  if (
    typeof value.requestId !==
      'string' ||
    typeof value.operationId !==
      'string' ||
    (
      value.asset !==
        'TZS' &&
      value.asset !==
        'USD' &&
      value.asset !==
        'PI'
    ) ||
    (
      value.rail !==
        'BANK' &&
      value.rail !==
        'MOBILE_MONEY' &&
      value.rail !==
        'BLOCKCHAIN'
    ) ||
    typeof value.providerCode !==
      'string' ||
    typeof value.amount !==
      'string' ||
    value.status !==
      'PENDING_PROVIDER_INITIATION' ||
    typeof value.idempotent !==
      'boolean' ||
    typeof value.expiresAt !==
      'string'
  ) {
    return null;
  }

  return {
    requestId:
      value.requestId,

    operationId:
      value.operationId,

    asset:
      value.asset,

    rail:
      value.rail,

    providerCode:
      value.providerCode,

    amount:
      value.amount,

    status:
      value.status,

    idempotent:
      value.idempotent,

    expiresAt:
      value.expiresAt,
  };
}

function parsePaymentInstruction(
  value:
    unknown,
): PaymentInstruction | null {
  if (
    !isPlainObject(
      value,
    )
  ) {
    return null;
  }

  if (
    value.type !==
      'USSD_PROMPT' ||
    typeof value.message !==
      'string' ||
    !value.message.trim()
  ) {
    return null;
  }

  let expiresAtMs:
    number | null;

  if (
    value.expiresAtMs ===
      null
  ) {
    expiresAtMs =
      null;
  } else if (
    typeof value.expiresAtMs ===
      'number' &&
    Number.isSafeInteger(
      value.expiresAtMs,
    ) &&
    value.expiresAtMs > 0
  ) {
    expiresAtMs =
      value.expiresAtMs;
  } else {
    return null;
  }

  return {
    type:
      'USSD_PROMPT',

    message:
      value.message.trim(),

    expiresAtMs,
  };
}

function getApiMessage(
  response:
    DepositApiResponse,

  fallback:
    string,
): string {
  return (
    typeof response.message ===
      'string' &&
    response.message.trim()
      ? response.message
      : fallback
  );
}

function getRailOptions(
  asset:
    DepositAsset,
): Array<{
  value:
    DepositRail;

  label:
    string;
}> {
  if (
    asset ===
      'TZS'
  ) {
    return [
      {
        value:
          'MOBILE_MONEY',

        label:
          'Mobile Money',
      },
      {
        value:
          'BANK',

        label:
          'Bank',
      },
    ];
  }

  if (
    asset ===
      'USD'
  ) {
    return [
      {
        value:
          'BANK',

        label:
          'Bank',
      },
    ];
  }

  return [
    {
      value:
        'BLOCKCHAIN',

      label:
        'Blockchain',
    },
  ];
}

function getProviderOptions(
  asset:
    DepositAsset,

  rail:
    DepositRail,
): ProviderOption[] {
  if (
    asset ===
      'TZS' &&
    rail ===
      'MOBILE_MONEY'
  ) {
    return MOBILE_MONEY_PROVIDERS;
  }

  if (
    asset ===
      'TZS' &&
    rail ===
      'BANK'
  ) {
    return BANK_PROVIDERS;
  }

  if (
    asset ===
      'USD'
  ) {
    return USD_BANK_PROVIDERS;
  }

  return PI_PROVIDERS;
}

function getInitialRail(
  asset:
    DepositAsset,
): DepositRail {
  if (
    asset ===
      'TZS'
  ) {
    return 'MOBILE_MONEY';
  }

  if (
    asset ===
      'USD'
  ) {
    return 'BANK';
  }

  return 'BLOCKCHAIN';
}

function getInitialProvider(
  asset:
    DepositAsset,

  rail:
    DepositRail,
): string {
  return (
    getProviderOptions(
      asset,
      rail,
    )[0]?.value ??
    ''
  );
}

export default function DepositPage() {
  const [
    user,
    setUser,
  ] =
    useState<User | null>(
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
    asset,
    setAsset,
  ] =
    useState<DepositAsset>(
      'TZS',
    );

  const [
    rail,
    setRail,
  ] =
    useState<DepositRail>(
      'MOBILE_MONEY',
    );

  const [
    providerCode,
    setProviderCode,
  ] =
    useState(
      'MPESA',
    );

  const [
    amount,
    setAmount,
  ] =
    useState(
      '',
    );

  const [
    statusMessage,
    setStatusMessage,
  ] =
    useState(
      '',
    );

  const [
    processing,
    setProcessing,
  ] =
    useState(
      false,
    );

  const [
    depositResult,
    setDepositResult,
  ] =
    useState<
      DepositResult | null
    >(
      null,
    );

  const [
    paymentInstruction,
    setPaymentInstruction,
  ] =
    useState<
      PaymentInstruction | null
    >(
      null,
    );

  const operationIdRef =
    useRef<string>(
      createOperationId(),
    );

  useEffect(
    () => {
      if (
        !firebaseAuth
      ) {
        setUser(
          null,
        );

        setLoading(
          false,
        );

        return;
      }

      return onAuthStateChanged(
        firebaseAuth,
        (
          currentUser,
        ) => {
          setUser(
            currentUser,
          );

          setLoading(
            false,
          );
        },
      );
    },
    [],
  );

  function beginNewOperation():
    void {
    operationIdRef.current =
      createOperationId();

    setDepositResult(
      null,
    );

    setPaymentInstruction(
      null,
    );

    setStatusMessage(
      '',
    );
  }

  function handleAssetChange(
    nextAsset:
      DepositAsset,
  ): void {
    const nextRail =
      getInitialRail(
        nextAsset,
      );

    setAsset(
      nextAsset,
    );

    setRail(
      nextRail,
    );

    setProviderCode(
      getInitialProvider(
        nextAsset,
        nextRail,
      ),
    );

    beginNewOperation();
  }

  function handleRailChange(
    nextRail:
      DepositRail,
  ): void {
    setRail(
      nextRail,
    );

    setProviderCode(
      getInitialProvider(
        asset,
        nextRail,
      ),
    );

    beginNewOperation();
  }

  async function handleDeposit(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (
      !user
    ) {
      setStatusMessage(
        'Tafadhali ingia kwenye akaunti yako kwanza.',
      );

      return;
    }

    const normalizedAmount =
      amount.trim();

    if (
      !/^\d+(?:\.\d+)?$/.test(
        normalizedAmount,
      ) ||
      Number(
        normalizedAmount,
      ) <= 0
    ) {
      setStatusMessage(
        'Tafadhali andika kiasi sahihi kinachozidi sifuri.',
      );

      return;
    }

    if (
      !providerCode
    ) {
      setStatusMessage(
        'Tafadhali chagua mtoa huduma.',
      );

      return;
    }

    setProcessing(
      true,
    );

    setDepositResult(
      null,
    );

    setPaymentInstruction(
      null,
    );

    setStatusMessage(
      'Inatengeneza ombi salama la deposit...',
    );

    try {
      const idToken =
        await user.getIdToken();

      const response =
        await fetch(
          '/api/deposit',
          {
            method:
              'POST',

            headers: {
              Authorization:
                `Bearer ${idToken}`,

              'Content-Type':
                'application/json',
            },

            cache:
              'no-store',

            body:
              JSON.stringify({
                asset,
                rail,
                providerCode,

                amount:
                  normalizedAmount,

                operationId:
                  operationIdRef.current,
              }),
          },
        );

      let responseBody:
        DepositApiResponse = {};

      try {
        const parsed:
          unknown =
            await response.json();

        if (
          isPlainObject(
            parsed,
          )
        ) {
          responseBody =
            parsed;
        }
      } catch {
        responseBody = {};
      }

      if (
        !response.ok ||
        responseBody.ok !==
          true
      ) {
        throw new Error(
          getApiMessage(
            responseBody,
            'Imeshindikana kutengeneza ombi la deposit.',
          ),
        );
      }

      const result =
        parseDepositResult(
          responseBody.deposit,
        );

      if (
        !result
      ) {
        throw new Error(
          'Jibu la deposit kutoka server si sahihi.',
        );
      }

      const instruction =
        responseBody.paymentInstructions ===
          null
          ? null
          : parsePaymentInstruction(
              responseBody
                .paymentInstructions,
            );

      if (
        responseBody.paymentInstructions !==
          null &&
        !instruction
      ) {
        throw new Error(
          'Maelekezo ya malipo kutoka server si sahihi.',
        );
      }

      setDepositResult(
        result,
      );

      setPaymentInstruction(
        instruction,
      );

      setStatusMessage(
        instruction
          ? 'Ombi la M-Pesa limeanzishwa. Fuata maelekezo yaliyoonyeshwa hapa chini.'
          : 'Ombi limepokelewa. Usitume fedha bado; maelekezo rasmi ya provider hayajatolewa.',
      );
    } catch (
      error
    ) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Hitilafu imetokea wakati wa kuandaa deposit.',
      );
    } finally {
      setProcessing(
        false,
      );
    }
  }

  const railOptions =
    getRailOptions(
      asset,
    );

  const providerOptions =
    getProviderOptions(
      asset,
      rail,
    );

  if (
    loading
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="animate-pulse text-xl font-bold">
          Inapakia usalama wa deposit...
        </p>
      </div>
    );
  }

  if (
    !user
  ) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
        <h1 className="mb-4 text-3xl font-black text-emerald-400">
          Ukurasa Umelindwa
        </h1>

        <p className="mb-6 max-w-md text-gray-400">
          Tafadhali ingia kwanza ili kuomba deposit salama.
        </p>

        <Link
          href="/login"
          className="rounded-xl bg-amber-300 px-6 py-3 font-bold text-slate-900 shadow-lg transition hover:bg-amber-200"
        >
          Kuingia (Login)
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] p-6 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_25%)]" />

      <div className="relative z-10 mx-auto max-w-lg pt-10">
        <Link
          href="/wallet"
          className="mb-6 inline-block text-sm text-amber-300 transition hover:text-amber-200"
        >
          ← Rudi Kwenye Pochi
        </Link>

        <h1 className="mb-3 bg-gradient-to-r from-emerald-200 to-white bg-clip-text text-3xl font-black text-transparent">
          Deposit Salama
        </h1>

        <p className="mb-8 text-sm leading-6 text-slate-400">
          Tengeneza ombi la deposit. Salio litaongezwa tu baada ya uthibitisho wa provider kupitia server.
        </p>

        <form
          onSubmit={
            handleDeposit
          }
          className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-md"
        >
          {statusMessage ? (
            <div
              role="status"
              className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm font-semibold text-amber-200"
            >
              {statusMessage}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="deposit-asset"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              Sarafu
            </label>

            <select
              id="deposit-asset"
              value={
                asset
              }
              disabled={
                processing
              }
              onChange={(
                event,
              ) =>
                handleAssetChange(
                  event.target.value as
                    DepositAsset,
                )
              }
              className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white outline-none transition focus:border-emerald-500 disabled:opacity-60"
            >
              <option value="TZS">
                Tanzanian Shilling (TZS)
              </option>

              <option value="USD">
                US Dollar (USD)
              </option>

              <option value="PI">
                Pi Network (PI)
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="deposit-rail"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              Njia ya malipo
            </label>

            <select
              id="deposit-rail"
              value={
                rail
              }
              disabled={
                processing
              }
              onChange={(
                event,
              ) =>
                handleRailChange(
                  event.target.value as
                    DepositRail,
                )
              }
              className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white outline-none transition focus:border-emerald-500 disabled:opacity-60"
            >
              {railOptions.map(
                (
                  option,
                ) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="deposit-provider"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              Mtoa huduma
            </label>

            <select
              id="deposit-provider"
              value={
                providerCode
              }
              disabled={
                processing
              }
              onChange={(
                event,
              ) => {
                setProviderCode(
                  event.target.value,
                );

                beginNewOperation();
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white outline-none transition focus:border-emerald-500 disabled:opacity-60"
            >
              {providerOptions.map(
                (
                  option,
                ) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="deposit-amount"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              Kiasi
            </label>

            <input
              id="deposit-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={
                amount
              }
              disabled={
                processing
              }
              placeholder="0.00"
              maxLength={
                64
              }
              onChange={(
                event,
              ) => {
                setAmount(
                  event.target.value,
                );

                beginNewOperation();
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white outline-none transition focus:border-emerald-500 disabled:opacity-60"
            />
          </div>

          <div className="rounded-xl border border-red-300/20 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
            Usitume fedha kwa UID, QR code au anwani yoyote ambayo haijatolewa na provider rasmi. Ombi hili pekee halimaanishi malipo yamepokelewa.
          </div>

          <button
            type="submit"
            disabled={
              processing
            }
            className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 py-4 font-bold text-white shadow-lg transition hover:from-emerald-500 hover:to-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {
              processing
                ? 'Inatengeneza ombi...'
                : 'Tengeneza Ombi la Deposit'
            }
          </button>
        </form>

        {depositResult ? (
          <section className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-6">
            <h2 className="mb-4 text-lg font-black text-emerald-200">
              Ombi Limepokelewa
            </h2>

            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-400">
                  Request ID
                </dt>

                <dd className="break-all font-mono text-xs text-white">
                  {
                    depositResult
                      .requestId
                  }
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">
                  Kiasi
                </dt>

                <dd className="font-semibold text-white">
                  {
                    depositResult
                      .amount
                  }{' '}
                  {
                    depositResult
                      .asset
                  }
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">
                  Provider
                </dt>

                <dd className="font-semibold text-white">
                  {
                    depositResult
                      .providerCode
                  }
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">
                  Hali
                </dt>

                <dd className="font-semibold text-amber-200">
                  {
                    paymentInstruction
                      ? 'Provider ameanzishwa; inasubiri callback'
                      : 'Inasubiri kuanzishwa kwa provider'
                  }
                </dd>
              </div>
            </dl>

            {paymentInstruction ? (
              <div className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                  Maelekezo ya M-Pesa Sandbox
                </p>

                <p className="text-sm font-semibold leading-6 text-white">
                  {
                    paymentInstruction
                      .message
                  }
                </p>

                <p className="mt-3 text-xs leading-5 text-slate-400">
                  Hili ni jaribio la sandbox. Hakuna fedha halisi zinazohamishwa, na salio halitaongezwa mpaka callback salama ya provider ithibitishwe.
                </p>
              </div>
            ) : (
              <p className="mt-5 rounded-xl bg-slate-950/50 p-4 text-sm leading-6 text-amber-100">
                Hakuna maelekezo ya malipo yaliyotolewa bado na hakuna salio lililoongezwa.
              </p>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}