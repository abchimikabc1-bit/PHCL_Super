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

const DEVELOPMENT_ORIGIN =
  'http://localhost:3000';

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

function assertTrustedOrigin(
  trustedOrigin: string
): void {
  if (
    typeof trustedOrigin !== 'string' ||
    trustedOrigin.length === 0 ||
    trustedOrigin.trim() !==
      trustedOrigin
  ) {
    throw new Error(
      'INVALID_MEDIA_UPLOAD_SESSION_ORIGIN'
    );
  }

  let parsed: URL;

  try {
    parsed =
      new URL(
        trustedOrigin
      );
  } catch {
    throw new Error(
      'INVALID_MEDIA_UPLOAD_SESSION_ORIGIN'
    );
  }

  const isSecureOrigin =
    parsed.protocol ===
      'https:';

  const isDevelopmentOrigin =
    trustedOrigin ===
      DEVELOPMENT_ORIGIN;

  if (
    (
      !isSecureOrigin &&
      !isDevelopmentOrigin
    ) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== '/' ||
    parsed.origin !==
      trustedOrigin
  ) {
    throw new Error(
      'INVALID_MEDIA_UPLOAD_SESSION_ORIGIN'
    );
  }
}

export async function authorizeMediaUploadSessionWithDependencies(
  authenticatedUid: string,
  mediaId: string,
  trustedOrigin: string,
  dependencies:
    MediaUploadSessionAuthorizationDependencies
): Promise<MediaUploadSession> {
  assertAuthenticatedUid(
    authenticatedUid
  );

  assertTrustedOrigin(
    trustedOrigin
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

    origin:
      trustedOrigin,
  });
}

export function authorizeMediaUploadSession(
  authenticatedUid: string,
  mediaId: string,
  trustedOrigin: string
): Promise<MediaUploadSession> {
  return authorizeMediaUploadSessionWithDependencies(
    authenticatedUid,
    mediaId,
    trustedOrigin,
    productionDependencies
  );
}