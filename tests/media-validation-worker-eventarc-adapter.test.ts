import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readMediaValidationWorkerEventarcInvocation,
} from '@/lib/media-validation-worker-eventarc-adapter';

test(
  'extracts the mediaId from a Firestore document-created CloudEvent document extension',
  () => {
    const invocation =
      readMediaValidationWorkerEventarcInvocation({
        specversion: '1.0',
        id: 'event-1',
        type:
          'google.cloud.firestore.document.v1.created',
        source:
          '//firestore.googleapis.com/projects/phcl-super-f0d21/databases/(default)',
        document:
          'mediaValidationWork/media-123',
      });

    assert.deepEqual(
      invocation,
      {
        mediaId: 'media-123',
      }
    );
  }
);

test(
  'rejects an unexpected CloudEvent type',
  () => {
    assert.throws(
      () =>
        readMediaValidationWorkerEventarcInvocation({
          specversion: '1.0',
          id: 'event-2',
          type:
            'google.cloud.firestore.document.v1.updated',
          source:
            '//firestore.googleapis.com/projects/phcl-super-f0d21/databases/(default)',
          document:
            'mediaValidationWork/media-123',
        }),
      /INVALID_EVENT/
    );
  }
);

test(
  'rejects a document outside the media validation work collection',
  () => {
    assert.throws(
      () =>
        readMediaValidationWorkerEventarcInvocation({
          specversion: '1.0',
          id: 'event-3',
          type:
            'google.cloud.firestore.document.v1.created',
          source:
            '//firestore.googleapis.com/projects/phcl-super-f0d21/databases/(default)',
          document:
            'otherCollection/media-123',
        }),
      /INVALID_EVENT/
    );
  }
);

test(
  'rejects a missing mediaId',
  () => {
    assert.throws(
      () =>
        readMediaValidationWorkerEventarcInvocation({
          specversion: '1.0',
          id: 'event-4',
          type:
            'google.cloud.firestore.document.v1.created',
          source:
            '//firestore.googleapis.com/projects/phcl-super-f0d21/databases/(default)',
          document:
            'mediaValidationWork/',
        }),
      /INVALID_EVENT/
    );
  }
);

test(
  'rejects nested document paths beneath a media validation work document',
  () => {
    assert.throws(
      () =>
        readMediaValidationWorkerEventarcInvocation({
          specversion: '1.0',
          id: 'event-5',
          type:
            'google.cloud.firestore.document.v1.created',
          source:
            '//firestore.googleapis.com/projects/phcl-super-f0d21/databases/(default)',
          document:
            'mediaValidationWork/media-123/nested/value',
        }),
      /INVALID_EVENT/
    );
  }
);

test(
  'does not accept the old CloudEvent subject as document authority',
  () => {
    assert.throws(
      () =>
        readMediaValidationWorkerEventarcInvocation({
          specversion: '1.0',
          id: 'event-6',
          type:
            'google.cloud.firestore.document.v1.created',
          source:
            '//firestore.googleapis.com/projects/phcl-super-f0d21/databases/(default)',
          subject:
            'documents/mediaValidationWork/media-123',
        }),
      /INVALID_EVENT/
    );
  }
);