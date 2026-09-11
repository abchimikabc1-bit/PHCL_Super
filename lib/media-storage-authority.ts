import 'server-only';

import {
  adminStorageBucket,
} from '@/lib/firebase-admin';

import {
  buildMediaIngestPath,
  buildMediaProcessedPath,
  buildMediaQuarantinePath,
  buildMediaThumbnailPath,
} from '@/lib/media-storage-paths';

export type MediaStorageObjectInfo = {
  path: string;
  exists: boolean;
  size: number | null;
  contentType: string | null;
  generation: string | null;
};

async function inspectMediaObject(
  path: string
): Promise<MediaStorageObjectInfo> {
  const file =
    adminStorageBucket.file(
      path
    );

  const [
    exists,
  ] =
    await file.exists();

  if (!exists) {
    return {
      path,
      exists: false,
      size: null,
      contentType: null,
      generation: null,
    };
  }

  const [
    metadata,
  ] =
    await file.getMetadata();

  const parsedSize =
    Number(metadata.size);

  return {
    path,
    exists: true,
    size:
      Number.isSafeInteger(
        parsedSize
      ) &&
      parsedSize >= 0
        ? parsedSize
        : null,
    contentType:
      typeof metadata.contentType ===
      'string'
        ? metadata.contentType
        : null,
    generation:
      typeof metadata.generation ===
      'string'
        ? metadata.generation
        : null,
  };
}

export function inspectMediaIngestObject(
  userId: string,
  mediaId: string,
  fileName: string
): Promise<MediaStorageObjectInfo> {
  return inspectMediaObject(
    buildMediaIngestPath(
      userId,
      mediaId,
      fileName
    )
  );
}

export function inspectMediaProcessedObject(
  mediaId: string,
  fileName: string
): Promise<MediaStorageObjectInfo> {
  return inspectMediaObject(
    buildMediaProcessedPath(
      mediaId,
      fileName
    )
  );
}

export function inspectMediaThumbnailObject(
  mediaId: string,
  fileName: string
): Promise<MediaStorageObjectInfo> {
  return inspectMediaObject(
    buildMediaThumbnailPath(
      mediaId,
      fileName
    )
  );
}

export function inspectMediaQuarantineObject(
  mediaId: string,
  fileName: string
): Promise<MediaStorageObjectInfo> {
  return inspectMediaObject(
    buildMediaQuarantinePath(
      mediaId,
      fileName
    )
  );
}