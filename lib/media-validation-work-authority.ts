import 'server-only';

import {
  buildMediaIngestPath,
} from '@/lib/media-storage-paths';

export const MEDIA_VALIDATION_WORK_TYPE =
  'MEDIA_CONTENT_VALIDATION' as const;

export type MediaValidationWorkType =
  typeof MEDIA_VALIDATION_WORK_TYPE;

export type MediaValidationWork = {
  workId: string;
  mediaId: string;
  workType: MediaValidationWorkType;
};

function assertValidMediaId(
  mediaId: string
): void {
  try {
    buildMediaIngestPath(
      'validation-work',
      mediaId,
      'validation.mp4'
    );
  } catch {
    throw new Error(
      'INVALID_MEDIA_VALIDATION_WORK'
    );
  }
}

export function buildMediaValidationWork(
  mediaId: string
): MediaValidationWork {
  assertValidMediaId(
    mediaId
  );

  return {
    workId:
      mediaId,

    mediaId,

    workType:
      MEDIA_VALIDATION_WORK_TYPE,
  };
}