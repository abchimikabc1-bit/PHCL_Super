import 'server-only';

import {
  inspectMediaProcessedObject,
  type MediaStorageObjectInfo,
} from '@/lib/media-storage-authority';

import {
  buildMediaProcessedPath,
} from '@/lib/media-storage-paths';

const MASTER_MANIFEST_FILE =
  'master.m3u8';

const HLS_MANIFEST_FILES = [
  'hls-1080p.m3u8',
  'hls-720p.m3u8',
  'hls-480p.m3u8',
] as const;

const HLS_FIRST_SEGMENT_FILES = [
  'hls-1080p0000000000.ts',
  'hls-720p0000000000.ts',
  'hls-480p0000000000.ts',
] as const;

const MP4_FILES = [
  'video-1080p.mp4',
  'video-720p.mp4',
  'video-480p.mp4',
] as const;

const THUMBNAIL_FILE =
  'thumbnail0000000000.jpeg';

const REQUIRED_OUTPUT_FILES = [
  MASTER_MANIFEST_FILE,
  ...HLS_MANIFEST_FILES,
  ...HLS_FIRST_SEGMENT_FILES,
  ...MP4_FILES,
  THUMBNAIL_FILE,
] as const;

export type MediaTranscodeOutputEvidence = {
  mediaId: string;
  outputPrefix: string;
  masterManifestObject: string;
  hlsManifestObjects: string[];
  hlsFirstSegmentObjects: string[];
  mp4Objects: string[];
  thumbnailObject: string;
};

export type MediaTranscodeOutputEvidenceDependencies = {
  inspectMediaProcessedObject: (
    mediaId: string,
    fileName: string
  ) => Promise<MediaStorageObjectInfo>;
};

function invalidOutput(): never {
  throw new Error(
    'INVALID_MEDIA_TRANSCODE_OUTPUT'
  );
}

function incompleteOutput(): never {
  throw new Error(
    'MEDIA_TRANSCODE_OUTPUT_INCOMPLETE'
  );
}

function buildExpectedPath(
  mediaId: string,
  fileName: string
): string {
  try {
    return buildMediaProcessedPath(
      mediaId,
      fileName
    );
  } catch {
    return invalidOutput();
  }
}

function assertUsableObject(
  object: MediaStorageObjectInfo,
  expectedPath: string
): void {
  if (
    object.path !== expectedPath ||
    object.exists !== true ||
    typeof object.size !== 'number' ||
    !Number.isSafeInteger(
      object.size
    ) ||
    object.size <= 0
  ) {
    return incompleteOutput();
  }
}

export async function readMediaTranscodeOutputEvidenceWithDependencies(
  mediaId: string,
  dependencies:
    MediaTranscodeOutputEvidenceDependencies
): Promise<MediaTranscodeOutputEvidence> {
  const expectedObjects =
    REQUIRED_OUTPUT_FILES.map(
      (fileName) => ({
        fileName,
        path:
          buildExpectedPath(
            mediaId,
            fileName
          ),
      })
    );

  const inspectedObjects =
    await Promise.all(
      expectedObjects.map(
        async ({
          fileName,
          path,
        }) => {
          const object =
            await dependencies
              .inspectMediaProcessedObject(
                mediaId,
                fileName
              );

          assertUsableObject(
            object,
            path
          );

          return object.path;
        }
      )
    );

  const objectByFile =
    new Map(
      REQUIRED_OUTPUT_FILES.map(
        (
          fileName,
          index
        ) => [
          fileName,
          inspectedObjects[index],
        ] as const
      )
    );

  const readObject =
    (
      fileName:
        typeof REQUIRED_OUTPUT_FILES[number]
    ): string => {
      const path =
        objectByFile.get(
          fileName
        );

      if (!path) {
        return incompleteOutput();
      }

      return path;
    };

  return {
    mediaId,
    outputPrefix:
      `media/processed/${mediaId}/`,
    masterManifestObject:
      readObject(
        MASTER_MANIFEST_FILE
      ),
    hlsManifestObjects:
      HLS_MANIFEST_FILES.map(
        readObject
      ),
    hlsFirstSegmentObjects:
      HLS_FIRST_SEGMENT_FILES.map(
        readObject
      ),
    mp4Objects:
      MP4_FILES.map(
        readObject
      ),
    thumbnailObject:
      readObject(
        THUMBNAIL_FILE
      ),
  };
}

const productionDependencies:
  MediaTranscodeOutputEvidenceDependencies = {
    inspectMediaProcessedObject,
  };

export function readMediaTranscodeOutputEvidence(
  mediaId: string
): Promise<MediaTranscodeOutputEvidence> {
  return readMediaTranscodeOutputEvidenceWithDependencies(
    mediaId,
    productionDependencies
  );
}
