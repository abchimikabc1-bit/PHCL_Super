'use client';

import {
  FormEvent,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

type RecoveryVerifyResponse = {
  ok: boolean;
  recoveryAuthorized?: boolean;
  expiresAtMs?: number;
  message?: string;
};

export default function AdminRecoverPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [recoveryCode, setRecoveryCode] =
    useState('');

  const [submitting, setSubmitting] =
    useState(false);

  const [message, setMessage] =
    useState('');

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const cleanEmail =
      email.trim().toLowerCase();

    const cleanCode =
      recoveryCode.trim();

    if (
      !cleanEmail ||
      !password ||
      !cleanCode
    ) {
      setMessage(
        'Admin email, password, and recovery code are required.'
      );
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const response = await fetch(
        '/api/admin/recovery/verify',
        {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            email: cleanEmail,
            password,
            recoveryCode: cleanCode,
          }),
        }
      );

      const data =
        (await response.json()) as RecoveryVerifyResponse;

      if (
        !response.ok ||
        !data.ok ||
        !data.recoveryAuthorized
      ) {
        throw new Error(
          data.message ||
            'Recovery verification failed.'
        );
      }

      /*
       * Remove sensitive recovery credentials
       * from component state immediately after
       * successful verification.
       */
      setPassword('');
      setRecoveryCode('');

      router.replace(
        '/admin/recover/register-device'
      );
    } catch (error) {
      /*
       * Never retain password or one-time
       * recovery code after a failed attempt.
       */
      setPassword('');
      setRecoveryCode('');

      setMessage(
        error instanceof Error
          ? error.message
          : 'Recovery verification failed.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <section className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
          PHCL Super Admin Security
        </p>

        <h1 className="mt-3 text-3xl font-bold text-white">
          Emergency Admin Recovery
        </h1>

        <p className="mt-4 leading-7 text-slate-300">
          Use this recovery process only when
          your primary Trusted Admin Device is
          unavailable. Verification requires
          your Admin email, Admin password, and
          a one-time recovery code.
        </p>

        <div className="mt-6 rounded-xl border border-amber-300/30 bg-slate-950 p-4 text-sm leading-6 text-amber-100">
          Successful verification creates a
          short-lived recovery authorization.
          It does not by itself grant normal
          Admin access. The recovery code can
          be used only once.
        </div>

        {message && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-white/15 bg-slate-950 p-4 text-sm text-white"
          >
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-5"
        >
          <div>
            <label
              htmlFor="admin-recovery-email"
              className="mb-2 block text-sm font-semibold text-white"
            >
              Admin Email
            </label>

            <input
              id="admin-recovery-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-300"
            />
          </div>

          <div>
            <label
              htmlFor="admin-recovery-password"
              className="mb-2 block text-sm font-semibold text-white"
            >
              Admin Password
            </label>

            <input
              id="admin-recovery-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-300"
            />
          </div>

          <div>
            <label
              htmlFor="admin-recovery-code"
              className="mb-2 block text-sm font-semibold text-white"
            >
              One-Time Recovery Code
            </label>

            <input
              id="admin-recovery-code"
              type="password"
              autoComplete="off"
              spellCheck={false}
              required
              value={recoveryCode}
              onChange={(event) =>
                setRecoveryCode(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 font-mono text-white outline-none focus:border-amber-300"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-amber-400 px-6 py-3 font-bold text-slate-950 disabled:opacity-60"
          >
            {submitting
              ? 'Verifying Recovery...'
              : 'Verify Recovery Access'}
          </button>
        </form>
      </section>
    </main>
  );
}
