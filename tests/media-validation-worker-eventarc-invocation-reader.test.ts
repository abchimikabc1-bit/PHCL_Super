import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readMediaValidationWorkerEventarcRequestInvocation,
} from '@/lib/media-validation-worker-eventarc-invocation-reader';

function createRequest(
  headers: Record<string, string> = {}
): Request {
  return new Request(
    'https://worker.invalid/media-validation',
    {
      method: 'POST',

      headers: {
        'ce-specversion':
          '1.0',

        'ce-id':
          'event-123',

        'ce-type':
          'google.cloud.firestore.document.v1.created',

        'ce-source':
          '//firestore.googleapis.com/projects/phcl-super-f0d21/databases/(default)',

        'ce-document':
          'mediaValidationWork/media-123',

        ...headers,
      },
    }
  );
}

test(
  'reads a media validation invocation from an Eventarc Firestore request',
  async () => {
    const invocation =
      await readMediaValidationWorkerEventarcRequestInvocation(
        createRequest()
      );

    assert.deepEqual(
      invocation,
      {
        mediaId:
          'media-123',
      }
    );
  }
);

test(
  'rejects an invalid Eventarc request boundary',
  async () => {
    await assert.rejects(
      readMediaValidationWorkerEventarcRequestInvocation(
        createRequest({
          'ce-document':
            '',
        })
      ),
      /INVALID_EVENTARC_REQUEST/
    );
  }
);

test(
  'rejects an Eventarc event outside the media validation work contract',
  async () => {
    await assert.rejects(
      readMediaValidationWorkerEventarcRequestInvocation(
        createRequest({
          'ce-document':
            'otherCollection/media-123',
        })
      ),
      /INVALID_EVENT/
    );
  }
);