import assert from 'node:assert/strict';
import test from 'node:test';

import {
  readReadyMediaForPlaybackWithDependencies,
} from '@/lib/media-playback-ready-reader';

const MEDIA_ID =
  'efc7cf40-9dc5-4a0f-ae48-2259337eefc9';

const OWNER_ID =
  'ckjB6QzXeYTwsvy6RNLyCsqNPu53';

const GENERATION =
  '1790254933642665';

const OUTPUT_PREFIX =
  `media/processed/${MEDIA_ID}/`;

function createReadyMedia() {
  return {
    schemaVersion: 2,
    mediaId: MEDIA_ID,
    ownerId: OWNER_ID,
    sourceObject:
      `media/ingest/${OWNER_ID}/${MEDIA_ID}/tests-16s.mp4`,
    sourceFileName:
      'tests-16s.mp4',
    contentType:
      'video/mp4',
    declaredSizeBytes:
      39_189_031,
    status:
      'READY',
    verifiedGeneration:
      GENERATION,
    transcodeCompletedGeneration:
      GENERATION,
    transcoderJobName:
      'projects/823513556612/locations/me-central1/jobs/2d933b50-daf1-49c0-90bd-0f6da9a51fb6',
    processedOutputPrefix:
      OUTPUT_PREFIX,
    masterManifestObject:
      `${OUTPUT_PREFIX}master.m3u8`,
    hlsManifestObjects: [
      `${OUTPUT_PREFIX}hls-1080p.m3u8`,
      `${OUTPUT_PREFIX}hls-720p.m3u8`,
      `${OUTPUT_PREFIX}hls-480p.m3u8`,
    ],
    mp4Objects: [
      `${OUTPUT_PREFIX}video-1080p.mp4`,
      `${OUTPUT_PREFIX}video-720p.mp4`,
      `${OUTPUT_PREFIX}video-480p.mp4`,
    ],
    thumbnailObject:
      `${OUTPUT_PREFIX}thumbnail0000000000.jpeg`,
    transcodeCompletedAtMs:
      1_790_254_972_300,
  };
}

test(
  'reads exact canonical READY media for owner playback',
  async () => {
    let requestedMediaId =
      '';

    const result =
      await readReadyMediaForPlaybackWithDependencies(
        MEDIA_ID,
        {
          readMediaDocument:
            async (mediaId) => {
              requestedMediaId =
                mediaId;

              return createReadyMedia();
            },
        }
      );

    assert.equal(
      requestedMediaId,
      MEDIA_ID
    );

    assert.deepEqual(
      result,
      {
        mediaId:
          MEDIA_ID,
        ownerId:
          OWNER_ID,
        status:
          'READY',
        verifiedGeneration:
          GENERATION,
        transcoderJobName:
          'projects/823513556612/locations/me-central1/jobs/2d933b50-daf1-49c0-90bd-0f6da9a51fb6',
        outputPrefix:
          OUTPUT_PREFIX,
        masterManifestObject:
          `${OUTPUT_PREFIX}master.m3u8`,
        hlsManifestObjects: [
          `${OUTPUT_PREFIX}hls-1080p.m3u8`,
          `${OUTPUT_PREFIX}hls-720p.m3u8`,
          `${OUTPUT_PREFIX}hls-480p.m3u8`,
        ],
        mp4Objects: [
          `${OUTPUT_PREFIX}video-1080p.mp4`,
          `${OUTPUT_PREFIX}video-720p.mp4`,
          `${OUTPUT_PREFIX}video-480p.mp4`,
        ],
        thumbnailObject:
          `${OUTPUT_PREFIX}thumbnail0000000000.jpeg`,
        completedAtMs:
          1_790_254_972_300,
      }
    );
  }
);

test(
  'rejects missing and non READY media',
  async () => {
    await assert.rejects(
      readReadyMediaForPlaybackWithDependencies(
        MEDIA_ID,
        {
          readMediaDocument:
            async () => null,
        }
      ),
      /MEDIA_NOT_FOUND/
    );

    await assert.rejects(
      readReadyMediaForPlaybackWithDependencies(
        MEDIA_ID,
        {
          readMediaDocument:
            async () => ({
              ...createReadyMedia(),
              status:
                'TRANSCODING',
            }),
        }
      ),
      /INVALID_READY_MEDIA_PLAYBACK_METADATA/
    );
  }
);

test(
  'rejects forged output metadata',
  async () => {
    const forgedValues = [
      {
        ...createReadyMedia(),
        processedOutputPrefix:
          'media/processed/other/',
      },
      {
        ...createReadyMedia(),
        masterManifestObject:
          `${OUTPUT_PREFIX}../master.m3u8`,
      },
      {
        ...createReadyMedia(),
        mp4Objects: [
          `${OUTPUT_PREFIX}video-1080p.mp4`,
        ],
      },
      {
        ...createReadyMedia(),
        thumbnailObject:
          `${OUTPUT_PREFIX}other.jpeg`,
      },
    ];

    for (
      const value
      of forgedValues
    ) {
      await assert.rejects(
        readReadyMediaForPlaybackWithDependencies(
          MEDIA_ID,
          {
            readMediaDocument:
              async () => value,
          }
        ),
        /INVALID_READY_MEDIA_PLAYBACK_METADATA/
      );
    }
  }
);

test(
  'rejects unsafe media identity before Firestore access',
  async () => {
    let reads =
      0;

    await assert.rejects(
      readReadyMediaForPlaybackWithDependencies(
        '../forged',
        {
          readMediaDocument:
            async () => {
              reads += 1;

              return createReadyMedia();
            },
        }
      ),
      /INVALID_MEDIA_PLAYBACK_IDENTITY/
    );

    assert.equal(
      reads,
      0
    );
  }
);
