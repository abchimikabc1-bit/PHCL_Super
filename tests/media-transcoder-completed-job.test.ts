import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  MediaTranscodeJob,
} from '@/lib/media-transcode-job-config';

import {
  readCompletedMediaTranscodeJobWithDependencies,
  type MediaTranscoderCompletedJobInput,
} from '@/lib/media-transcoder-adapter';

const JOB_NAME =
  'projects/823513556612/locations/me-central1/jobs/job-123';

const INPUT:
  MediaTranscoderCompletedJobInput = {
    location:
      'me-central1',
    bucketName:
      'phcl-super-f0d21.firebasestorage.app',
    mediaId:
      'media-123',
    sourceObject:
      'media/ingest/user-123/media-123/source.mp4',
    verifiedGeneration:
      '123456789',
    transcoderJobName:
      JOB_NAME,
  };

function createSucceededJob():
  MediaTranscodeJob {
  return {
    name:
      JOB_NAME,
    state:
      'SUCCEEDED',
    labels: {
      phcl_media_id:
        INPUT.mediaId,
      phcl_generation:
        INPUT.verifiedGeneration,
      phcl_pipeline:
        'media-transcode-v1',
    },
    config: {
      inputs: [
        {
          key:
            'source',
          uri:
            `gs://${INPUT.bucketName}/${INPUT.sourceObject}`,
        },
      ],
      output: {
        uri:
          `gs://${INPUT.bucketName}/media/processed/${INPUT.mediaId}/`,
      },
    },
  };
}

test(
  'reads an exact authoritative succeeded media transcode job',
  async () => {
    let requestedName:
      string | null = null;

    const result =
      await readCompletedMediaTranscodeJobWithDependencies(
        INPUT,
        {
          getJob:
            async (name) => {
              requestedName =
                name;

              return createSucceededJob();
            },
        }
      );

    assert.equal(
      requestedName,
      JOB_NAME
    );

    assert.deepEqual(
      result,
      {
        jobName:
          JOB_NAME,
        state:
          'SUCCEEDED',
        mediaId:
          INPUT.mediaId,
        verifiedGeneration:
          INPUT.verifiedGeneration,
      }
    );
  }
);

test(
  'accepts the protobuf numeric SUCCEEDED state',
  async () => {
    const job =
      createSucceededJob();

    job.state =
      3;

    const result =
      await readCompletedMediaTranscodeJobWithDependencies(
        INPUT,
        {
          getJob:
            async () => job,
        }
      );

    assert.equal(
      result.state,
      'SUCCEEDED'
    );
  }
);

test(
  'rejects a media transcode job that has not succeeded',
  async () => {
    for (
      const state
      of [
        'PENDING',
        'RUNNING',
        'FAILED',
        1,
        2,
        4,
      ]
    ) {
      const job =
        createSucceededJob();

      job.state =
        state as never;

      await assert.rejects(
        readCompletedMediaTranscodeJobWithDependencies(
          INPUT,
          {
            getJob:
              async () => job,
          }
        ),
        /MEDIA_TRANSCODER_JOB_NOT_SUCCEEDED/
      );
    }
  }
);

test(
  'rejects mismatched completed job identity and storage configuration',
  async () => {
    const invalidJobs:
      MediaTranscodeJob[] = [
        {
          ...createSucceededJob(),
          name:
            'projects/823513556612/locations/me-central1/jobs/other-job',
        },
        {
          ...createSucceededJob(),
          labels: {
            ...createSucceededJob().labels,
            phcl_media_id:
              'other-media',
          },
        },
        {
          ...createSucceededJob(),
          labels: {
            ...createSucceededJob().labels,
            phcl_generation:
              '987654321',
          },
        },
        {
          ...createSucceededJob(),
          config: {
            ...createSucceededJob().config,
            inputs: [
              {
                key:
                  'source',
                uri:
                  'gs://attacker/source.mp4',
              },
            ],
          },
        },
        {
          ...createSucceededJob(),
          config: {
            ...createSucceededJob().config,
            output: {
              uri:
                'gs://attacker/output/',
            },
          },
        },
      ];

    for (
      const job
      of invalidJobs
    ) {
      await assert.rejects(
        readCompletedMediaTranscodeJobWithDependencies(
          INPUT,
          {
            getJob:
              async () => job,
          }
        ),
        /INVALID_MEDIA_TRANSCODER_COMPLETED_JOB/
      );
    }
  }
);

test(
  'rejects an unsafe or unexpected completed job resource name before API access',
  async () => {
    let calls =
      0;

    for (
      const transcoderJobName
      of [
        '../jobs/job-123',
        'projects/823513556612/locations/us-east1/jobs/job-123',
        'projects/823513556612/locations/me-central1/jobs/job/123',
      ]
    ) {
      await assert.rejects(
        readCompletedMediaTranscodeJobWithDependencies(
          {
            ...INPUT,
            transcoderJobName,
          },
          {
            getJob:
              async () => {
                calls +=
                  1;

                return createSucceededJob();
              },
          }
        ),
        /INVALID_MEDIA_TRANSCODER_COMPLETED_JOB/
      );
    }

    assert.equal(
      calls,
      0
    );
  }
);
