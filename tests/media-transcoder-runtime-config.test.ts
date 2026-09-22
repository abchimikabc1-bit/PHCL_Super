import assert from 'node:assert/strict';
import test from 'node:test';

import {
  readMediaTranscoderRuntimeConfigFromEnvironment,
} from '@/lib/media-transcoder-runtime-config';

const VALID_ENVIRONMENT = {
  MEDIA_TRANSCODER_PROJECT_ID:
    'phcl-super-f0d21',
  MEDIA_TRANSCODER_LOCATION:
    'us-east1',
  FIREBASE_STORAGE_BUCKET:
    'phcl-super-f0d21.firebasestorage.app',
  MEDIA_TRANSCODE_COMPLETION_TOPIC:
    'projects/phcl-super-f0d21/topics/media-transcode-complete',
};

test(
  'reads the canonical PHCL media transcoder runtime configuration',
  () => {
    assert.deepEqual(
      readMediaTranscoderRuntimeConfigFromEnvironment(
        VALID_ENVIRONMENT
      ),
      {
        projectId:
          'phcl-super-f0d21',
        location:
          'us-east1',
        bucketName:
          'phcl-super-f0d21.firebasestorage.app',
        completionTopic:
          'projects/phcl-super-f0d21/topics/media-transcode-complete',
      }
    );
  }
);

test(
  'rejects missing, noncanonical, or unsafe configuration values',
  () => {
    const unsafeEnvironments = [
      {
        ...VALID_ENVIRONMENT,
        MEDIA_TRANSCODER_PROJECT_ID:
          undefined,
      },
      {
        ...VALID_ENVIRONMENT,
        MEDIA_TRANSCODER_LOCATION:
          'me-central1',
      },
      {
        ...VALID_ENVIRONMENT,
        FIREBASE_STORAGE_BUCKET:
          ' bucket.example ',
      },
      {
        ...VALID_ENVIRONMENT,
        MEDIA_TRANSCODE_COMPLETION_TOPIC:
          'not-a-topic',
      },
    ];

    for (
      const environment
      of unsafeEnvironments
    ) {
      assert.throws(
        () =>
          readMediaTranscoderRuntimeConfigFromEnvironment(
            environment
          ),
        /INVALID_MEDIA_TRANSCODER_RUNTIME_CONFIG/
      );
    }
  }
);

test(
  'rejects a completion topic owned by a different project',
  () => {
    assert.throws(
      () =>
        readMediaTranscoderRuntimeConfigFromEnvironment({
          ...VALID_ENVIRONMENT,
          MEDIA_TRANSCODE_COMPLETION_TOPIC:
            'projects/other-project-123/topics/media-transcode-complete',
        }),
      /INVALID_MEDIA_TRANSCODER_RUNTIME_CONFIG/
    );
  }
);
