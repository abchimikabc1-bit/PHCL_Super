import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  MediaTranscodeJob,
} from '@/lib/media-transcode-job-config';

import {
  submitMediaTranscodeJobWithDependencies,
  type MediaTranscoderSubmissionInput,
} from '@/lib/media-transcoder-adapter';

const INPUT:
  MediaTranscoderSubmissionInput = {
    projectId:
      'phcl-super-f0d21',

    location:
      'me-central1',

    bucketName:
      'phcl-super-f0d21.firebasestorage.app',

    completionTopic:
      'projects/phcl-super-f0d21/topics/media-transcode-complete',

    mediaId:
      'media-123',

    sourceObject:
      'media/ingest/owner-123/media-123/source.mp4',

    verifiedGeneration:
      '17',
  };

const PARENT =
  'projects/phcl-super-f0d21/locations/me-central1';

const JOB_NAME =
  'projects/823513556612/locations/me-central1/jobs/job-123';

function matchingJob(
  name: string = JOB_NAME
): MediaTranscodeJob {
  return {
    name,

    labels: {
      phcl_media_id:
        INPUT.mediaId,

      phcl_generation:
        INPUT.verifiedGeneration,

      phcl_pipeline:
        'media-transcode-v1',
    },
  };
}

async function* jobs(
  values: MediaTranscodeJob[]
): AsyncIterable<MediaTranscodeJob> {
  for (
    const value
    of values
  ) {
    yield value;
  }
}

test(
  'reuses the exact existing transcode job without creating a duplicate',
  async () => {
    const listCalls: unknown[] = [];

    let createCalls = 0;

    const result =
      await submitMediaTranscodeJobWithDependencies(
        INPUT,
        {
          listJobs: (
            parent,
            filter
          ) => {
            listCalls.push({
              parent,
              filter,
            });

            return jobs([
              matchingJob(),
            ]);
          },

          createJob:
            async () => {
              createCalls += 1;

              return matchingJob();
            },
        }
      );

    assert.deepEqual(
      result,
      {
        jobName:
          JOB_NAME,

        created:
          false,
      }
    );

    assert.equal(
      createCalls,
      0
    );

    assert.deepEqual(
      listCalls,
      [
        {
          parent:
            PARENT,

          filter:
            'labels.phcl_media_id:media-123 AND labels.phcl_generation:17 AND labels.phcl_pipeline:media-transcode-v1',
        },
      ]
    );
  }
);

test(
  'creates a canonical job when reconciliation finds no exact match',
  async () => {
    const createCalls:
      Array<{
        parent: string;
        job: MediaTranscodeJob;
      }> = [];

    const result =
      await submitMediaTranscodeJobWithDependencies(
        INPUT,
        {
          listJobs: () =>
            jobs([]),

          createJob:
            async (
              parent,
              job
            ) => {
              createCalls.push({
                parent,
                job,
              });

              return {
                ...job,

                name:
                  JOB_NAME,
              };
            },
        }
      );

    assert.deepEqual(
      result,
      {
        jobName:
          JOB_NAME,

        created:
          true,
      }
    );

    assert.equal(
      createCalls.length,
      1
    );

    assert.equal(
      createCalls[0]?.parent,
      PARENT
    );

    assert.deepEqual(
      createCalls[0]?.job.labels,
      {
        phcl_media_id:
          INPUT.mediaId,

        phcl_generation:
          INPUT.verifiedGeneration,

        phcl_pipeline:
          'media-transcode-v1',
      }
    );
  }
);

test(
  'ignores filtered results that do not have the exact authoritative identity',
  async () => {
    let createCalls = 0;

    const result =
      await submitMediaTranscodeJobWithDependencies(
        INPUT,
        {
          listJobs: () =>
            jobs([
              {
                ...matchingJob(),

                labels: {
                  ...matchingJob().labels,

                  phcl_generation:
                    '18',
                },
              },
            ]),

          createJob:
            async (
              _parent,
              job
            ) => {
              createCalls += 1;

              return {
                ...job,

                name:
                  JOB_NAME,
              };
            },
        }
      );

    assert.equal(
      result.created,
      true
    );

    assert.equal(
      createCalls,
      1
    );
  }
);

test(
  'fails closed when reconciliation finds duplicate exact jobs',
  async () => {
    await assert.rejects(
      submitMediaTranscodeJobWithDependencies(
        INPUT,
        {
          listJobs: () =>
            jobs([
              matchingJob(
                'projects/823513556612/locations/me-central1/jobs/job-1'
              ),

              matchingJob(
                'projects/823513556612/locations/me-central1/jobs/job-2'
              ),
            ]),

          createJob:
            async () =>
              matchingJob(),
        }
      ),
      /AMBIGUOUS_MEDIA_TRANSCODER_JOBS/
    );
  }
);

test(
  'rejects a created job with missing or mismatched identity',
  async () => {
    await assert.rejects(
      submitMediaTranscodeJobWithDependencies(
        INPUT,
        {
          listJobs: () =>
            jobs([]),

          createJob:
            async () => ({
              name:
                JOB_NAME,

              labels: {
                phcl_media_id:
                  INPUT.mediaId,

                phcl_generation:
                  '18',

                phcl_pipeline:
                  'media-transcode-v1',
              },
            }),
        }
      ),
      /INVALID_MEDIA_TRANSCODER_JOB/
    );
  }
);

test(
  'rejects a job from an unexpected location',
  async () => {
    await assert.rejects(
      submitMediaTranscodeJobWithDependencies(
        INPUT,
        {
          listJobs: () =>
            jobs([
              matchingJob(
                'projects/823513556612/locations/us-east1/jobs/job-123'
              ),
            ]),

          createJob:
            async () =>
              matchingJob(),
        }
      ),
      /INVALID_MEDIA_TRANSCODER_JOB/
    );
  }
);

test(
  'rejects an unsafe job resource name',
  async () => {
    await assert.rejects(
      submitMediaTranscodeJobWithDependencies(
        INPUT,
        {
          listJobs: () =>
            jobs([
              matchingJob(
                'projects/823513556612/locations/me-central1/jobs/job-123/nested'
              ),
            ]),

          createJob:
            async () =>
              matchingJob(),
        }
      ),
      /INVALID_MEDIA_TRANSCODER_JOB/
    );
  }
);

test(
  'rejects unsafe configuration before listing or creating jobs',
  async () => {
    let dependencyCalls = 0;

    await assert.rejects(
      submitMediaTranscodeJobWithDependencies(
        {
          ...INPUT,

          location:
            '../me-central1',
        },
        {
          listJobs: () => {
            dependencyCalls += 1;

            return jobs([]);
          },

          createJob:
            async () => {
              dependencyCalls += 1;

              return matchingJob();
            },
        }
      ),
      /INVALID_MEDIA_TRANSCODER_SUBMISSION/
    );

    assert.equal(
      dependencyCalls,
      0
    );
  }
);