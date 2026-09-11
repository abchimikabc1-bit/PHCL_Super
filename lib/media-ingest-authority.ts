import 'server-only';

import {
  createMediaMetadata,
  type MediaMetadataRecord,
} from '@/lib/media-metadata-authority';

import {
  createMediaId,
} from '@/lib/media-storage-paths';

export type InitiateMediaIngestInput = {
  ownerId: string;
  sourceFileName: string;
};

export type MediaIngestInitiation =
  MediaMetadataRecord;

export async function initiateMediaIngest(
  input: InitiateMediaIngestInput
): Promise<MediaIngestInitiation> {
  const mediaId =
    createMediaId();

  return createMediaMetadata({
    ownerId:
      input.ownerId,

    mediaId,

    sourceFileName:
      input.sourceFileName,
  });
}