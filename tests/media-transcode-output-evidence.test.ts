import assert from 'node:assert/strict';
import test from 'node:test';

import {
  readMediaTranscodeOutputEvidenceWithDependencies,
} from '@/lib/media-transcode-output-evidence';

const MEDIA_ID =
  'media-123';

const REQUIRED_FILES = [
  'master.m3u8',
  'hls-1080p.m3u8',
  'hls-720p.m3u8',
  'hls-480p.m3u8',
  'hls-1080p0000000000.ts',
  'hls-720p0000000000.ts',
  'hls-480p0000000000.ts',
  'video-1080p.mp4',
  'video-720p.mp4',
  'video-480p.mp4',
  'thumbnail0000000000.jpeg',
];

function objectPath(
  fileName: string
): string {
  return (
    `media/processed/${MEDIA_ID}/` +
    fileName
  );
}

test(
  'reads exact usable HLS MP4 and thumbnail output evidence',
  async () => {
    const inspected:
      string[] = [];

    const evidence =
      await readMediaTranscodeOutputEvidenceWithDependencies(
        MEDIA_ID,
        {
          inspectMediaProcessedObject:
            async (
              receivedMediaId,
              fileName
            ) => {
              assert.equal(
                receivedMediaId,
                MEDIA_ID
              );

              inspected.push(
                fileName
              );

              return {
                path:
                  objectPath(
                    fileName
                  ),
                exists:
                  true,
                size:
                  1024,
                contentType:
                  null,
                generation:
                  '123',
              };
            },
        }
      );

    assert.deepEqual(
      inspected,
      REQUIRED_FILES
    );

    assert.deepEqual(
      evidence,
      {
        mediaId:
          MEDIA_ID,
        outputPrefix:
          `media/processed/${MEDIA_ID}/`,
        masterManifestObject:
          objectPath(
            'master.m3u8'
          ),
        hlsManifestObjects: [
          objectPath(
            'hls-1080p.m3u8'
          ),
          objectPath(
            'hls-720p.m3u8'
          ),
          objectPath(
            'hls-480p.m3u8'
          ),
        ],
        hlsFirstSegmentObjects: [
          objectPath(
            'hls-1080p0000000000.ts'
          ),
          objectPath(
            'hls-720p0000000000.ts'
          ),
          objectPath(
            'hls-480p0000000000.ts'
          ),
        ],
        mp4Objects: [
          objectPath(
            'video-1080p.mp4'
          ),
          objectPath(
            'video-720p.mp4'
          ),
          objectPath(
            'video-480p.mp4'
          ),
        ],
        thumbnailObject:
          objectPath(
            'thumbnail0000000000.jpeg'
          ),
      }
    );
  }
);

test(
  'rejects a missing or empty required transcode output',
  async () => {
    for (
      const invalidObject
      of [
        {
          exists:
            false,
          size:
            null,
        },
        {
          exists:
            true,
          size:
            0,
        },
        {
          exists:
            true,
          size:
            null,
        },
      ]
    ) {
      await assert.rejects(
        readMediaTranscodeOutputEvidenceWithDependencies(
          MEDIA_ID,
          {
            inspectMediaProcessedObject:
              async (
                _mediaId,
                fileName
              ) => ({
                path:
                  objectPath(
                    fileName
                  ),
                exists:
                  invalidObject.exists,
                size:
                  invalidObject.size,
                contentType:
                  null,
                generation:
                  null,
              }),
          }
        ),
        /MEDIA_TRANSCODE_OUTPUT_INCOMPLETE/
      );
    }
  }
);

test(
  'rejects storage evidence for an unexpected object path',
  async () => {
    await assert.rejects(
      readMediaTranscodeOutputEvidenceWithDependencies(
        MEDIA_ID,
        {
          inspectMediaProcessedObject:
            async () => ({
              path:
                'media/processed/other-media/master.m3u8',
              exists:
                true,
              size:
                1024,
              contentType:
                null,
              generation:
                '123',
            }),
        }
      ),
      /MEDIA_TRANSCODE_OUTPUT_INCOMPLETE/
    );
  }
);

test(
  'rejects an unsafe media id before storage inspection',
  async () => {
    let inspections =
      0;

    await assert.rejects(
      readMediaTranscodeOutputEvidenceWithDependencies(
        '../media-123',
        {
          inspectMediaProcessedObject:
            async () => {
              inspections +=
                1;

              throw new Error(
                'UNEXPECTED_INSPECTION'
              );
            },
        }
      ),
      /INVALID_MEDIA_TRANSCODE_OUTPUT/
    );

    assert.equal(
      inspections,
      0
    );
  }
);
