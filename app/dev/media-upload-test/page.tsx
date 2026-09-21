'use client';

import {
  useEffect,
  useState,
  type ChangeEvent,
} from 'react';

import {
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

import {
  firebaseAuth,
} from '@/lib/firebase-client';

import {
  executeMediaClientUpload,
  type MediaClientUploadResult,
} from '@/lib/media-client-upload';

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
      status: 'uploading';
      message: string;
    }
  | {
      status: 'success';
      message: string;
      result: MediaClientUploadResult;
    }
  | {
      status: 'error';
      message: string;
    };

export default function MediaUploadTestPage() {
  const [user, setUser] =
    useState<User | null>(null);

  const [authChecked, setAuthChecked] =
    useState(false);

  const [file, setFile] =
    useState<File | null>(null);

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
                'Firebase user authenticated. Select an MP4 file for the media pipeline test.',
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

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile =
      event.target.files?.[0] ??
      null;

    setFile(selectedFile);

    if (!selectedFile) {
      setState({
        status: 'ready',
        message:
          'Select an MP4 file for the media pipeline test.',
      });

      return;
    }

    if (
      selectedFile.type !==
        'video/mp4' ||
      selectedFile.size <= 0 ||
      selectedFile.size >
        524_288_000
    ) {
      setState({
        status: 'error',
        message:
          'Select a valid MP4 file no larger than 500 MiB.',
      });

      return;
    }

    setState({
      status: 'ready',
      message:
        'MP4 selected. Ready to run the authenticated media upload pipeline.',
    });
  }

  async function runMediaUploadTest() {
    if (
      process.env.NODE_ENV !==
      'development'
    ) {
      return;
    }

    if (
      !firebaseAuth ||
      !user
    ) {
      setState({
        status: 'error',
        message:
          'Authenticated Firebase user is required.',
      });

      return;
    }

    if (!file) {
      setState({
        status: 'error',
        message:
          'Select an MP4 file before starting the upload.',
      });

      return;
    }

    setState({
      status: 'uploading',
      message:
        'Running authenticated media upload pipeline...',
    });

    try {
      /*
       * SECURITY:
       *
       * The Firebase ID token remains
       * inside the browser runtime.
       *
       * It is supplied only through the
       * existing media upload executor
       * and must never be printed or
       * displayed by this test page.
       */
      const result =
        await executeMediaClientUpload({
          file,

          getIdToken:
            () =>
              user.getIdToken(
                true,
              ),
        });

      setState({
        status: 'success',
        message:
          'Media upload finalized successfully and entered VALIDATING.',
        result,
      });
    } catch {
      setState({
        status: 'error',
        message:
          'Media upload pipeline failed. Inspect the server and browser diagnostics without exposing authentication tokens or upload session credentials.',
      });
    }
  }

  if (
    process.env.NODE_ENV !==
    'development'
  ) {
    return null;
  }

  const fileIsValid =
    Boolean(
      file &&
        file.type ===
          'video/mp4' &&
        file.size > 0 &&
        file.size <=
          524_288_000,
    );

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
        PHCL Super — Media Upload Test
      </h1>

      <p>
        Development-only authenticated
        end-to-end media pipeline test.
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
          Accepted media:
        </strong>{' '}

        MP4 only, maximum 500 MiB.
      </p>

      <input
        type="file"
        accept="video/mp4"
        onChange={
          handleFileChange
        }
        disabled={
          !user ||
          state.status ===
            'uploading'
        }
      />

      {file && (
        <p>
          <strong>
            Selected file:
          </strong>{' '}

          {file.name}
          {' — '}
          {file.size} bytes
        </p>
      )}

      <button
        type="button"
        onClick={
          runMediaUploadTest
        }
        disabled={
          !user ||
          !fileIsValid ||
          state.status ===
            'uploading'
        }
        style={{
          display: 'block',
          marginTop: 20,
          padding:
            '12px 18px',
          cursor:
            user &&
            fileIsValid &&
            state.status !==
              'uploading'
              ? 'pointer'
              : 'not-allowed',
        }}
      >
        {state.status ===
        'uploading'
          ? 'Uploading...'
          : 'Run Media Upload Test'}
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

      {state.status ===
        'success' && (
        <>
          <h2>
            Pipeline Result
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
              state.result,
              null,
              2,
            )}
          </pre>
        </>
      )}
    </main>
  );
}