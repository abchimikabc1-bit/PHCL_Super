import {
  NextResponse,
} from 'next/server';

import {
  authenticateFirebaseUser,
} from '@/lib/firebase-user-auth';

import {
  authorizeAndFinalizeMediaUpload,
} from '@/lib/media-finalization-authorization';

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
            'Media finalization request is too large.',
        },
        413
      );
    }

    return noStoreJson(
      {
        error:
          'Invalid media finalization request.',
      },
      400
    );
  }

  try {
    const media =
      await authorizeAndFinalizeMediaUpload(
        auth.user.uid,
        body.mediaId
      );

    return noStoreJson(
      {
        mediaId:
          media.mediaId,

        status:
          media.status,
      },
      200
    );
  } catch {
    return noStoreJson(
      {
        error:
          'Unable to finalize media upload.',
      },
      400
    );
  }
}