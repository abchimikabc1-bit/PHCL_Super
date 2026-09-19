import 'server-only';

import type {
  MediaMetadataRecord,
} from '@/lib/media-metadata-authority';

import {
  readMediaMetadataForVerification,
} from '@/lib/media-metadata-reader';

import {
  createMediaUploadSession,
  type CreateMediaUploadSessionInput,
  type MediaUploadSession,
} from '@/lib/media-upload-authority';

export type MediaUploadSessionAuthorizationDependencies = {
  readMediaMetadata: (
    mediaId: string
  ) => Promise<MediaMetadataRecord>;

  createMediaUploadSession: (
    input: CreateMediaUploadSessionInput
  ) => Promise<MediaUploadSession>;
};

const productionDependencies:
  MediaUploadSessionAuthorizationDependencies = {
    readMediaMetadata:
      readMediaMetadataForVerification,

    createMediaUploadSession,
  };

function assertAuthenticatedUid(
  authenticatedUid: string
): void {
  if (
    typeof authenticatedUid !== 'string' ||
    authenticatedUid.length === 0 ||
    authenticatedUid.trim() !==
      authenticatedUid
  ) {
    throw new Error(
      'INVALID_MEDIA_UPLOAD_SESSION_AUTHORITY'
    );
  }
}

export async function authorizeMediaUploadSessionWithDependencies(
  authenticatedUid: string,
  mediaId: string,
  dependencies:
    MediaUploadSessionAuthorizationDependencies
): Promise<MediaUploadSession> {
  assertAuthenticatedUid(
    authenticatedUid
  );

  const media =
    await dependencies.readMediaMetadata(
      mediaId
    );

  if (
    media.ownerId !==
    authenticatedUid
  ) {
    throw new Error(
      'MEDIA_UPLOAD_SESSION_FORBIDDEN'
    );
  }

  return dependencies.createMediaUploadSession({
    ownerId:
      media.ownerId,

    mediaId:
      media.mediaId,

    sourceFileName:
      media.sourceFileName,

    contentType:
      media.contentType,

    declaredSizeBytes:
      media.declaredSizeBytes,
  });
}

export function authorizeMediaUploadSession(
  authenticatedUid: string,
  mediaId: string
): Promise<MediaUploadSession> {
  return authorizeMediaUploadSessionWithDependencies(
    authenticatedUid,
    mediaId,
    productionDependencies
  );
}