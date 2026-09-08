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

type WithdrawalAsset =
  | 'USD'
  | 'TZS'
  | 'PI';

type WithdrawalRail =
  | 'BANK'
  | 'MOBILE_MONEY'
  | 'BLOCKCHAIN';

type MessageType =
  | 'info'
  | 'success'
  | 'error';

type WithdrawalApiResponse = {
  ok?: boolean;

  code?: string;

  message?: string;

  withdrawal?: {
    requestId?: string;

    operationId?: string;

    asset?: WithdrawalAsset;

    rail?: WithdrawalRail;

    providerCode?: string;

    amount?: string;

    destination?: string;

    status?: string;

    idempotent?: boolean;

    expiresAt?: string;
  };
};

type ProviderOption = {
  value: string;

  label: string;
};

const BANK_PROVIDERS:
  ProviderOption[] = [
  {
    value: 'CRDB',
    label: 'CRDB Bank',
  },
  {
    value: 'NMB',
    label: 'NMB Bank',
  },
  {
    value: 'NBC',
    label: 'NBC Bank',
  },
  {
    value: 'EXIM',
    label: 'Exim Bank',
  },
  {
    value: 'OTHER_BANK',
    label: 'Benki nyingine',
  },
];

const MOBILE_MONEY_PROVIDERS:
  ProviderOption[] = [
  {
    value: 'MPESA',
    label: 'M-Pesa',
  },
  {
    value: 'AIRTEL_MONEY',
    label: 'Airtel Money',
  },
  {
    value: 'MIXX_BY_YAS',
    label: 'Mixx by Yas',
  },
  {
    value: 'HALOPESA',
    label: 'HaloPesa',
  },
];

const BLOCKCHAIN_PROVIDERS:
  ProviderOption[] = [
  {
    value: 'PI_NETWORK',
    label: 'Pi Network',
  },
];

function getDefaultRail(
  asset: WithdrawalAsset,
): WithdrawalRail {
  switch (asset) {
    case 'TZS':
      return 'MOBILE_MONEY';

    case 'USD':
      return 'BANK';

    case 'PI':
      return 'BLOCKCHAIN';
  }
}

function getProviderOptions(
  rail: WithdrawalRail,
): ProviderOption[] {
  switch (rail) {
    case 'BANK':
      return BANK_PROVIDERS;

    case 'MOBILE_MONEY':
      return MOBILE_MONEY_PROVIDERS;

    case 'BLOCKCHAIN':
      return BLOCKCHAIN_PROVIDERS;
  }
}

function createOperationId():
  string {
  if (
    typeof crypto !==
      'undefined' &&
    typeof crypto.randomUUID ===
      'function'
  ) {
    return `withdraw:${crypto.randomUUID()}`;
  }

  const bytes =
    new Uint8Array(
      24,
    );

  crypto.getRandomValues(
    bytes,
  );

  const randomValue =
    Array.from(
      bytes,
      (value) =>
        value
          .toString(16)
          .padStart(
            2,
            '0',
          ),
    ).join('');

  return `withdraw:${randomValue}`;
}

function isPlainObject(
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

async function readJsonResponse(
  response: Response,
): Promise<WithdrawalApiResponse> {
  try {
    const value:
      unknown =
      await response.json();

    return isPlainObject(
      value,
    )
      ? (
          value as
            WithdrawalApiResponse
        )
      : {};
  } catch {
    return {};
  }
}

function getSafeErrorMessage(
  code:
    | string
    | undefined,
): string {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 'Muda wa kuingia umeisha. Tafadhali ingia tena.';

    case 'EMAIL_VERIFICATION_REQUIRED':
      return 'Thibitisha barua pepe yako kabla ya kuomba kutoa fedha.';

    case 'PHONE_VERIFICATION_REQUIRED':
      return 'Thibitisha namba yako ya simu kabla ya kuomba kutoa fedha.';

    case 'ACCOUNT_RESTRICTED':
      return 'Akaunti yako hairuhusiwi kufanya withdrawal kwa sasa.';

    case 'KYC_REQUIRED':
      return 'Uthibitishaji wa KYC uliokubaliwa unahitajika.';

    case 'KYS_REQUIRED':
      return 'Uthibitishaji wa KYS uliokubaliwa unahitajika.';

    case 'KYB_REQUIRED':
      return 'Uthibitishaji wa KYB uliokubaliwa unahitajika.';

    case 'STRONG_AUTHENTICATION_REQUIRED':
      return 'Washa uthibitishaji imara wa 2FA/passkey kabla ya withdrawal.';

    case 'INSUFFICIENT_FUNDS':
      return 'Salio lako halitoshi kwa ombi hili.';

    case 'WITHDRAWAL_RATE_LIMITED':
      return 'Majaribio ya withdrawal yamezidi. Subiri kabla ya kujaribu tena.';

    case 'WITHDRAWAL_SECURITY_UNAVAILABLE':
      return 'Mfumo wa usalama wa withdrawal haupatikani kwa muda. Hakuna fedha zilizotolewa.';

    case 'WITHDRAWAL_ROUTE_NOT_SUPPORTED':
      return 'Njia hii ya kutoa fedha bado haijawezeshwa.';

    case 'INVALID_REQUEST':
    case 'INVALID_WITHDRAWAL':
      return 'Taarifa za withdrawal si sahihi. Zikague kisha ujaribu tena.';

    case 'WITHDRAWAL_CONFLICT':
      return 'Namba hii ya operesheni imetumika kwa ombi tofauti.';

    default:
      return 'Ombi la withdrawal halikuweza kuwasilishwa. Hakuna fedha zilizotolewa.';
  }
}

function getDestinationLabel(
  rail: WithdrawalRail,
): string {
  switch (rail) {
    case 'BANK':
      return 'Namba ya Akaunti ya Benki';

    case 'MOBILE_MONEY':
      return 'Namba ya Simu ya Mobile Money';

    case 'BLOCKCHAIN':
      return 'Anwani ya Wallet ya Pi Network';
  }
}

function getDestinationPlaceholder(
  rail: WithdrawalRail,
): string {
  switch (rail) {
    case 'BANK':
      return 'Weka namba ya akaunti';

    case 'MOBILE_MONEY':
      return 'Mfano: +2557XXXXXXXX';

    case 'BLOCKCHAIN':
      return 'Weka anwani ya wallet';
  }
}

export default function WithdrawPage() {
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
    amount,
    setAmount,
  ] =
    useState(
      '',
    );

  const [
    asset,
    setAsset,
  ] =
    useState<WithdrawalAsset>(
      'TZS',
    );

  const [
    rail,
    setRail,
  ] =
    useState<WithdrawalRail>(
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
    destination,
    setDestination,
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
    messageType,
    setMessageType,
  ] =
    useState<MessageType>(
      'info',
    );

  const [
    processing,
    setProcessing,
  ] =
    useState(
      false,
    );

  const operationIdRef =
    useRef<string | null>(
      null,
    );

  useEffect(
    () => {
      if (!firebaseAuth) {
        setUser(
          null,
        );

        setLoading(
          false,
        );

        return;
      }

      const unsubscribe =
        onAuthStateChanged(
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

      return () => {
        unsubscribe();
      };
    },
    [],
  );

  function resetOperationId() {
    operationIdRef.current =
      null;

    if (
      messageType !==
      'success'
    ) {
      setStatusMessage(
        '',
      );
    }
  }

  function handleAssetChange(
    nextAsset:
      WithdrawalAsset,
  ) {
    const nextRail =
      getDefaultRail(
        nextAsset,
      );

    const providers =
      getProviderOptions(
        nextRail,
      );

    setAsset(
      nextAsset,
    );

    setRail(
      nextRail,
    );

    setProviderCode(
      providers[0]?.value ??
        '',
    );

    setDestination(
      '',
    );

    resetOperationId();
  }

  function handleRailChange(
    nextRail:
      WithdrawalRail,
  ) {
    const providers =
      getProviderOptions(
        nextRail,
      );

    setRail(
      nextRail,
    );

    setProviderCode(
      providers[0]?.value ??
        '',
    );

    setDestination(
      '',
    );

    resetOperationId();
  }

  async function handleWithdraw(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !user ||
      processing
    ) {
      return;
    }

    const cleanAmount =
      amount.trim();

    const cleanDestination =
      destination.trim();

    if (
      !/^\d+(?:\.\d+)?$/.test(
        cleanAmount,
      ) ||
      !/[1-9]/.test(
        cleanAmount,
      )
    ) {
      setMessageType(
        'error',
      );

      setStatusMessage(
        'Andika kiasi sahihi kikubwa kuliko sifuri.',
      );

      return;
    }

    if (
      cleanDestination.length <
      4
    ) {
      setMessageType(
        'error',
      );

      setStatusMessage(
        'Weka taarifa sahihi za sehemu fedha zitakapotumwa.',
      );

      return;
    }

    if (!providerCode) {
      setMessageType(
        'error',
      );

      setStatusMessage(
        'Chagua mtoa huduma wa withdrawal.',
      );

      return;
    }

    setProcessing(
      true,
    );

    setMessageType(
      'info',
    );

    setStatusMessage(
      'Ombi linahakikiwa kwa usalama...',
    );

    try {
      const idToken =
        await user.getIdToken();

      const operationId =
        operationIdRef.current ??
        createOperationId();

      operationIdRef.current =
        operationId;

      const response =
        await fetch(
          '/api/withdraw',
          {
            method:
              'POST',

            credentials:
              'include',

            cache:
              'no-store',

            headers: {
              Authorization:
                `Bearer ${idToken}`,

              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                asset,

                rail,

                providerCode,

                destination:
                  cleanDestination,

                amount:
                  cleanAmount,

                operationId,
              }),
          },
        );

      const data =
        await readJsonResponse(
          response,
        );

      if (
        !response.ok ||
        !data.ok ||
        !data.withdrawal
      ) {
        throw {
          code:
            data.code,
        };
      }

      const maskedDestination =
        data.withdrawal
          .destination ??
        '••••';

      setMessageType(
        'success',
      );

      setStatusMessage(
        `Ombi limepokelewa kwa ukaguzi salama. Kiasi: ${cleanAmount} ${asset}; destination: ${maskedDestination}. Hii si taarifa ya payout kukamilika.`,
      );

      setAmount(
        '',
      );

      setDestination(
        '',
      );

      operationIdRef.current =
        null;
    } catch (error) {
      const code =
        isPlainObject(
          error,
        ) &&
        typeof error.code ===
          'string'
          ? error.code
          : undefined;

      setMessageType(
        'error',
      );

      setStatusMessage(
        getSafeErrorMessage(
          code,
        ),
      );
    } finally {
      setProcessing(
        false,
      );
    }
  }

  const providerOptions =
    getProviderOptions(
      rail,
    );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <p className="animate-pulse text-xl font-bold">
          Inapakia usalama wa withdrawal… 🔐
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-white">
        <h1 className="mb-4 text-center text-3xl font-black text-purple-400">
          Ukurasa Umelindwa
        </h1>

        <p className="mb-6 max-w-md text-center text-slate-400">
          Tafadhali ingia kwenye akaunti yako ili kuwasilisha ombi la kutoa fedha.
        </p>

        <Link
          href="/login"
          className="rounded-xl bg-amber-300 px-6 py-3 font-bold text-slate-900 shadow-lg hover:bg-amber-200"
        >
          Ingia Kwenye Akaunti
        </Link>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] p-6 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(167,139,250,0.08),transparent_28%)]" />

      <section className="relative z-10 mx-auto max-w-md pt-10">
        <Link
          href="/wallet"
          className="mb-6 inline-block text-sm text-amber-300 hover:text-amber-200"
        >
          ← Rudi Kwenye Wallet
        </Link>

        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
          PHCL Financial Security
        </p>

        <h1 className="mb-3 mt-2 bg-gradient-to-r from-purple-200 to-white bg-clip-text text-3xl font-black text-transparent">
          Ombi la Kutoa Fedha
        </h1>

        <p className="mb-7 text-sm leading-6 text-slate-400">
          Ombi litahakikiwa na server. Kutumwa kwa ombi hakumaanishi kuwa payout imekamilika.
        </p>

        <form
          onSubmit={
            handleWithdraw
          }
          className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-md"
        >
          {statusMessage && (
            <div
              role={
                messageType ===
                  'error'
                  ? 'alert'
                  : 'status'
              }
              className={
                messageType ===
                'success'
                  ? 'rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-200'
                  : messageType ===
                      'error'
                    ? 'rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-200'
                    : 'rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm font-semibold text-amber-200'
              }
            >
              {statusMessage}
            </div>
          )}

          <div>
            <label
              htmlFor="withdrawal-asset"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Sarafu
            </label>

            <select
              id="withdrawal-asset"
              value={
                asset
              }
              disabled={
                processing
              }
              onChange={(
                event,
              ) => {
                handleAssetChange(
                  event.target
                    .value as
                    WithdrawalAsset,
                );
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white outline-none transition focus:border-purple-500"
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

            <p className="mt-2 text-[11px] text-slate-500">
              nTZS, USDT na BTC hazijawezeshwa kwa external withdrawal.
            </p>
          </div>

          {asset ===
            'TZS' && (
            <div>
              <label
                htmlFor="withdrawal-rail"
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Njia ya Kupokea
              </label>

              <select
                id="withdrawal-rail"
                value={
                  rail
                }
                disabled={
                  processing
                }
                onChange={(
                  event,
                ) => {
                  handleRailChange(
                    event.target
                      .value as
                      WithdrawalRail,
                  );
                }}
                className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white outline-none transition focus:border-purple-500"
              >
                <option value="MOBILE_MONEY">
                  Mobile Money
                </option>

                <option value="BANK">
                  Akaunti ya Benki
                </option>
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="withdrawal-provider"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Mtoa Huduma
            </label>

            <select
              id="withdrawal-provider"
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
                  event.target
                    .value,
                );

                resetOperationId();
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white outline-none transition focus:border-purple-500"
            >
              {providerOptions.map(
                (
                  provider,
                ) => (
                  <option
                    key={
                      provider.value
                    }
                    value={
                      provider.value
                    }
                  >
                    {provider.label}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="withdrawal-destination"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              {getDestinationLabel(
                rail,
              )}
            </label>

            <input
              id="withdrawal-destination"
              type="text"
              autoComplete="off"
              maxLength={
                200
              }
              required
              value={
                destination
              }
              disabled={
                processing
              }
              onChange={(
                event,
              ) => {
                setDestination(
                  event.target
                    .value,
                );

                resetOperationId();
              }}
              placeholder={getDestinationPlaceholder(
                rail,
              )}
              className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white outline-none transition placeholder:text-slate-600 focus:border-purple-500"
            />

            <p className="mt-2 text-[11px] text-slate-500">
              Destination ita-encryptiwa kabla ya kuhifadhiwa.
            </p>
          </div>

          <div>
            <label
              htmlFor="withdrawal-amount"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Kiasi cha Kutoa
            </label>

            <input
              id="withdrawal-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              maxLength={
                64
              }
              required
              value={
                amount
              }
              disabled={
                processing
              }
              onChange={(
                event,
              ) => {
                setAmount(
                  event.target
                    .value,
                );

                resetOperationId();
              }}
              placeholder="0.00"
              className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white outline-none transition placeholder:text-slate-600 focus:border-purple-500"
            />
          </div>

          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs leading-5 text-amber-100/80">
            Salio halitabadilishwa na browser. Settlement itahitaji uthibitisho wa server na payout provider.
          </div>

          <button
            type="submit"
            disabled={
              processing
            }
            className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 py-4 font-bold text-white shadow-lg transition hover:from-purple-500 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing
              ? 'Inahakiki Ombi…'
              : 'Wasilisha Ombi la Withdrawal'}
          </button>
        </form>
      </section>
    </main>
  );
}