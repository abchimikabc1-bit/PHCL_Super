import 'server-only';

import {
  adminStorageBucket,
} from '@/lib/firebase-admin';

import {
  buildMediaIngestPath,
} from '@/lib/media-storage-paths';

export type CreateMediaUploadSessionInput = {
  ownerId: string;
  mediaId: string;
  sourceFileName: string;
  contentType: string;
};

export type MediaUploadSession = {
  sourceObject: string;
  uploadUri: string;
};

export async function createMediaUploadSession(
  input: CreateMediaUploadSessionInput
): Promise<MediaUploadSession> {
  if (
    input.contentType !==
    'video/mp4'
  ) {
    throw new Error(
      'Media content type is unsupported.'
    );
  }

  const sourceObject =
    buildMediaIngestPath(
      input.ownerId,
      input.mediaId,
      input.sourceFileName
    );

  const file =
    adminStorageBucket.file(
      sourceObject
    );

  const [
    uploadUri,
  ] =
    await file.createResumableUpload({
      metadata: {
        contentType:
          input.contentType,
      },
      preconditionOpts: {
        ifGenerationMatch: 0,
      },
    });

  if (
    typeof uploadUri !== 'string' ||
    uploadUri.length === 0
  ) {
    throw new Error(
      'Media upload session could not be created.'
    );
  }

  return {
    sourceObject,
    uploadUri,
  };
}