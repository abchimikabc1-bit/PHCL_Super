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

import {
  createMediaPlaybackClientSession,
  type MediaPlaybackClientSession,
} from '@/lib/media-playback-client';

type TestState =
  | {
      status: 'waiting' | 'ready' | 'loading';
      message: string;
    }
  | {
      status: 'success';
      message: string;
      session: MediaPlaybackClientSession;
    }
  | {
      status: 'error';
      message: string;
    };

export default function MediaPlaybackTestPage() {
  const [user, setUser] =
    useState<User | null>(null);

  const [authChecked, setAuthChecked] =
    useState(false);

  const [mediaId, setMediaId] =
    useState('');

  const [selectedMp4, setSelectedMp4] =
    useState('');

  const [hlsResult, setHlsResult] =
    useState('Not tested.');

  const [rangeResult, setRangeResult] =
    useState('Not tested.');

  const [state, setState] =
    useState<TestState>({
      status:
        'waiting',
      message:
        'Checking Firebase authentication...',
    });

  useEffect(() => {
    if (
      process.env.NODE_ENV !==
      'development'
    ) {
      setState({
        status:
          'error',
        message:
          'This test page is available only in development.',
      });

      return;
    }

    if (!firebaseAuth) {
      setAuthChecked(true);
      setState({
        status:
          'error',
        message:
          'Firebase client configuration is unavailable.',
      });

      return;
    }

    return onAuthStateChanged(
      firebaseAuth,
      (currentUser) => {
        setUser(currentUser);
        setAuthChecked(true);
        setState(
          currentUser
            ? {
                status:
                  'ready',
                message:
                  'Firebase user authenticated. Enter a READY media ID.',
              }
            : {
                status:
                  'error',
                message:
                  'No signed-in Firebase user found. Sign in to PHCL Super first.',
              }
        );
      },
      () => {
        setAuthChecked(true);
        setState({
          status:
            'error',
          message:
            'Unable to read Firebase authentication state.',
        });
      }
    );
  }, []);

  async function startPlaybackTest() {
    if (
      process.env.NODE_ENV !==
        'development' ||
      !user
    ) {
      return;
    }

    setState({
      status:
        'loading',
      message:
        'Creating authenticated playback session...',
    });
    setHlsResult(
      'Not tested.'
    );
    setRangeResult(
      'Not tested.'
    );

    try {
      const session =
        await createMediaPlaybackClientSession({
          mediaId,
          getIdToken:
            () =>
              user.getIdToken(
                true
              ),
        });

      setSelectedMp4(
        session.mp4Urls[1]
      );
      setState({
        status:
          'success',
        message:
          'Private playback session created successfully.',
        session,
      });
    } catch {
      setState({
        status:
          'error',
        message:
          'Unable to create playback session. Confirm the media is READY and belongs to the signed-in user.',
      });
    }
  }

  async function testHlsManifest(
    session: MediaPlaybackClientSession
  ) {
    try {
      const masterResponse =
        await fetch(
          session.masterManifestUrl,
          {
            credentials:
              'same-origin',
            cache:
              'no-store',
          }
        );

      const masterText =
        await masterResponse.text();

      const renditionName =
        masterText
          .split(/\r?\n/)
          .map(
            (line) =>
              line.trim()
          )
          .find(
            (line) =>
              line.length > 0 &&
              !line.startsWith('#')
          );

      if (
        !masterResponse.ok ||
        !masterText.startsWith(
          '#EXTM3U'
        ) ||
        !renditionName ||
        !/^hls-(?:1080p|720p|480p)\.m3u8$/.test(
          renditionName
        )
      ) {
        throw new Error(
          'INVALID_HLS_MASTER'
        );
      }

      const renditionResponse =
        await fetch(
          `/api/media/playback/object/${renditionName}`,
          {
            credentials:
              'same-origin',
            cache:
              'no-store',
          }
        );

      const renditionText =
        await renditionResponse.text();

      if (
        !renditionResponse.ok ||
        !renditionText.startsWith(
          '#EXTM3U'
        )
      ) {
        throw new Error(
          'INVALID_HLS_RENDITION'
        );
      }

      setHlsResult(
        `PASS: master ${masterResponse.status}, rendition ${renditionResponse.status}.`
      );
    } catch {
      setHlsResult(
        'FAIL: private HLS manifest verification failed.'
      );
    }
  }

  async function testMp4Range(
    session: MediaPlaybackClientSession
  ) {
    try {
      const response =
        await fetch(
          session.mp4Urls[1],
          {
            credentials:
              'same-origin',
            cache:
              'no-store',
            headers: {
              Range:
                'bytes=0-1023',
            },
          }
        );

      if (
        response.status !== 206 ||
        response.headers.get(
          'content-range'
        ) === null ||
        (
          await response.arrayBuffer()
        ).byteLength !== 1_024
      ) {
        throw new Error(
          'INVALID_MP4_RANGE'
        );
      }

      setRangeResult(
        'PASS: MP4 returned HTTP 206 with exactly 1024 bytes.'
      );
    } catch {
      setRangeResult(
        'FAIL: private MP4 byte-range verification failed.'
      );
    }
  }

  if (
    process.env.NODE_ENV !==
    'development'
  ) {
    return null;
  }

  const session =
    state.status === 'success'
      ? state.session
      : null;

  return (
    <main
      style={{
        maxWidth:
          900,
        margin:
          '40px auto',
        padding:
          24,
        fontFamily:
          'Arial, sans-serif',
      }}
    >
      <h1>
        PHCL Super — Private Media Playback Test
      </h1>

      <p>
        Development-only authenticated playback test.
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

      {user ? (
        <p>
          <strong>
            Firebase UID:
          </strong>{' '}
          {user.uid}
        </p>
      ) : null}

      <label
        htmlFor="media-id"
        style={{
          display:
            'block',
          marginBottom:
            8,
          fontWeight:
            700,
        }}
      >
        READY media ID
      </label>

      <input
        id="media-id"
        value={mediaId}
        onChange={
          (event) =>
            setMediaId(
              event.target.value
            )
        }
        placeholder="Enter media ID"
        autoComplete="off"
        style={{
          width:
            '100%',
          boxSizing:
            'border-box',
          padding:
            12,
          marginBottom:
            12,
        }}
      />

      <button
        type="button"
        disabled={
          !user ||
          mediaId.length === 0 ||
          state.status === 'loading'
        }
        onClick={
          () => {
            void startPlaybackTest();
          }
        }
        style={{
          padding:
            '12px 18px',
          cursor:
            'pointer',
        }}
      >
        Create Private Playback Session
      </button>

      <h2>
        Status
      </h2>

      <pre
        style={{
          whiteSpace:
            'pre-wrap',
          background:
            '#f5f5f5',
          padding:
            16,
        }}
      >
        {state.message}
      </pre>

      {session ? (
        <section>
          <p>
            Session expires:{' '}
            {new Date(
              session.expiresAtMs
            ).toISOString()}
          </p>

          <img
            src={session.thumbnailUrl}
            alt="Private media thumbnail"
            style={{
              display:
                'block',
              width:
                '100%',
              maxWidth:
                480,
              marginBottom:
                16,
            }}
          />

          <label
            htmlFor="rendition"
          >
            MP4 rendition:{' '}
          </label>

          <select
            id="rendition"
            value={selectedMp4}
            onChange={
              (event) =>
                setSelectedMp4(
                  event.target.value
                )
            }
          >
            <option
              value={session.mp4Urls[0]}
            >
              1080p
            </option>
            <option
              value={session.mp4Urls[1]}
            >
              720p
            </option>
            <option
              value={session.mp4Urls[2]}
            >
              480p
            </option>
          </select>

          <video
            key={selectedMp4}
            controls
            preload="metadata"
            poster={session.thumbnailUrl}
            src={selectedMp4}
            style={{
              display:
                'block',
              width:
                '100%',
              marginTop:
                16,
              background:
                '#111',
            }}
          />

          <div
            style={{
              display:
                'flex',
              gap:
                12,
              marginTop:
                16,
              flexWrap:
                'wrap',
            }}
          >
            <button
              type="button"
              onClick={
                () => {
                  void testHlsManifest(
                    session
                  );
                }
              }
            >
              Test Private HLS
            </button>

            <button
              type="button"
              onClick={
                () => {
                  void testMp4Range(
                    session
                  );
                }
              }
            >
              Test MP4 Range
            </button>
          </div>

          <p>
            <strong>
              HLS:
            </strong>{' '}
            {hlsResult}
          </p>

          <p>
            <strong>
              MP4 Range:
            </strong>{' '}
            {rangeResult}
          </p>
        </section>
      ) : null}
    </main>
  );
}
