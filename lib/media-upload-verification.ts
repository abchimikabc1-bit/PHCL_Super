import 'server-only';

import type {
  MediaMetadataRecord,
} from '@/lib/media-metadata-authority';

import type {
  MediaStorageObjectInfo,
} from '@/lib/media-storage-authority';

export type MediaUploadVerificationFailureReason =
  | 'OBJECT_NOT_FOUND'
  | 'OBJECT_PATH_MISMATCH'
  | 'INVALID_OBJECT_METADATA'
  | 'SIZE_MISMATCH'
  | 'CONTENT_TYPE_MISMATCH'
  | 'INVALID_GENERATION';

export type MediaUploadVerificationResult =
  | {
      verified: true;
      mediaId: string;
      sourceObject: string;
      generation: string;
    }
  | {
      verified: false;
      reason: MediaUploadVerificationFailureReason;
    };

export function evaluateMediaUploadVerification(
  media: MediaMetadataRecord,
  object: MediaStorageObjectInfo
): MediaUploadVerificationResult {
  if (!object.exists) {
    return {
      verified: false,
      reason: 'OBJECT_NOT_FOUND',
    };
  }

  if (object.path !== media.sourceObject) {
    return {
      verified: false,
      reason: 'OBJECT_PATH_MISMATCH',
    };
  }

  if (
    object.size === null ||
    !Number.isSafeInteger(object.size) ||
    object.size < 0 ||
    object.contentType === null ||
    object.generation === null
  ) {
    return {
      verified: false,
      reason: 'INVALID_OBJECT_METADATA',
    };
  }

  if (object.size !== media.declaredSizeBytes) {
    return {
      verified: false,
      reason: 'SIZE_MISMATCH',
    };
  }

  if (object.contentType !== media.contentType) {
    return {
      verified: false,
      reason: 'CONTENT_TYPE_MISMATCH',
    };
  }

  if (
    object.generation.length === 0 ||
    object.generation.trim() !== object.generation
  ) {
    return {
      verified: false,
      reason: 'INVALID_GENERATION',
    };
  }

  return {
    verified: true,
    mediaId: media.mediaId,
    sourceObject: media.sourceObject,
    generation: object.generation,
  };
}