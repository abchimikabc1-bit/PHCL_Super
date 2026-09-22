import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMediaTranscodeJob,
  buildMediaTranscodeOutputPrefix,
} from '@/lib/media-transcode-job-config';

const INPUT = {
  bucketName:
    'phcl-super-f0d21.firebasestorage.app',
  mediaId:
    'media_123',
  sourceObject:
    'media/ingest/owner_123/media_123/video.mp4',
  verifiedGeneration:
    '1790073095040642',
  completionTopic:
    'projects/phcl-super-f0d21/topics/media-transcode-complete',
} as const;

test(
  'builds a canonical processed output prefix',
  () => {
    assert.equal(
      buildMediaTranscodeOutputPrefix(
        INPUT.bucketName,
        INPUT.mediaId
      ),
      'gs://phcl-super-f0d21.firebasestorage.app/media/processed/media_123/'
    );
  }
);

test(
  'builds HLS MP4 and thumbnail outputs for three renditions',
  () => {
    const job =
      buildMediaTranscodeJob(
        INPUT
      );

    assert.deepEqual(
      job.labels,
      {
        phcl_media_id:
          INPUT.mediaId,
        phcl_generation:
          INPUT.verifiedGeneration,
        phcl_pipeline:
          'media-transcode-v1',
      }
    );

    assert.equal(
      job.config?.inputs?.[0]?.uri,
      `gs://${INPUT.bucketName}/${INPUT.sourceObject}`
    );

    assert.equal(
      job.config?.output?.uri,
      'gs://phcl-super-f0d21.firebasestorage.app/media/processed/media_123/'
    );

    assert.deepEqual(
      job.config?.elementaryStreams
        ?.filter(
          (stream) =>
            stream.videoStream
        )
        .map(
          (stream) => ({
            key:
              stream.key,
            height:
              stream.videoStream
                ?.h264
                ?.heightPixels,
            bitrate:
              stream.videoStream
                ?.h264
                ?.bitrateBps,
          })
        ),
      [
        {
          key: 'video-1080p',
          height: 1080,
          bitrate: 5_000_000,
        },
        {
          key: 'video-720p',
          height: 720,
          bitrate: 2_500_000,
        },
        {
          key: 'video-480p',
          height: 480,
          bitrate: 1_000_000,
        },
      ]
    );

    assert.equal(
      job.config?.muxStreams
        ?.filter(
          (stream) =>
            stream.container === 'ts'
        ).length,
      3
    );

    assert.deepEqual(
      job.config?.muxStreams
        ?.filter(
          (stream) =>
            stream.container === 'mp4'
        )
        .map(
          (stream) =>
            stream.fileName
        ),
      [
        'video-1080p.mp4',
        'video-720p.mp4',
        'video-480p.mp4',
      ]
    );

    assert.deepEqual(
      job.config?.manifests?.[0],
      {
        fileName:
          'master.m3u8',
        type:
          'HLS',
        muxStreams: [
          'hls-1080p',
          'hls-720p',
          'hls-480p',
        ],
      }
    );

    assert.deepEqual(
      job.config?.spriteSheets?.[0],
      {
        format:
          'jpeg',
        filePrefix:
          'thumbnail',
        spriteWidthPixels:
          640,
        columnCount:
          1,
        rowCount:
          1,
        startTimeOffset: {
          seconds:
            1,
        },
        totalCount:
          1,
        quality:
          85,
      }
    );
  }
);

test(
  'rejects unsafe or noncanonical job configuration input',
  () => {
    assert.throws(
      () =>
        buildMediaTranscodeJob({
          ...INPUT,
          mediaId:
            '../media',
        }),
      /INVALID_MEDIA_TRANSCODE_JOB_CONFIG/
    );

    assert.throws(
      () =>
        buildMediaTranscodeJob({
          ...INPUT,
          sourceObject:
            'media/ingest/owner/other/video.mp4',
        }),
      /INVALID_MEDIA_TRANSCODE_JOB_CONFIG/
    );

    assert.throws(
      () =>
        buildMediaTranscodeJob({
          ...INPUT,
          completionTopic:
            'https://example.test/topic',
        }),
      /INVALID_MEDIA_TRANSCODE_JOB_CONFIG/
    );
  }
);
