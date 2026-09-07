'use client';

import {
  useState,
} from 'react';

import {
  startAuthentication,
} from '@simplewebauthn/browser';

type AuthenticationOptions =
  Parameters<
    typeof startAuthentication
  >[0]['optionsJSON'];

type OptionsResponse = {
  ok?: boolean;
  code?: string;
  options?: AuthenticationOptions;
  message?: string;
};

type VerifyResponse = {
  ok?: boolean;
  code?: string;
  verified?: boolean;
  message?: string;
};

const GENERIC_ERROR_MESSAGE =
  'Uthibitishaji wa kifaa umeshindikana. Tafadhali jaribu tena.';

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null
  );
}

async function readJsonResponse<T>(
  response: Response
): Promise<T | null> {
  const contentType =
    response.headers.get(
      'content-type'
    ) || '';

  if (
    !contentType
      .toLowerCase()
      .includes(
        'application/json'
      )
  ) {
    return null;
  }

  try {
    const value: unknown =
      await response.json();

    return isRecord(value)
      ? (value as T)
      : null;
  } catch {
    return null;
  }
}

function getWebAuthnErrorMessage(
  error: unknown
): string {
  if (
    error instanceof DOMException
  ) {
    if (
      error.name ===
      'NotAllowedError'
    ) {
      return (
        'Windows Hello haikukamilishwa, ' +
        'ilikataliwa au muda uliisha. ' +
        'Jaribu tena na ukamilishe ombi linapoonekana.'
      );
    }

    if (
      error.name ===
      'InvalidStateError'
    ) {
      return (
        'Kifaa hiki hakipo katika hali sahihi ya uthibitishaji. ' +
        'Huenda kikahitaji kusajiliwa upya.'
      );
    }

    if (
      error.name ===
      'SecurityError'
    ) {
      return (
        'Browser imezuia uthibitishaji wa kifaa kwa sababu ya ' +
        'domain au usanidi wa usalama.'
      );
    }

    if (
      error.name ===
      'AbortError'
    ) {
      return (
        'Uthibitishaji wa kifaa umesitishwa. Tafadhali jaribu tena.'
      );
    }
  }

  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return GENERIC_ERROR_MESSAGE;
}

export default function VerifyTrustedDevicePage() {
  const [
    isVerifying,
    setIsVerifying,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState('');

  const [
    verified,
    setVerified,
  ] = useState(false);

  async function verifyDevice():
    Promise<void> {
    if (isVerifying) {
      return;
    }

    setIsVerifying(true);
    setVerified(false);
    setMessage('');

    try {
      const optionsResponse =
        await fetch(
          '/api/admin/device/authenticate/options',
          {
            method: 'POST',
            credentials: 'include',
            cache: 'no-store',
            headers: {
              Accept:
                'application/json',
            },
          }
        );

      const optionsData =
        await readJsonResponse<
          OptionsResponse
        >(
          optionsResponse
        );

      if (
        !optionsResponse.ok ||
        optionsData?.ok !== true ||
        !optionsData.options
      ) {
        if (
          optionsResponse.status ===
          401
        ) {
          throw new Error(
            'Admin session haijathibitishwa. Ingia upya kwanza.'
          );
        }

        if (
          optionsResponse.status ===
          429
        ) {
          throw new Error(
            'Majaribio yamezidi. Subiri kidogo kabla ya kujaribu tena.'
          );
        }

        throw new Error(
          optionsData?.message ||
            'Imeshindikana kuanzisha uthibitishaji wa kifaa.'
        );
      }

      const authenticationResponse =
        await startAuthentication({
          optionsJSON:
            optionsData.options,
        });

      const verifyResponse =
        await fetch(
          '/api/admin/device/authenticate/verify',
          {
            method: 'POST',
            credentials: 'include',
            cache: 'no-store',
            headers: {
              Accept:
                'application/json',
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              response:
                authenticationResponse,
            }),
          }
        );

      const verifyData =
        await readJsonResponse<
          VerifyResponse
        >(
          verifyResponse
        );

      if (
        !verifyResponse.ok ||
        verifyData?.ok !== true ||
        verifyData.verified !== true
      ) {
        if (
          verifyResponse.status ===
          401
        ) {
          throw new Error(
            'Admin session imekwisha au haijathibitishwa. Ingia upya.'
          );
        }

        if (
          verifyResponse.status ===
          429
        ) {
          throw new Error(
            'Majaribio yamezidi. Subiri kidogo kabla ya kujaribu tena.'
          );
        }

        throw new Error(
          verifyData?.message ||
            'Kifaa hakikuweza kuthibitishwa.'
        );
      }

      setVerified(true);

      setMessage(
        'Kifaa salama cha Admin kimethibitishwa. Dashboard inafunguliwa...'
      );

      /*
       * Use a full navigation so the
       * protected server layout receives
       * the newly issued HttpOnly trusted
       * device cookie immediately.
       */
      window.location.replace(
        '/admin/dashboard'
      );
    } catch (error) {
      setVerified(false);

      setMessage(
        getWebAuthnErrorMessage(
          error
        )
      );
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <section className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
          PHCL Super Admin Security
        </p>

        <h1 className="mt-3 text-3xl font-bold text-white">
          Thibitisha Kifaa Salama
        </h1>

        <p className="mt-4 leading-7 text-slate-300">
          Thibitisha kuwa hiki ndicho kifaa
          kilichosajiliwa kwa Admin wa PHCL
          Super kwa kutumia Windows Hello
          au WebAuthn.
        </p>

        {message && (
          <div
            className={
              verified
                ? 'mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200'
                : 'mt-6 rounded-xl border border-amber-500/30 bg-slate-950 p-4 text-sm text-white'
            }
            role={
              verified
                ? 'status'
                : 'alert'
            }
            aria-live="polite"
          >
            {message}
          </div>
        )}

        {!verified ? (
          <button
            type="button"
            onClick={() => {
              void verifyDevice();
            }}
            disabled={isVerifying}
            aria-busy={isVerifying}
            className="mt-6 rounded-xl bg-amber-400 px-6 py-3 font-bold text-slate-950 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isVerifying
              ? 'Inathibitisha...'
              : 'Thibitisha Kifaa Hiki'}
          </button>
        ) : (
          <p className="mt-6 font-semibold text-emerald-300">
            ✓ Kifaa cha Admin
            kimethibitishwa.
          </p>
        )}
      </section>
    </main>
  );
}