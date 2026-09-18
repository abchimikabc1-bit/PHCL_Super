import 'server-only';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMediaValidationPlatformAdmission,
  createPlatformAdmittedMediaValidationAuthenticator,
  MEDIA_VALIDATION_PLATFORM_AUTHORITY,
} from '../worker/media-validation-platform-binding';

test(
  'creates an explicit private Cloud Run IAM platform admission',
  () => {
    const admission =
      createMediaValidationPlatformAdmission(
        MEDIA_VALIDATION_PLATFORM_AUTHORITY
      );

    assert.deepEqual(
      admission,
      {
        authority:
          'PRIVATE_CLOUD_RUN_IAM',
      }
    );
  }
);

test(
  'rejects an invalid platform authority',
  () => {
    assert.throws(
      () =>
        createMediaValidationPlatformAdmission(
          'UNTRUSTED_PLATFORM' as never
        ),
      /INVALID_MEDIA_VALIDATION_PLATFORM_AUTHORITY/
    );
  }
);

test(
  'rejects a forged platform admission before creating an authenticator',
  () => {
    assert.throws(
      () =>
        createPlatformAdmittedMediaValidationAuthenticator(
          {
            authority:
              'UNTRUSTED_PLATFORM',
          } as never
        ),
      /INVALID_MEDIA_VALIDATION_PLATFORM_ADMISSION/
    );
  }
);

test(
  'valid platform admission creates the runtime authentication adapter',
  async () => {
    const admission =
      createMediaValidationPlatformAdmission(
        MEDIA_VALIDATION_PLATFORM_AUTHORITY
      );

    const authenticateRequest =
      createPlatformAdmittedMediaValidationAuthenticator(
        admission
      );

    const authenticated =
      await authenticateRequest(
        new Request(
          'https://media-worker.example.test/',
          {
            method: 'POST',
          }
        )
      );

    assert.equal(
      authenticated,
      true
    );
  }
);