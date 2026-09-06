'use client';

import {
  useState,
} from 'react';

import {
  startRegistration,
} from '@simplewebauthn/browser';

type OptionsResponse = {
  ok: boolean;
  options?: Parameters<
    typeof startRegistration
  >[0]['optionsJSON'];
  message?: string;
};

type VerifyResponse = {
  ok: boolean;
  verified?: boolean;
  deviceId?: string;
  deviceType?: string;
  backedUp?: boolean;
  message?: string;
};

export default function RecoveryRegisterDevicePage() {
  const [busy, setBusy] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [message, setMessage] =
    useState('');

  async function registerDevice() {
    if (busy) {
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      /*
       * STEP 1:
       * Request a server-generated,
       * short-lived WebAuthn challenge.
       */
      const optionsResponse =
        await fetch(
          '/api/admin/recovery/device/options',
          {
            method: 'POST',
            credentials: 'include',
            cache: 'no-store',
          }
        );

      const optionsData =
        (await optionsResponse.json()) as OptionsResponse;

      if (
        !optionsResponse.ok ||
        !optionsData.ok ||
        !optionsData.options
      ) {
        throw new Error(
          optionsData.message ||
            'Unable to start device registration.'
        );
      }

      /*
       * STEP 2:
       * Windows Hello / platform
       * authenticator performs WebAuthn
       * registration locally.
       *
       * The private key never leaves
       * the authenticator.
       */
      const registrationResponse =
        await startRegistration({
          optionsJSON:
            optionsData.options,
        });

      /*
       * STEP 3:
       * Server verifies the WebAuthn
       * response and consumes the
       * recovery authorization.
       */
      const verifyResponse =
        await fetch(
          '/api/admin/recovery/device/verify',
          {
            method: 'POST',
            credentials: 'include',
            cache: 'no-store',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              response:
                registrationResponse,

              label:
                'Recovered Admin Device',
            }),
          }
        );

      const verifyData =
        (await verifyResponse.json()) as VerifyResponse;

      if (
        !verifyResponse.ok ||
        !verifyData.ok ||
        !verifyData.verified
      ) {
        throw new Error(
          verifyData.message ||
            'Device registration failed.'
        );
      }

      setSuccess(true);

      setMessage(
        'Replacement Trusted Admin Device registered successfully.'
      );
    } catch (error) {
      setSuccess(false);

      setMessage(
        error instanceof Error
          ? error.message
          : 'Device registration failed.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <section className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
          PHCL Super Admin Security
        </p>

        <h1 className="mt-3 text-3xl font-bold text-white">
          Register Replacement Device
        </h1>

        <p className="mt-4 leading-7 text-slate-300">
          Register this computer as a
          replacement Trusted Admin Device
          using Windows Hello or another
          supported platform authenticator.
        </p>

        <div className="mt-6 rounded-xl border border-amber-300/30 bg-slate-950 p-4 text-sm leading-6 text-amber-100">
          This page requires a valid,
          short-lived Emergency Recovery
          authorization. The authorization
          will be consumed after successful
          device registration.
        </div>

        {message && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-white/15 bg-slate-950 p-4 text-sm text-white"
          >
            {success
              ? '✓ '
              : ''}
            {message}
          </div>
        )}

        {!success && (
          <button
            type="button"
            onClick={registerDevice}
            disabled={busy}
            className="mt-6 w-full rounded-xl bg-amber-400 px-6 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? 'Registering Trusted Device...'
              : 'Register This Trusted Device'}
          </button>
        )}

        {success && (
          <div className="mt-6 rounded-xl border border-emerald-400/30 p-4 text-sm leading-6 text-white">
            Recovery authorization has been
            consumed. This recovery session
            cannot be reused.
          </div>
        )}
      </section>
    </main>
  );
}