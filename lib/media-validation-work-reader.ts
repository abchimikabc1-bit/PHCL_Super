import 'server-only';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  MEDIA_VALIDATION_WORK_TYPE,
  type MediaValidationWork,
} from '@/lib/media-validation-work-authority';

const MEDIA_VALIDATION_WORK_COLLECTION =
  'mediaValidationWork';

const MEDIA_VALIDATION_WORK_KEYS = [
  'workId',
  'mediaId',
  'workType',
] as const;

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactWorkKeys(
  value: Record<string, unknown>
): boolean {
  const keys =
    Object.keys(value).sort();

  const expectedKeys =
    [...MEDIA_VALIDATION_WORK_KEYS].sort();

  return (
    keys.length ===
      expectedKeys.length &&
    keys.every(
      (key, index) =>
        key === expectedKeys[index]
    )
  );
}

function parseMediaValidationWork(
  value: unknown,
  expectedMediaId: string
): MediaValidationWork {
  if (
    !isRecord(value) ||
    !hasExactWorkKeys(value) ||
    typeof value.workId !== 'string' ||
    typeof value.mediaId !== 'string' ||
    value.workType !==
      MEDIA_VALIDATION_WORK_TYPE ||
    value.workId !==
      expectedMediaId ||
    value.mediaId !==
      expectedMediaId
  ) {
    throw new Error(
      'INVALID_MEDIA_VALIDATION_WORK'
    );
  }

  return {
    workId:
      value.workId,

    mediaId:
      value.mediaId,

    workType:
      MEDIA_VALIDATION_WORK_TYPE,
  };
}

export async function readMediaValidationWork(
  mediaId: string
): Promise<MediaValidationWork | null> {
  const snapshot =
    await adminDb
      .collection(
        MEDIA_VALIDATION_WORK_COLLECTION
      )
      .doc(mediaId)
      .get();

  if (!snapshot.exists) {
    return null;
  }

  return parseMediaValidationWork(
    snapshot.data(),
    mediaId
  );
}