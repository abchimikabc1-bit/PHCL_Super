import 'server-only';

import {
  createMediaValidationPlatformAdmission,
  createPlatformAdmittedMediaValidationAuthenticator,
  MEDIA_VALIDATION_PLATFORM_AUTHORITY,
} from './media-validation-platform-binding';

import {
  startMediaValidationWorkerRuntime,
} from './media-validation-runtime';

export async function startMediaValidationWorker(): Promise<void> {
  const admission =
    createMediaValidationPlatformAdmission(
      MEDIA_VALIDATION_PLATFORM_AUTHORITY
    );

  const authenticateRequest =
    createPlatformAdmittedMediaValidationAuthenticator(
      admission
    );

  await startMediaValidationWorkerRuntime(
    {
      authenticateRequest,
    },
    process.env.PORT
  );
}