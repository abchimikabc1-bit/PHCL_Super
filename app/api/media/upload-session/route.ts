import {
  NextResponse,
} from 'next/server';

import {
  authenticateFirebaseUser,
} from '@/lib/firebase-user-auth';

import {
  authorizeMediaUploadSession,
} from '@/lib/media-upload-session-authorization';

import {
  readMediaFinalizationRequest,
} from '@/lib/media-finalization-request';

function noStoreJson(
  body: unknown,
  status: number
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        'Cache-Control':
          'no-store, max-age=0',

        Pragma:
          'no-cache',
      },
    }
  );
}

export async function POST(
  request: Request
) {
  const auth =
    await authenticateFirebaseUser(
      request
    );

  if (!auth.authenticated) {
    return noStoreJson(
      {
        error:
          'Authentication required.',
      },
      401
    );
  }

  let body;

  try {
    body =
      await readMediaFinalizationRequest(
        request
      );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        'REQUEST_TOO_LARGE'
    ) {
      return noStoreJson(
        {
          error:
            'Media upload session request is too large.',
        },
        413
      );
    }

    return noStoreJson(
      {
        error:
          'Invalid media upload session request.',
      },
      400
    );
  }

  try {
    const session =
      await authorizeMediaUploadSession(
        auth.user.uid,
        body.mediaId
      );

    return noStoreJson(
      {
        sourceObject:
          session.sourceObject,

        uploadUri:
          session.uploadUri,
      },
      200
    );
  } catch {
    return noStoreJson(
      {
        error:
          'Unable to create media upload session.',
      },
      400
    );
  }
}