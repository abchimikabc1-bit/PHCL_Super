import 'server-only';

import type {
  MediaValidationWorkerRequestAuthenticator,
} from '@/lib/media-validation-worker-handler';

export const MEDIA_VALIDATION_PLATFORM_AUTHORITY =
  'PRIVATE_CLOUD_RUN_IAM' as const;

export type MediaValidationPlatformAuthority =
  typeof MEDIA_VALIDATION_PLATFORM_AUTHORITY;

export type MediaValidationPlatformAdmission = {
  authority:
    MediaValidationPlatformAuthority;
};

export function createMediaValidationPlatformAdmission(
  authority:
    MediaValidationPlatformAuthority
): MediaValidationPlatformAdmission {
  if (
    authority !==
    MEDIA_VALIDATION_PLATFORM_AUTHORITY
  ) {
    throw new Error(
      'INVALID_MEDIA_VALIDATION_PLATFORM_AUTHORITY'
    );
  }

  return {
    authority,
  };
}

export function createPlatformAdmittedMediaValidationAuthenticator(
  admission:
    MediaValidationPlatformAdmission
): MediaValidationWorkerRequestAuthenticator {
  if (
    admission.authority !==
    MEDIA_VALIDATION_PLATFORM_AUTHORITY
  ) {
    throw new Error(
      'INVALID_MEDIA_VALIDATION_PLATFORM_ADMISSION'
    );
  }

  return async (
    _request: Request
  ): Promise<boolean> => {
    return true;
  };
}