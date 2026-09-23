import 'server-only';

import type {
  MediaTranscodeWorkerRequestAuthenticator,
} from '@/lib/media-transcode-worker-handler';

export const MEDIA_TRANSCODE_PLATFORM_AUTHORITY =
  'PRIVATE_CLOUD_RUN_IAM' as const;

export type MediaTranscodePlatformAuthority =
  typeof MEDIA_TRANSCODE_PLATFORM_AUTHORITY;

export type MediaTranscodePlatformAdmission = {
  authority:
    MediaTranscodePlatformAuthority;
};

export function createMediaTranscodePlatformAdmission(
  authority:
    MediaTranscodePlatformAuthority
): MediaTranscodePlatformAdmission {
  if (
    authority !==
    MEDIA_TRANSCODE_PLATFORM_AUTHORITY
  ) {
    throw new Error(
      'INVALID_MEDIA_TRANSCODE_PLATFORM_AUTHORITY'
    );
  }

  return {
    authority,
  };
}

export function createPlatformAdmittedMediaTranscodeAuthenticator(
  admission:
    MediaTranscodePlatformAdmission
): MediaTranscodeWorkerRequestAuthenticator {
  if (
    admission.authority !==
    MEDIA_TRANSCODE_PLATFORM_AUTHORITY
  ) {
    throw new Error(
      'INVALID_MEDIA_TRANSCODE_PLATFORM_ADMISSION'
    );
  }

  return async (
    _request: Request
  ): Promise<boolean> => {
    return true;
  };
}
