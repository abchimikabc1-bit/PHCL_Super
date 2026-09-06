'use client';

import {
  useEffect,
  useState,
} from 'react';

import {
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

import {
  firebaseAuth,
} from '@/lib/firebase-client';

type TestState =
  | {
      status: 'waiting';
      message: string;
    }
  | {
      status: 'ready';
      message: string;
    }
  | {
      status: 'loading';
      message: string;
    }
  | {
      status: 'success';
      message: string;
      response: unknown;
    }
  | {
      status: 'error';
      message: string;
      response?: unknown;
    };

export default function PaymentQuoteTestPage() {
  const [user, setUser] =
    useState<User | null>(null);

  const [authChecked, setAuthChecked] =
    useState(false);

  const [state, setState] =
    useState<TestState>({
      status: 'waiting',
      message:
        'Checking Firebase authentication...',
    });

  useEffect(() => {
    if (
      process.env.NODE_ENV !==
      'development'
    ) {
      setState({
        status: 'error',
        message:
          'This test page is available only in development.',
      });

      return;
    }

    if (!firebaseAuth) {
      setAuthChecked(true);

      setState({
        status: 'error',
        message:
          'Firebase client configuration is unavailable.',
      });

      return;
    }

    const unsubscribe =
      onAuthStateChanged(
        firebaseAuth,
        (currentUser) => {
          setUser(currentUser);
          setAuthChecked(true);

          if (currentUser) {
            setState({
              status: 'ready',
              message:
                'Firebase user authenticated. Ready to request secure payment quote.',
            });
          } else {
            setState({
              status: 'error',
              message:
                'No signed-in Firebase user found. Sign in to PHCL Super first.',
            });
          }
        },
        () => {
          setAuthChecked(true);

          setState({
            status: 'error',
            message:
              'Unable to read Firebase authentication state.',
          });
        },
      );

    return unsubscribe;
  }, []);

  async function runQuoteTest() {
    if (
      process.env.NODE_ENV !==
      'development'
    ) {
      return;
    }

    if (!firebaseAuth || !user) {
      setState({
        status: 'error',
        message:
          'Authenticated Firebase user is required.',
      });

      return;
    }

    setState({
      status: 'loading',
      message:
        'Creating authenticated server payment quote...',
    });

    try {
      /*
       * SECURITY:
       *
       * Token stays inside the browser
       * runtime and is sent only to the
       * local PHCL API.
       *
       * Never print or display it.
       */
      const idToken =
        await user.getIdToken(true);

      const response =
        await fetch(
          '/api/payment/quote',
          {
            method: 'POST',

            headers: {
              Authorization:
                `Bearer ${idToken}`,

              'Content-Type':
                'application/json',
            },

            cache: 'no-store',

            body: JSON.stringify({
              items: [
                {
                  productId: 17,
                  quantity: 2,
                },
              ],

              paymentAsset:
                'TZS',
            }),
          },
        );

      let body: unknown = null;

      try {
        body =
          await response.json();
      } catch {
        body = {
          error:
            'Response was not valid JSON.',
        };
      }

      if (!response.ok) {
        setState({
          status: 'error',

          message:
            `Quote request failed with HTTP ${response.status}.`,

          response: body,
        });

        return;
      }

      setState({
        status: 'success',

        message:
          `Authenticated payment quote passed with HTTP ${response.status}.`,

        response: body,
      });
    } catch {
      setState({
        status: 'error',

        message:
          'Unexpected error while creating payment quote.',
      });
    }
  }

  if (
    process.env.NODE_ENV !==
    'development'
  ) {
    return null;
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: '40px auto',
        padding: 24,
        fontFamily:
          'Arial, sans-serif',
      }}
    >
      <h1>
        PHCL Super — Payment Quote Test
      </h1>

      <p>
        Development-only authenticated
        financial API test.
      </p>

      <hr />

      <p>
        <strong>
          Authentication:
        </strong>{' '}

        {!authChecked
          ? 'Checking...'
          : user
            ? 'SIGNED IN ✅'
            : 'NOT SIGNED IN ❌'}
      </p>

      {user && (
        <p>
          <strong>
            Firebase UID:
          </strong>{' '}

          {user.uid}
        </p>
      )}

      <p>
        <strong>
          Test:
        </strong>{' '}

        Product ID 17 × 2 → TZS
      </p>

      <button
        type="button"
        onClick={runQuoteTest}
        disabled={
          !user ||
          state.status ===
            'loading'
        }
        style={{
          padding:
            '12px 18px',
          cursor:
            user
              ? 'pointer'
              : 'not-allowed',
        }}
      >
        {state.status ===
        'loading'
          ? 'Testing...'
          : 'Run Secure Quote Test'}
      </button>

      <h2>Status</h2>

      <pre
        style={{
          whiteSpace: 'pre-wrap',
          wordBreak:
            'break-word',
          padding: 16,
          border:
            '1px solid #ccc',
          borderRadius: 8,
        }}
      >
        {state.message}
      </pre>

      {'response' in state &&
        state.response !==
          undefined && (
          <>
            <h2>
              Server Response
            </h2>

            <pre
              style={{
                whiteSpace:
                  'pre-wrap',
                wordBreak:
                  'break-word',
                padding: 16,
                border:
                  '1px solid #ccc',
                borderRadius: 8,
              }}
            >
              {JSON.stringify(
                state.response,
                null,
                2,
              )}
            </pre>
          </>
        )}
    </main>
  );
}