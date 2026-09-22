import 'server-only';

import {
  buildMediaIngestPath,
} from '@/lib/media-storage-paths';

export const MEDIA_TRANSCODE_WORK_TYPE =
  'MEDIA_TRANSCODE' as const;

export type MediaTranscodeWorkType =
  typeof MEDIA_TRANSCODE_WORK_TYPE;

export type MediaTranscodeWork = {
  workId: string;
  mediaId: string;
  workType: MediaTranscodeWorkType;
  sourceObject: string;
  verifiedGeneration: string;
};

function isCanonicalNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.trim() === value
  );
}

function assertValidMediaId(
  mediaId: string
): void {
  try {
    buildMediaIngestPath(
      'transcode-work',
      mediaId,
      'source.mp4'
    );
  } catch {
    throw new Error(
      'INVALID_MEDIA_TRANSCODE_WORK'
    );
  }
}

export function buildMediaTranscodeWork(
  mediaId: string,
  sourceObject: string,
  verifiedGeneration: string
): MediaTranscodeWork {
  assertValidMediaId(
    mediaId
  );

  if (
    !isCanonicalNonEmptyString(
      sourceObject
    ) ||
    !isCanonicalNonEmptyString(
      verifiedGeneration
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_TRANSCODE_WORK'
    );
  }

  return {
    workId:
      mediaId,

    mediaId,

    workType:
      MEDIA_TRANSCODE_WORK_TYPE,

    sourceObject,

    verifiedGeneration,
  };
}