'use client';

import {
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import {
  startAuthentication,
} from '@simplewebauthn/browser';

type OptionsResponse = {
  ok: boolean;
  options?: Parameters<
    typeof startAuthentication
  >[0]['optionsJSON'];
  message?: string;
};

type VerifyResponse = {
  ok: boolean;
  verified?: boolean;
  message?: string;
};

export default function VerifyTrustedDevicePage() {
  const router =
    useRouter();

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

  async function verifyDevice() {
    if (isVerifying) {
      return;
    }

    setIsVerifying(true);
    setMessage('');

    try {
      const optionsResponse =
        await fetch(
          '/api/admin/device/authenticate/options',
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
            'Unable to start device verification.'
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
        (await verifyResponse.json()) as VerifyResponse;

      if (
        !verifyResponse.ok ||
        !verifyData.ok ||
        !verifyData.verified
      ) {
        throw new Error(
          verifyData.message ||
            'Trusted-device verification failed.'
        );
      }

      setVerified(true);

      setMessage(
        'Trusted Admin Device verified successfully. Opening dashboard...'
      );

      /*
       * The verify API has now set the trusted-device
       * HttpOnly cookie.
       *
       * Refresh the server-component state first, then
       * navigate into the protected Admin route group.
       */
      router.refresh();
      router.replace(
        '/admin/dashboard'
      );
    } catch (error) {
      setVerified(false);

      setMessage(
        error instanceof Error
          ? error.message
          : 'Trusted-device verification failed.'
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
          Verify Trusted Device
        </h1>

        <p className="mt-4 leading-7 text-slate-300">
          Confirm that this is the registered
          PHCL Super Admin device using
          Windows Hello / WebAuthn.
        </p>

        {message && (
          <div
            className="mt-6 rounded-xl border border-white/15 bg-slate-950 p-4 text-sm text-white"
            role="status"
          >
            {message}
          </div>
        )}

        {!verified ? (
          <button
            type="button"
            onClick={
              verifyDevice
            }
            disabled={
              isVerifying
            }
            className="mt-6 rounded-xl bg-amber-400 px-6 py-3 font-bold text-slate-950 disabled:opacity-60"
          >
            {isVerifying
              ? 'Verifying...'
              : 'Verify This Trusted Device'}
          </button>
        ) : (
          <p className="mt-6 font-semibold text-emerald-300">
            ✓ Trusted Admin Device verified. Opening dashboard...
          </p>
        )}
      </section>
    </main>
  );
}