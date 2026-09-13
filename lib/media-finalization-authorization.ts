import 'server-only';

import type {
  MediaMetadataRecord,
} from '@/lib/media-metadata-authority';

import {
  readMediaMetadataForVerification,
} from '@/lib/media-metadata-reader';

import {
  finalizeMediaUpload,
} from '@/lib/media-upload-finalization';

import type {
  VerifiedMediaTransitionResult,
} from '@/lib/media-upload-transition-authority';

export type MediaFinalizationAuthorizationDependencies = {
  readMediaMetadata: (
    mediaId: string
  ) => Promise<MediaMetadataRecord>;

  finalizeMediaUpload: (
    mediaId: string
  ) => Promise<VerifiedMediaTransitionResult>;
};

const productionDependencies:
  MediaFinalizationAuthorizationDependencies = {
    readMediaMetadata:
      readMediaMetadataForVerification,

    finalizeMediaUpload,
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
      'INVALID_MEDIA_FINALIZATION_AUTHORITY'
    );
  }
}

export async function authorizeAndFinalizeMediaUploadWithDependencies(
  authenticatedUid: string,
  mediaId: string,
  dependencies:
    MediaFinalizationAuthorizationDependencies
): Promise<VerifiedMediaTransitionResult> {
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
      'MEDIA_FINALIZATION_FORBIDDEN'
    );
  }

  return dependencies.finalizeMediaUpload(
    media.mediaId
  );
}

export function authorizeAndFinalizeMediaUpload(
  authenticatedUid: string,
  mediaId: string
): Promise<VerifiedMediaTransitionResult> {
  return authorizeAndFinalizeMediaUploadWithDependencies(
    authenticatedUid,
    mediaId,
    productionDependencies
  );
}