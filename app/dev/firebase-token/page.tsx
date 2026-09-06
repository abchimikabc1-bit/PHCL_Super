'use client';

import {
  useState,
} from 'react';

import {
  auth,
} from '@/src/lib/auth';

/**
 * PHCL Super — LOCAL DEVELOPMENT ONLY
 *
 * Temporary helper for copying the currently signed-in customer's
 * fresh Firebase ID token directly to the clipboard.
 *
 * SECURITY:
 * - Never renders the token.
 * - Never logs the token.
 * - Refuses to operate outside development mode.
 * - Delete this page after local checkout API testing is complete.
 */
export default function FirebaseTokenDevPage() {
  const [
    status,
    setStatus,
  ] = useState<
    | 'idle'
    | 'working'
    | 'copied'
    | 'signed-out'
    | 'error'
    | 'disabled'
  >('idle');

  async function copyFreshToken() {
    if (
      process.env.NODE_ENV !==
      'development'
    ) {
      setStatus(
        'disabled',
      );

      return;
    }

    setStatus(
      'working',
    );

    try {
      const user =
        auth?.currentUser;

      if (
        !user
      ) {
        setStatus(
          'signed-out',
        );

        return;
      }

      const token =
        await user.getIdToken(
          true,
        );

      if (
        !token
      ) {
        setStatus(
          'error',
        );

        return;
      }

      await navigator.clipboard.writeText(
        token,
      );

      setStatus(
        'copied',
      );
    } catch {
      setStatus(
        'error',
      );
    }
  }

  if (
    process.env.NODE_ENV !==
    'development'
  ) {
    return (
      <main
        style={{
          maxWidth:
            720,
          margin:
            '64px auto',
          padding:
            24,
          fontFamily:
            'system-ui, sans-serif',
        }}
      >
        <h1>
          Developer utility unavailable
        </h1>

        <p>
          This page is disabled outside local development.
        </p>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth:
          720,
        margin:
          '64px auto',
        padding:
          24,
        fontFamily:
          'system-ui, sans-serif',
      }}
    >
      <h1>
        PHCL Super — Firebase Test Token
      </h1>

      <p>
        Local development helper only.
        The Firebase ID token is copied
        directly to your clipboard and
        is never displayed on this page.
      </p>

      <button
        type="button"
        onClick={
          copyFreshToken
        }
        disabled={
          status ===
          'working'
        }
        style={{
          padding:
            '12px 18px',
          cursor:
            status ===
            'working'
              ? 'wait'
              : 'pointer',
        }}
      >
        {status ===
        'working'
          ? 'Refreshing token...'
          : 'Copy fresh Firebase token'}
      </button>

      <div
        role="status"
        aria-live="polite"
        style={{
          marginTop:
            20,
        }}
      >
        {status ===
          'idle' &&
          'Sign in as a normal PHCL customer, then click the button.'}

        {status ===
          'copied' &&
          'Fresh token copied securely to clipboard.'}

        {status ===
          'signed-out' &&
          'No signed-in Firebase customer was found in this browser session.'}

        {status ===
          'error' &&
          'Could not obtain or copy the Firebase token.'}

        {status ===
          'disabled' &&
          'This utility is disabled outside development mode.'}
      </div>

      <p
        style={{
          marginTop:
            28,
        }}
      >
        Delete this temporary page after
        checkout API testing is finished.
      </p>
    </main>
  );
}
