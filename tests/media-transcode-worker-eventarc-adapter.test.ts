import assert from 'node:assert/strict';
import test from 'node:test';

import {
  readMediaTranscodeWorkerEventarcInvocation,
} from '@/lib/media-transcode-worker-eventarc-adapter';

function event(
  document: string,
  type =
    'google.cloud.firestore.document.v1.created'
) {
  return {
    specversion:
      '1.0',
    id:
      'event-1',
    type,
    source:
      '//firestore.googleapis.com/projects/phcl-super-f0d21/databases/(default)',
    document,
  };
}

test(
  'extracts the media id from a transcode-work created CloudEvent',
  () => {
    assert.deepEqual(
      readMediaTranscodeWorkerEventarcInvocation(
        event(
          'mediaTranscodeWork/media-123'
        )
      ),
      {
        mediaId:
          'media-123',
      }
    );
  }
);

test(
  'rejects unexpected event types, collections and nested paths',
  () => {
    const invalidEvents = [
      event(
        'mediaTranscodeWork/media-123',
        'google.cloud.firestore.document.v1.updated'
      ),
      event(
        'otherCollection/media-123'
      ),
      event(
        'mediaTranscodeWork/'
      ),
      event(
        'mediaTranscodeWork/media-123/nested/value'
      ),
    ];

    for (
      const invalidEvent
      of invalidEvents
    ) {
      assert.throws(
        () =>
          readMediaTranscodeWorkerEventarcInvocation(
            invalidEvent
          ),
        /INVALID_EVENT/
      );
    }
  }
);

test(
  'rejects unsafe or noncanonical event media identifiers',
  () => {
    for (
      const mediaId
      of [
        ' media-123',
        'media-123 ',
        '..',
      ]
    ) {
      assert.throws(
        () =>
          readMediaTranscodeWorkerEventarcInvocation(
            event(
              `mediaTranscodeWork/${mediaId}`
            )
          ),
        /INVALID_EVENT/
      );
    }
  }
);

test(
  'does not accept the old CloudEvent subject as document authority',
  () => {
    assert.throws(
      () =>
        readMediaTranscodeWorkerEventarcInvocation({
          specversion:
            '1.0',
          id:
            'event-2',
          type:
            'google.cloud.firestore.document.v1.created',
          source:
            '//firestore.googleapis.com/projects/phcl-super-f0d21/databases/(default)',
          subject:
            'documents/mediaTranscodeWork/media-123',
        }),
      /INVALID_EVENT/
    );
  }
);
