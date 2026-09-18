import 'server-only';

import type {
  Server,
} from 'node:http';

import {
  createMediaValidationPlatformAdmission,
  createPlatformAdmittedMediaValidationAuthenticator,
  MEDIA_VALIDATION_PLATFORM_AUTHORITY,
} from './media-validation-platform-binding';

import {
  startMediaValidationWorkerRuntime,
} from './media-validation-runtime';

export async function startMediaValidationWorker(): Promise<Server> {
  const admission =
    createMediaValidationPlatformAdmission(
      MEDIA_VALIDATION_PLATFORM_AUTHORITY
    );

  const authenticateRequest =
    createPlatformAdmittedMediaValidationAuthenticator(
      admission
    );

  return startMediaValidationWorkerRuntime(
    {
      authenticateRequest,
    },
    process.env.PORT
  );
}