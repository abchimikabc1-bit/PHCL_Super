import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMediaTranscodePlatformAdmission,
  createPlatformAdmittedMediaTranscodeAuthenticator,
  MEDIA_TRANSCODE_PLATFORM_AUTHORITY,
} from '../worker/media-transcode-platform-binding';

test(
  'binds authentication to private Cloud Run IAM platform admission',
  async () => {
    const admission =
      createMediaTranscodePlatformAdmission(
        MEDIA_TRANSCODE_PLATFORM_AUTHORITY
      );

    assert.deepEqual(
      admission,
      {
        authority:
          'PRIVATE_CLOUD_RUN_IAM',
      }
    );

    const authenticate =
      createPlatformAdmittedMediaTranscodeAuthenticator(
        admission
      );

    assert.equal(
      await authenticate(
        new Request(
          'https://worker.invalid'
        )
      ),
      true
    );
  }
);

test(
  'rejects forged platform authority and admission',
  () => {
    assert.throws(
      () =>
        createMediaTranscodePlatformAdmission(
          'PUBLIC' as never
        ),
      /INVALID_MEDIA_TRANSCODE_PLATFORM_AUTHORITY/
    );

    assert.throws(
      () =>
        createPlatformAdmittedMediaTranscodeAuthenticator({
          authority:
            'PUBLIC',
        } as never),
      /INVALID_MEDIA_TRANSCODE_PLATFORM_ADMISSION/
    );
  }
);
