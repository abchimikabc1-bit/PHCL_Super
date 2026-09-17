import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readMediaValidationWorkerEventarcRequest,
} from '@/lib/media-validation-worker-eventarc-request';

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
  'reads a Firestore document-created Eventarc binary HTTP request',
  () => {
    const event =
      readMediaValidationWorkerEventarcRequest(
        createRequest()
      );

    assert.deepEqual(
      event,
      {
        specversion:
          '1.0',

        id:
          'event-123',

        type:
          'google.cloud.firestore.document.v1.created',

        source:
          '//firestore.googleapis.com/projects/phcl-super-f0d21/databases/(default)',

        document:
          'mediaValidationWork/media-123',
      }
    );
  }
);

test(
  'rejects a request without a CloudEvents specversion',
  () => {
    assert.throws(
      () =>
        readMediaValidationWorkerEventarcRequest(
          createRequest({
            'ce-specversion':
              '',
          })
        ),
      /INVALID_EVENTARC_REQUEST/
    );
  }
);

test(
  'rejects a request without a CloudEvents id',
  () => {
    assert.throws(
      () =>
        readMediaValidationWorkerEventarcRequest(
          createRequest({
            'ce-id':
              '',
          })
        ),
      /INVALID_EVENTARC_REQUEST/
    );
  }
);

test(
  'rejects a request without a CloudEvents type',
  () => {
    assert.throws(
      () =>
        readMediaValidationWorkerEventarcRequest(
          createRequest({
            'ce-type':
              '',
          })
        ),
      /INVALID_EVENTARC_REQUEST/
    );
  }
);

test(
  'rejects a request without a CloudEvents source',
  () => {
    assert.throws(
      () =>
        readMediaValidationWorkerEventarcRequest(
          createRequest({
            'ce-source':
              '',
          })
        ),
      /INVALID_EVENTARC_REQUEST/
    );
  }
);

test(
  'rejects a request without the Firestore document extension',
  () => {
    assert.throws(
      () =>
        readMediaValidationWorkerEventarcRequest(
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
  'does not use the old CloudEvent subject as document authority',
  () => {
    assert.throws(
      () =>
        readMediaValidationWorkerEventarcRequest(
          createRequest({
            'ce-document':
              '',

            'ce-subject':
              'documents/mediaValidationWork/media-123',
          })
        ),
      /INVALID_EVENTARC_REQUEST/
    );
  }
);