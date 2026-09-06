'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  startRegistration,
} from '@simplewebauthn/browser';

type OptionsResponse = {
  ok: boolean;
  options?: Parameters<
    typeof startRegistration
  >[0]['optionsJSON'];
  code?: string;
  message?: string;
};

type VerifyResponse = {
  ok: boolean;
  verified?: boolean;
  deviceId?: string;
  deviceType?: string;
  backedUp?: boolean;
  code?: string;
  message?: string;
};

export default function TrustedDeviceEnrollmentPage() {
  const router = useRouter();

  const [isRegistering, setIsRegistering] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [registered, setRegistered] =
    useState(false);

  async function registerDevice() {
    if (isRegistering) {
      return;
    }

    setIsRegistering(true);
    setMessage('');

    try {
      const optionsResponse = await fetch(
        '/api/admin/device/register/options',
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
            'Unable to start trusted-device registration.'
        );
      }

      const registrationResponse =
        await startRegistration({
          optionsJSON: optionsData.options,
        });

      const verifyResponse = await fetch(
        '/api/admin/device/register/verify',
        {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            response: registrationResponse,
            label: 'Primary Admin Device',
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

      setRegistered(true);
      setMessage(
        'Trusted Admin Device #1 registered successfully.'
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Trusted-device registration failed.';

      setMessage(errorMessage);
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
          Trusted Admin Device
        </h1>

        <p className="mt-4 leading-7 text-slate-300">
          Register this computer as the primary trusted
          Admin device using WebAuthn / Windows Hello.
          Your private authentication key remains with
          your authenticator and is not stored by PHCL.
        </p>

        <div className="mt-6 rounded-2xl border border-amber-300/20 bg-slate-950/70 p-5">
          <p className="font-semibold text-white">
            Trusted Admin Device #1
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Complete the Windows security prompt when it
            appears. Do not register a device that is not
            under your control.
          </p>
        </div>

        {message && (
          <div
            className="mt-5 rounded-xl border border-white/15 bg-slate-950 p-4 text-sm text-white"
            role="status"
          >
            {message}
          </div>
        )}

        {!registered ? (
          <button
            type="button"
            onClick={registerDevice}
            disabled={isRegistering}
            className="mt-6 rounded-xl bg-amber-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRegistering
              ? 'Registering...'
              : 'Register This Admin Device'}
          </button>
        ) : (
          <div className="mt-6">
            <p className="font-semibold text-emerald-300">
              ✓ Primary trusted device registered.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push('/admin/dashboard')
              }
              className="mt-4 rounded-xl border border-amber-300 px-6 py-3 font-semibold text-amber-300 transition hover:bg-amber-300/10"
            >
              Return to Admin Dashboard
            </button>
          </div>
        )}
      </section>
    </main>
  );
}