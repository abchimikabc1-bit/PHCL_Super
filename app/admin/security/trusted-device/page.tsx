'use client';

import {
  useState,
} from 'react';

import {
  startRegistration,
} from '@simplewebauthn/browser';

type RegistrationOptions =
  Parameters<
    typeof startRegistration
  >[0]['optionsJSON'];

type OptionsResponse = {
  ok?: boolean;
  options?:
    RegistrationOptions;
  code?: string;
  message?: string;
};

type VerifyResponse = {
  ok?: boolean;
  verified?: boolean;
  deviceId?: string;
  deviceType?: string;
  backedUp?: boolean;
  code?: string;
  message?: string;
};

const GENERIC_ERROR_MESSAGE =
  'Usajili wa kifaa salama umeshindikana. Tafadhali jaribu tena.';

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
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

function getRegistrationErrorMessage(
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
        'Authenticator hii tayari ina taarifa zinazohusiana na usajili huu. ' +
        'Tumia recovery ikiwa kifaa cha zamani kinahitaji kubadilishwa.'
      );
    }

    if (
      error.name ===
      'SecurityError'
    ) {
      return (
        'Browser imezuia usajili kwa sababu ya domain au usanidi wa WebAuthn.'
      );
    }

    if (
      error.name ===
      'AbortError'
    ) {
      return (
        'Usajili wa kifaa umesitishwa. Tafadhali jaribu tena.'
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

export default function TrustedDeviceEnrollmentPage() {
  const [
    isRegistering,
    setIsRegistering,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState('');

  const [
    registered,
    setRegistered,
  ] = useState(false);

  async function registerDevice():
    Promise<void> {
    if (isRegistering) {
      return;
    }

    setIsRegistering(true);
    setRegistered(false);
    setMessage('');

    try {
      const optionsResponse =
        await fetch(
          '/api/admin/device/register/options',
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
          409 ||
          optionsData?.code ===
            'TRUSTED_DEVICE_ALREADY_EXISTS'
        ) {
          throw new Error(
            'Kifaa cha Admin tayari kimesajiliwa. Endelea kwenye uthibitishaji wa kifaa.'
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
            'Imeshindikana kuanzisha usajili wa kifaa.'
        );
      }

      const registrationResponse =
        await startRegistration({
          optionsJSON:
            optionsData.options,
        });

      const verifyResponse =
        await fetch(
          '/api/admin/device/register/verify',
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
                registrationResponse,
              label:
                'Primary Admin Device',
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
          409 ||
          verifyData?.code ===
            'TRUSTED_DEVICE_ALREADY_EXISTS'
        ) {
          throw new Error(
            'Kifaa cha Admin tayari kimesajiliwa. Endelea kwenye uthibitishaji wa kifaa.'
          );
        }

        throw new Error(
          verifyData?.message ||
            'Usajili wa kifaa salama haukukamilika.'
        );
      }

      setRegistered(true);

      setMessage(
        'Kifaa cha msingi cha Admin kimesajiliwa. Sasa kinaelekezwa kwenye uthibitishaji wa Windows Hello...'
      );

      /*
       * Registration stores the public
       * credential but does not issue a
       * trusted-device session cookie.
       *
       * The newly registered credential
       * must therefore be authenticated
       * before Dashboard access.
       */
      window.location.replace(
        '/admin/security/verify-device'
      );
    } catch (error) {
      setRegistered(false);

      setMessage(
        getRegistrationErrorMessage(
          error
        )
      );
    } finally {
      setIsRegistering(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <section className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
          PHCL Super Admin Security
        </p>

        <h1 className="mt-3 text-3xl font-bold text-white">
          Sajili Kifaa Salama cha Admin
        </h1>

        <p className="mt-4 leading-7 text-slate-300">
          Sajili kompyuta hii kama kifaa
          cha msingi cha Admin kwa kutumia
          Windows Hello na WebAuthn.
          Private key yako inabaki ndani
          ya authenticator na haihifadhiwi
          na PHCL.
        </p>

        <div className="mt-6 rounded-2xl border border-amber-300/20 bg-slate-950/70 p-5">
          <p className="font-semibold text-white">
            Kifaa cha Admin #1
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Kamilisha ombi la Windows
            Security linapoonekana.
            Usisajili kompyuta ambayo
            haipo chini ya udhibiti wako.
          </p>
        </div>

        {message && (
          <div
            className={
              registered
                ? 'mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200'
                : 'mt-5 rounded-xl border border-amber-500/30 bg-slate-950 p-4 text-sm text-white'
            }
            role={
              registered
                ? 'status'
                : 'alert'
            }
            aria-live="polite"
          >
            {message}
          </div>
        )}

        {!registered ? (
          <button
            type="button"
            onClick={() => {
              void registerDevice();
            }}
            disabled={isRegistering}
            aria-busy={isRegistering}
            className="mt-6 rounded-xl bg-amber-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-amber-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRegistering
              ? 'Inasajili...'
              : 'Sajili Kifaa Hiki'}
          </button>
        ) : (
          <p className="mt-6 font-semibold text-emerald-300">
            ✓ Kifaa cha msingi
            kimesajiliwa.
          </p>
        )}
      </section>
    </main>
  );
}