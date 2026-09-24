import 'server-only';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  buildMediaIngestPath,
  buildMediaProcessedPath,
} from '@/lib/media-storage-paths';

const MEDIA_COLLECTION =
  'media';

const MEDIA_SCHEMA_VERSION =
  2;

const MEDIA_READY_STATUS =
  'READY' as const;

const MEDIA_CONTENT_TYPE =
  'video/mp4';

const MAX_MEDIA_SIZE_BYTES =
  524_288_000;

const TRANSCODER_JOB_NAME_PATTERN =
  /^projects\/([a-z][a-z0-9-]{4,28}[a-z0-9]|[1-9][0-9]{5,19})\/locations\/[a-z][a-z0-9-]{0,62}\/jobs\/[A-Za-z0-9_-]+$/;

const HLS_MANIFEST_FILES = [
  'hls-1080p.m3u8',
  'hls-720p.m3u8',
  'hls-480p.m3u8',
] as const;

const MP4_FILES = [
  'video-1080p.mp4',
  'video-720p.mp4',
  'video-480p.mp4',
] as const;

const THUMBNAIL_FILE =
  'thumbnail0000000000.jpeg';

export type ReadyMediaForPlayback = {
  mediaId: string;
  ownerId: string;
  status: typeof MEDIA_READY_STATUS;
  verifiedGeneration: string;
  transcoderJobName: string;
  outputPrefix: string;
  masterManifestObject: string;
  hlsManifestObjects: string[];
  mp4Objects: string[];
  thumbnailObject: string;
  completedAtMs: number;
};

export type MediaPlaybackReadyReaderDependencies = {
  readMediaDocument: (
    mediaId: string
  ) => Promise<unknown | null>;
};

function isPlainRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isCanonicalNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.trim() === value
  );
}

function isValidTimestampMs(
  value: unknown
): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function arraysEqual(
  value: unknown,
  expected: readonly string[]
): value is string[] {
  return (
    Array.isArray(value) &&
    value.length === expected.length &&
    value.every(
      (entry, index) =>
        entry === expected[index]
    )
  );
}

function assertSafeMediaId(
  mediaId: string
): void {
  try {
    buildMediaIngestPath(
      'playback-reader',
      mediaId,
      'source.mp4'
    );
  } catch {
    throw new Error(
      'INVALID_MEDIA_PLAYBACK_IDENTITY'
    );
  }
}

function buildProcessedObject(
  mediaId: string,
  fileName: string
): string {
  try {
    return buildMediaProcessedPath(
      mediaId,
      fileName
    );
  } catch {
    throw new Error(
      'INVALID_READY_MEDIA_PLAYBACK_METADATA'
    );
  }
}

function parseReadyMedia(
  value: unknown,
  requestedMediaId: string
): ReadyMediaForPlayback {
  if (!isPlainRecord(value)) {
    throw new Error(
      'INVALID_READY_MEDIA_PLAYBACK_METADATA'
    );
  }

  const expectedOutputPrefix =
    `media/processed/${requestedMediaId}/`;

  const expectedMasterManifest =
    buildProcessedObject(
      requestedMediaId,
      'master.m3u8'
    );

  const expectedHlsManifests =
    HLS_MANIFEST_FILES.map(
      (fileName) =>
        buildProcessedObject(
          requestedMediaId,
          fileName
        )
    );

  const expectedMp4Objects =
    MP4_FILES.map(
      (fileName) =>
        buildProcessedObject(
          requestedMediaId,
          fileName
        )
    );

  const expectedThumbnail =
    buildProcessedObject(
      requestedMediaId,
      THUMBNAIL_FILE
    );

  if (
    value.schemaVersion !==
      MEDIA_SCHEMA_VERSION ||
    value.mediaId !==
      requestedMediaId ||
    !isCanonicalNonEmptyString(
      value.ownerId
    ) ||
    !isCanonicalNonEmptyString(
      value.sourceFileName
    ) ||
    !isCanonicalNonEmptyString(
      value.sourceObject
    ) ||
    value.contentType !==
      MEDIA_CONTENT_TYPE ||
    typeof value.declaredSizeBytes !==
      'number' ||
    !Number.isSafeInteger(
      value.declaredSizeBytes
    ) ||
    value.declaredSizeBytes <= 0 ||
    value.declaredSizeBytes >
      MAX_MEDIA_SIZE_BYTES ||
    value.status !==
      MEDIA_READY_STATUS ||
    !/^[0-9]{1,32}$/.test(
      String(
        value.verifiedGeneration ?? ''
      )
    ) ||
    value.transcodeCompletedGeneration !==
      value.verifiedGeneration ||
    !TRANSCODER_JOB_NAME_PATTERN.test(
      String(
        value.transcoderJobName ?? ''
      )
    ) ||
    value.processedOutputPrefix !==
      expectedOutputPrefix ||
    value.masterManifestObject !==
      expectedMasterManifest ||
    !arraysEqual(
      value.hlsManifestObjects,
      expectedHlsManifests
    ) ||
    !arraysEqual(
      value.mp4Objects,
      expectedMp4Objects
    ) ||
    value.thumbnailObject !==
      expectedThumbnail ||
    !isValidTimestampMs(
      value.transcodeCompletedAtMs
    )
  ) {
    throw new Error(
      'INVALID_READY_MEDIA_PLAYBACK_METADATA'
    );
  }

  let canonicalSourceObject:
    string;

  try {
    canonicalSourceObject =
      buildMediaIngestPath(
        value.ownerId,
        requestedMediaId,
        value.sourceFileName
      );
  } catch {
    throw new Error(
      'INVALID_READY_MEDIA_PLAYBACK_METADATA'
    );
  }

  if (
    value.sourceObject !==
    canonicalSourceObject
  ) {
    throw new Error(
      'INVALID_READY_MEDIA_PLAYBACK_METADATA'
    );
  }

  return {
    mediaId:
      requestedMediaId,
    ownerId:
      value.ownerId,
    status:
      MEDIA_READY_STATUS,
    verifiedGeneration:
      value.verifiedGeneration as string,
    transcoderJobName:
      value.transcoderJobName as string,
    outputPrefix:
      expectedOutputPrefix,
    masterManifestObject:
      expectedMasterManifest,
    hlsManifestObjects:
      [...expectedHlsManifests],
    mp4Objects:
      [...expectedMp4Objects],
    thumbnailObject:
      expectedThumbnail,
    completedAtMs:
      value.transcodeCompletedAtMs,
  };
}

const productionDependencies:
  MediaPlaybackReadyReaderDependencies = {
    readMediaDocument:
      async (mediaId) => {
        const snapshot =
          await adminDb
            .collection(
              MEDIA_COLLECTION
            )
            .doc(mediaId)
            .get();

        return snapshot.exists
          ? snapshot.data() ?? null
          : null;
      },
  };

export async function readReadyMediaForPlaybackWithDependencies(
  mediaId: string,
  dependencies:
    MediaPlaybackReadyReaderDependencies
): Promise<ReadyMediaForPlayback> {
  assertSafeMediaId(
    mediaId
  );

  const value =
    await dependencies.readMediaDocument(
      mediaId
    );

  if (value === null) {
    throw new Error(
      'MEDIA_NOT_FOUND'
    );
  }

  return parseReadyMedia(
    value,
    mediaId
  );
}

export function readReadyMediaForPlayback(
  mediaId: string
): Promise<ReadyMediaForPlayback> {
  return readReadyMediaForPlaybackWithDependencies(
    mediaId,
    productionDependencies
  );
}
