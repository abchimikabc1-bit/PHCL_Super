import 'server-only';

import {
  readMediaMetadataForVerification,
} from '@/lib/media-metadata-reader';

import {
  inspectMediaIngestObject,
} from '@/lib/media-storage-authority';

import {
  evaluateMediaUploadVerification,
} from '@/lib/media-upload-verification';

import type {
  MediaMetadataRecord,
} from '@/lib/media-metadata-authority';

import type {
  MediaStorageObjectInfo,
} from '@/lib/media-storage-authority';

import type {
  MediaUploadVerificationResult,
} from '@/lib/media-upload-verification';

type MediaUploadVerifierDependencies = {
  readMediaMetadata:
    (
      mediaId: string
    ) => Promise<MediaMetadataRecord>;

  inspectMediaIngestObject:
    (
      ownerId: string,
      mediaId: string,
      sourceFileName: string
    ) => Promise<MediaStorageObjectInfo>;
};

const productionDependencies:
  MediaUploadVerifierDependencies = {
    readMediaMetadata:
      readMediaMetadataForVerification,

    inspectMediaIngestObject,
  };

export async function verifyUploadedMediaObjectWithDependencies(
  mediaId: string,
  dependencies: MediaUploadVerifierDependencies
): Promise<MediaUploadVerificationResult> {
  const media =
    await dependencies
      .readMediaMetadata(
        mediaId
      );

  const object =
    await dependencies
      .inspectMediaIngestObject(
        media.ownerId,
        media.mediaId,
        media.sourceFileName
      );

  return evaluateMediaUploadVerification(
    media,
    object
  );
}

export function verifyUploadedMediaObject(
  mediaId: string
): Promise<MediaUploadVerificationResult> {
  return verifyUploadedMediaObjectWithDependencies(
    mediaId,
    productionDependencies
  );
}