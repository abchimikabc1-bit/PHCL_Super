'use client';

import {
  useEffect,
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

type TransferAsset =
  | 'USD'
  | 'TZS'
  | 'NTZS'
  | 'PI';

type TransferApiResponse = {
  ok?: boolean;

  code?: string;

  message?: string;

  transfer?: {
    operationId: string;

    asset: TransferAsset;

    amount: string;

    status: 'COMPLETED';

    idempotent: boolean;
  };
};

const TRANSFER_ASSETS: Array<{
  value: TransferAsset;

  label: string;
}> = [
  {
    value: 'PI',
    label: 'Pi Network (PI)',
  },
  {
    value: 'TZS',
    label: 'Tanzania Shilling (TZS)',
  },
  {
    value: 'NTZS',
    label: 'Digital Shilling (NTZS)',
  },
  {
    value: 'USD',
    label: 'US Dollar (USD)',
  },
];

function getSafeTransferMessage(
  code: string | undefined,
  fallback:
    string | undefined,
): string {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 'Tafadhali ingia tena kwenye akaunti yako.';

    case 'INVALID_REQUEST':
    case 'INVALID_TRANSFER':
      return 'Taarifa za muamala si sahihi. Kagua mpokeaji, sarafu na kiasi.';

    case 'SELF_TRANSFER_NOT_ALLOWED':
      return 'Huwezi kujitumia fedha kwenye akaunti hiyo hiyo.';

    case 'RECIPIENT_NOT_AVAILABLE':
      return 'Akaunti ya mpokeaji haipatikani au hairuhusiwi kupokea fedha.';

    case 'EMAIL_VERIFICATION_REQUIRED':
      return 'Thibitisha barua pepe yako kabla ya kufanya muamala.';

    case 'PHONE_VERIFICATION_REQUIRED':
      return 'Thibitisha namba yako ya simu kabla ya kufanya muamala.';

    case 'ACCOUNT_RESTRICTED':
      return 'Akaunti yako hairuhusiwi kufanya muamala huu kwa sasa.';

    case 'KYC_REQUIRED':
      return 'Uthibitishaji wa KYC ulioidhinishwa unahitajika.';

    case 'KYS_REQUIRED':
      return 'Uthibitishaji wa KYS ulioidhinishwa unahitajika.';

    case 'KYB_REQUIRED':
      return 'Uthibitishaji wa KYB ulioidhinishwa unahitajika.';

    case 'STRONG_AUTHENTICATION_REQUIRED':
      return 'Uthibitishaji imara wa akaunti unahitajika kabla ya kutuma fedha.';

    case 'INSUFFICIENT_FUNDS':
      return 'Salio halitoshi kukamilisha muamala huu.';

    case 'TRANSFER_CONFLICT':
      return 'Muamala huu una mgongano wa kumbukumbu. Anzisha ombi jipya.';
        case 'TRANSFER_RATE_LIMITED':
      return 'Majaribio ya kutuma fedha yamezidi. Subiri muda ulioelekezwa kabla ya kujaribu tena.';
    case 'TRANSFER_SECURITY_UNAVAILABLE':
      return 'Mfumo wa usalama wa miamala haupatikani kwa muda. Hakuna fedha zilizohamishwa.';
    case 'TRANSFER_FAILED':
      return 'Muamala haujakamilika. Hakuna uthibitisho wa fedha kuhamishwa.';

    default:
      return (
        fallback ||
        'Imeshindikana kukamilisha muamala.'
      );
  }
}

function createClientOperationId():
  string {
  if (
    typeof globalThis.crypto
      ?.randomUUID !==
    'function'
  ) {
    throw new Error(
      'Kivinjari hiki hakiwezi kutengeneza kitambulisho salama cha muamala.',
    );
  }

  return globalThis.crypto
    .randomUUID();
}

export default function TransferPage() {
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
    useState(true);

  const [
    recipientEmail,
    setRecipientEmail,
  ] =
    useState('');

  const [
    amount,
    setAmount,
  ] =
    useState('');

  const [
    asset,
    setAsset,
  ] =
    useState<TransferAsset>(
      'PI',
    );
  const [
    statusMessage,
    setStatusMessage,
  ] =
    useState('');

  const [
    statusType,
    setStatusType,
  ] =
    useState<
      'idle' |
      'success' |
      'error'
    >('idle');

  const [
    processing,
    setProcessing,
  ] =
    useState(false);

  const [
    pendingOperationId,
    setPendingOperationId,
  ] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    if (!firebaseAuth) {
      setUser(null);
      setLoading(false);

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

          setLoading(false);
        },
      );

    return unsubscribe;
  }, []);

  function resetPendingOperation() {
    setPendingOperationId(
      null,
    );

    setStatusMessage('');

    setStatusType(
      'idle',
    );
  }

  async function handleTransfer(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      processing
    ) {
      return;
    }

    if (!user) {
      setStatusType(
        'error',
      );

      setStatusMessage(
        'Tafadhali ingia kwenye akaunti yako.',
      );

      return;
    }

    const cleanRecipientEmail =
      recipientEmail
        .trim()
        .toLowerCase();

    const cleanAmount =
      amount.trim();

    if (
      !cleanRecipientEmail ||
      !cleanAmount
    ) {
      setStatusType(
        'error',
      );

      setStatusMessage(
        'Jaza barua pepe ya mpokeaji na kiasi.',
      );

      return;
    }

    if (
      !/^\d+(?:\.\d+)?$/.test(
        cleanAmount,
      ) ||
      Number(
        cleanAmount,
      ) <= 0
    ) {
      setStatusType(
        'error',
      );

      setStatusMessage(
        'Weka kiasi sahihi kinachozidi sifuri.',
      );

      return;
    }

    setProcessing(true);

    setStatusType(
      'idle',
    );

    setStatusMessage(
      'Inathibitisha na kuchakata muamala kwa usalama...',
    );

    let operationId =
      pendingOperationId;

    try {
      if (!operationId) {
        operationId =
          createClientOperationId();

        setPendingOperationId(
          operationId,
        );
      }

      const idToken =
        await user.getIdToken(
          true,
        );

      const response =
        await fetch(
          '/api/transfer',
          {
            method:
              'POST',

            credentials:
              'same-origin',

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
                recipientEmail:
                  cleanRecipientEmail,

                asset,

                amount:
                  cleanAmount,

                operationId,
              }),
          },
        );

      const data =
        (
          await response
            .json()
            .catch(
              () => null,
            )
        ) as
          TransferApiResponse |
          null;

      if (
        !response.ok ||
        !data?.ok ||
        !data.transfer
      ) {
        throw {
          transferFailure:
            true,

          code:
            data?.code,

          message:
            data?.message,
        };
      }

      setStatusType(
        'success',
      );

      setStatusMessage(
        `Muamala umekamilika: ${data.transfer.amount} ${data.transfer.asset}.`,
      );

      setAmount('');

      setRecipientEmail('');

      setPendingOperationId(
        null,
      );
    } catch (
      error
    ) {
      const transferError =
        (
          typeof error ===
            'object' &&
          error !== null &&
          'transferFailure' in
            error
        )
          ? (
              error as {
                code?:
                  string;

                message?:
                  string;
              }
            )
          : null;

      setStatusType(
        'error',
      );

      setStatusMessage(
        transferError
          ? getSafeTransferMessage(
              transferError.code,
              transferError.message,
            )
          : 'Mtandao au uthibitishaji umeshindwa. Unaweza kujaribu tena bila kuunda muamala wa pili.',
      );
    } finally {
      setProcessing(
        false,
      );
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <p
          className="text-lg font-bold text-amber-300"
          role="status"
        >
          Inahakiki akaunti yako...
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-white">
        <h1 className="mb-4 text-3xl font-black text-red-400">
          Uhamisho Umelindwa
        </h1>

        <p className="mb-6 max-w-md text-center text-slate-400">
          Ingia kwenye akaunti yako ili
          kuanzisha muamala salama.
        </p>

        <Link
          href="/login"
          className="rounded-xl bg-amber-300 px-6 py-3 font-bold text-slate-950 hover:bg-amber-200"
        >
          Ingia kwenye Akaunti
        </Link>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] p-6 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.05),transparent_22%)]" />

      <div className="relative z-10 mx-auto max-w-md pt-10">
        <Link
          href="/wallet"
          className="mb-6 inline-block text-sm text-amber-300 hover:text-amber-200"
        >
          ← Rudi Kwenye Pochi
        </Link>

        <h1 className="mb-3 bg-gradient-to-r from-red-200 to-white bg-clip-text text-3xl font-black text-transparent">
          Tuma Fedha
        </h1>

        <p className="mb-8 text-sm leading-6 text-slate-400">
          Muamala unathibitishwa na
          server, verification policy na
          authoritative financial ledger.
        </p>

        <form
          onSubmit={
            handleTransfer
          }
          className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-md"
        >
          {statusMessage && (
            <div
              role="status"
              aria-live="polite"
              className={
                statusType ===
                'success'
                  ? 'rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-200'
                  : statusType ===
                      'error'
                    ? 'rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-semibold text-red-200'
                    : 'rounded-xl border border-amber-300/30 bg-amber-400/10 p-4 text-sm font-semibold text-amber-200'
              }
            >
              {statusMessage}
            </div>
          )}

          <div>
            <label
              htmlFor="recipientEmail"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Barua Pepe ya Mpokeaji
            </label>

            <input
              id="recipientEmail"
              name="recipientEmail"
              type="email"
              inputMode="email"
              autoComplete="off"
              required
              maxLength={320}
              value={
                recipientEmail
              }
              onChange={(
                event,
              ) => {
                setRecipientEmail(
                  event.target.value,
                );

                resetPendingOperation();
              }}
              placeholder="mpokeaji@example.com"
              disabled={
                processing
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white outline-none transition focus:border-red-400 disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="amount"
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Kiasi
              </label>

              <input
                id="amount"
                name="amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                required
                maxLength={64}
                value={
                  amount
                }
                onChange={(
                  event,
                ) => {
                  setAmount(
                    event.target.value,
                  );

                  resetPendingOperation();
                }}
                placeholder="0.00"
                disabled={
                  processing
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white outline-none transition focus:border-red-400 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="asset"
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Sarafu
              </label>

              <select
                id="asset"
                name="asset"
                value={
                  asset
                }
                onChange={(
                  event,
                ) => {
                  setAsset(
                    event.target
                      .value as
                        TransferAsset,
                  );

                  resetPendingOperation();
                }}
                disabled={
                  processing
                }
                className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white outline-none transition focus:border-red-400 disabled:opacity-60"
              >
                {TRANSFER_ASSETS.map(
                  (
                    transferAsset,
                  ) => (
                    <option
                      key={
                        transferAsset.value
                      }
                      value={
                        transferAsset.value
                      }
                    >
                      {
                        transferAsset.label
                      }
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-amber-300/20 bg-slate-950/60 p-4 text-xs leading-5 text-slate-400">
            Hakikisha barua pepe,
            sarafu na kiasi ni sahihi.
            Muamala uliokamilika
            utaandikwa kwenye ledger
            isiyobadilishwa.
          </div>

          <button
            type="submit"
            disabled={
              processing
            }
            className="w-full rounded-xl bg-gradient-to-r from-red-600 to-red-700 py-4 font-bold text-white shadow-lg transition hover:from-red-500 hover:to-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing
              ? 'Inachakata...'
              : 'Thibitisha na Utume'}
          </button>
        </form>
      </div>
    </main>
  );
}