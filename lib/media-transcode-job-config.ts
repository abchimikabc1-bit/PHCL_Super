import 'server-only';

import type {
  protos,
} from '@google-cloud/video-transcoder';

import {
  buildMediaIngestPath,
} from '@/lib/media-storage-paths';

const SAFE_BUCKET_PATTERN =
  /^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/;

const SAFE_GENERATION_PATTERN =
  /^[0-9]{1,32}$/;

const RENDITIONS = [
  {
    name: '1080p',
    heightPixels: 1080,
    bitrateBps: 5_000_000,
  },
  {
    name: '720p',
    heightPixels: 720,
    bitrateBps: 2_500_000,
  },
  {
    name: '480p',
    heightPixels: 480,
    bitrateBps: 1_000_000,
  },
] as const;

export type MediaTranscodeJobConfigInput = {
  bucketName: string;
  mediaId: string;
  sourceObject: string;
  verifiedGeneration: string;
  completionTopic: string;
};

export type MediaTranscodeJob =
  protos.google.cloud.video.transcoder.v1.IJob;

function invalidConfig(): never {
  throw new Error(
    'INVALID_MEDIA_TRANSCODE_JOB_CONFIG'
  );
}

function assertInput(
  input: MediaTranscodeJobConfigInput
): void {
  if (
    !SAFE_BUCKET_PATTERN.test(
      input.bucketName
    ) ||
    !SAFE_GENERATION_PATTERN.test(
      input.verifiedGeneration
    ) ||
    !/^projects\/[a-z][a-z0-9-]{4,28}[a-z0-9]\/topics\/[A-Za-z][A-Za-z0-9._~-]{2,254}$/.test(
      input.completionTopic
    )
  ) {
    return invalidConfig();
  }

  try {
    buildMediaIngestPath(
      'transcode-config',
      input.mediaId,
      'source.mp4'
    );
  } catch {
    return invalidConfig();
  }

  const sourcePrefix =
    'media/ingest/';

  if (
    input.sourceObject.trim() !==
      input.sourceObject ||
    !input.sourceObject.startsWith(
      sourcePrefix
    ) ||
    !input.sourceObject.includes(
      `/${input.mediaId}/`
    ) ||
    input.sourceObject.includes('..') ||
    input.sourceObject.includes('\\')
  ) {
    return invalidConfig();
  }
}

export function buildMediaTranscodeOutputPrefix(
  bucketName: string,
  mediaId: string
): string {
  assertInput({
    bucketName,
    mediaId,
    sourceObject:
      `media/ingest/transcode-config/${mediaId}/source.mp4`,
    verifiedGeneration:
      '1',
    completionTopic:
      'projects/phcl-super/topics/media-transcode-complete',
  });

  return (
    `gs://${bucketName}/` +
    `media/processed/${mediaId}/`
  );
}

export function buildMediaTranscodeJob(
  input: MediaTranscodeJobConfigInput
): MediaTranscodeJob {
  assertInput(
    input
  );

  const videoStreams =
    RENDITIONS.map(
      (rendition) => ({
        key:
          `video-${rendition.name}`,

        videoStream: {
          h264: {
            heightPixels:
              rendition.heightPixels,
            frameRate:
              30,
            bitrateBps:
              rendition.bitrateBps,
            pixelFormat:
              'yuv420p',
            rateControlMode:
              'vbr',
            enableTwoPass:
              true,
            gopDuration: {
              seconds:
                3,
            },
          },
        },
      })
    );

  const hlsMuxStreams =
    RENDITIONS.map(
      (rendition) => ({
        key:
          `hls-${rendition.name}`,
        fileName:
          `hls-${rendition.name}.ts`,
        container:
          'ts',
        elementaryStreams: [
          `video-${rendition.name}`,
          'audio-main',
        ],
        segmentSettings: {
          segmentDuration: {
            seconds:
              6,
          },
          individualSegments:
            true,
        },
      })
    );

  const mp4MuxStreams =
    RENDITIONS.map(
      (rendition) => ({
        key:
          `mp4-${rendition.name}`,
        fileName:
          `video-${rendition.name}.mp4`,
        container:
          'mp4',
        elementaryStreams: [
          `video-${rendition.name}`,
          'audio-main',
        ],
      })
    );

  return {
    labels: {
      phcl_media_id:
        input.mediaId,
      phcl_generation:
        input.verifiedGeneration,
      phcl_pipeline:
        'media-transcode-v1',
    },

    ttlAfterCompletionDays:
      30,

    config: {
      inputs: [
        {
          key:
            'source',
          uri:
            `gs://${input.bucketName}/${input.sourceObject}`,
        },
      ],

      editList: [
        {
          key:
            'source-atom',
          inputs: [
            'source',
          ],
        },
      ],

      elementaryStreams: [
        ...videoStreams,
        {
          key:
            'audio-main',
          audioStream: {
            codec:
              'aac',
            bitrateBps:
              128_000,
            channelCount:
              2,
            channelLayout: [
              'fl',
              'fr',
            ],
            sampleRateHertz:
              48_000,
          },
        },
      ],

      muxStreams: [
        ...hlsMuxStreams,
        ...mp4MuxStreams,
      ],

      manifests: [
        {
          fileName:
            'master.m3u8',
          type:
            'HLS',
          muxStreams:
            RENDITIONS.map(
              (rendition) =>
                `hls-${rendition.name}`
            ),
        },
      ],

      output: {
        uri:
          `gs://${input.bucketName}/media/processed/${input.mediaId}/`,
      },

      pubsubDestination: {
        topic:
          input.completionTopic,
      },

      spriteSheets: [
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
        },
      ],
    },
  };
}
