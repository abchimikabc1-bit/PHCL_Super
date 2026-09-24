import assert from 'node:assert/strict';
import test from 'node:test';

import {
  executeMediaTranscodeCompletionWithDependencies,
  type MediaTranscodeCompletionOrchestratorDependencies,
} from '@/lib/media-transcode-completion-orchestrator';

const JOB_NAME =
  'projects/823513556612/locations/me-central1/jobs/job-123';

const SOURCE_OBJECT =
  'media/ingest/owner-123/media-123/source.mp4';

const OUTPUT_EVIDENCE = {
  mediaId:
    'media-123',
  outputPrefix:
    'media/processed/media-123/',
  masterManifestObject:
    'media/processed/media-123/master.m3u8',
  hlsManifestObjects: [
    'media/processed/media-123/hls-1080p.m3u8',
    'media/processed/media-123/hls-720p.m3u8',
    'media/processed/media-123/hls-480p.m3u8',
  ],
  hlsFirstSegmentObjects: [
    'media/processed/media-123/hls-1080p0000000000.ts',
    'media/processed/media-123/hls-720p0000000000.ts',
    'media/processed/media-123/hls-480p0000000000.ts',
  ],
  mp4Objects: [
    'media/processed/media-123/video-1080p.mp4',
    'media/processed/media-123/video-720p.mp4',
    'media/processed/media-123/video-480p.mp4',
  ],
  thumbnailObject:
    'media/processed/media-123/thumbnail0000000000.jpeg',
};

function createDependencies():
  MediaTranscodeCompletionOrchestratorDependencies {
  return {
    nowMs: () =>
      1_790_200_000_000,

    readMediaTranscodeCompletionEvidence:
      async () => ({
        mediaId:
          'media-123',
        sourceObject:
          SOURCE_OBJECT,
        verifiedGeneration:
          '123',
        transcoderJobName:
          JOB_NAME,
        status:
          'TRANSCODING',
      }),

    readMediaTranscoderRuntimeConfig:
      () => ({
        projectId:
          'phcl-super-f0d21',
        location:
          'me-central1',
        bucketName:
          'phcl-super-f0d21.firebasestorage.app',
        completionTopic:
          'projects/phcl-super-f0d21/topics/media-transcode-complete',
      }),

    readCompletedMediaTranscodeJob:
      async () => ({
        jobName:
          JOB_NAME,
        state:
          'SUCCEEDED',
        mediaId:
          'media-123',
        verifiedGeneration:
          '123',
      }),

    readMediaTranscodeOutputEvidence:
      async () =>
        OUTPUT_EVIDENCE,

    completeMediaTranscodeProcessing:
      async (input) => ({
        mediaId:
          input.mediaId,
        status:
          'READY',
        verifiedGeneration:
          input.verifiedGeneration,
        transcoderJobName:
          input.transcoderJobName,
        outputPrefix:
          input.outputEvidence.outputPrefix,
        masterManifestObject:
          input.outputEvidence.masterManifestObject,
        mp4Objects:
          input.outputEvidence.mp4Objects,
        thumbnailObject:
          input.outputEvidence.thumbnailObject,
        completedAtMs:
          input.nowMs,
      }),

    failMediaTranscodeProcessing:
      async (input) => ({
        mediaId:
          input.mediaId,
        status:
          'TRANSCODE_FAILED',
        verifiedGeneration:
          input.verifiedGeneration,
        transcoderJobName:
          input.transcoderJobName,
        failureCode:
          'TRANSCODER_JOB_FAILED',
        failedAtMs:
          input.nowMs,
      }),
  };
}

test(
  'verifies the exact completed job and outputs before atomically completing media',
  async () => {
    const dependencies =
      createDependencies();

    const calls:
      string[] = [];

    const originalReadEvidence =
      dependencies.readMediaTranscodeCompletionEvidence;
    const originalReadConfig =
      dependencies.readMediaTranscoderRuntimeConfig;
    const originalReadJob =
      dependencies.readCompletedMediaTranscodeJob;
    const originalReadOutputs =
      dependencies.readMediaTranscodeOutputEvidence;
    const originalComplete =
      dependencies.completeMediaTranscodeProcessing;

    dependencies.readMediaTranscodeCompletionEvidence =
      async (jobName) => {
        calls.push('evidence');
        assert.equal(jobName, JOB_NAME);
        return originalReadEvidence(jobName);
      };

    dependencies.readMediaTranscoderRuntimeConfig =
      () => {
        calls.push('config');
        return originalReadConfig();
      };

    dependencies.readCompletedMediaTranscodeJob =
      async (input) => {
        calls.push('job');
        assert.deepEqual(input, {
          location:
            'me-central1',
          bucketName:
            'phcl-super-f0d21.firebasestorage.app',
          mediaId:
            'media-123',
          sourceObject:
            SOURCE_OBJECT,
          verifiedGeneration:
            '123',
          transcoderJobName:
            JOB_NAME,
        });
        return originalReadJob(input);
      };

    dependencies.readMediaTranscodeOutputEvidence =
      async (mediaId) => {
        calls.push('outputs');
        assert.equal(mediaId, 'media-123');
        return originalReadOutputs(mediaId);
      };

    dependencies.completeMediaTranscodeProcessing =
      async (input) => {
        calls.push('complete');
        assert.deepEqual(input, {
          mediaId:
            'media-123',
          sourceObject:
            SOURCE_OBJECT,
          verifiedGeneration:
            '123',
          transcoderJobName:
            JOB_NAME,
          outputEvidence:
            OUTPUT_EVIDENCE,
          nowMs:
            1_790_200_000_000,
        });
        return originalComplete(input);
      };

    const result =
      await executeMediaTranscodeCompletionWithDependencies(
        {
          messageId:
            'message-123',
          jobName:
            JOB_NAME,
          state:
            'SUCCEEDED',
        },
        dependencies
      );

    assert.equal(
      result?.status,
      'READY'
    );

    assert.deepEqual(
      calls,
      [
        'evidence',
        'config',
        'job',
        'outputs',
        'complete',
      ]
    );
  }
);

test(
  'returns null for an unrecognized job without reading external job or output state',
  async () => {
    const dependencies =
      createDependencies();

    dependencies.readMediaTranscodeCompletionEvidence =
      async () => null;

    dependencies.readMediaTranscoderRuntimeConfig =
      () => {
        assert.fail(
          'runtime configuration must not be read'
        );
      };

    dependencies.readCompletedMediaTranscodeJob =
      async () => {
        return assert.fail(
          'Transcoder must not be read'
        );
      };

    dependencies.readMediaTranscodeOutputEvidence =
      async () => {
        return assert.fail(
          'Storage must not be read'
        );
      };

    dependencies.completeMediaTranscodeProcessing =
      async () => {
        return assert.fail(
          'media must not be completed'
        );
      };

    assert.equal(
      await executeMediaTranscodeCompletionWithDependencies(
        {
          messageId:
            'message-123',
          jobName:
            JOB_NAME,
          state:
            'SUCCEEDED',
        },
        dependencies
      ),
      null
    );
  }
);

test(
  'atomically records a failed Transcoder notification without reading job or output state',
  async () => {
    const dependencies =
      createDependencies();

    dependencies.readMediaTranscoderRuntimeConfig =
      () => {
        assert.fail(
          'runtime configuration must not be read'
        );
      };

    dependencies.readCompletedMediaTranscodeJob =
      async () => {
        return assert.fail(
          'Transcoder must not be read'
        );
      };

    dependencies.readMediaTranscodeOutputEvidence =
      async () => {
        return assert.fail(
          'Storage must not be read'
        );
      };

    let failureInput:
      Parameters<
        typeof dependencies.failMediaTranscodeProcessing
      >[0] | null = null;

    const originalFail =
      dependencies.failMediaTranscodeProcessing;

    dependencies.failMediaTranscodeProcessing =
      async (input) => {
        failureInput =
          input;
        return originalFail(input);
      };

    const result =
      await executeMediaTranscodeCompletionWithDependencies(
        {
          messageId:
            'message-123',
          jobName:
            JOB_NAME,
          state:
            'FAILED',
        },
        dependencies
      );

    assert.equal(
      result?.status,
      'TRANSCODE_FAILED'
    );

    assert.deepEqual(
      failureInput,
      {
        mediaId:
          'media-123',
        sourceObject:
          SOURCE_OBJECT,
        verifiedGeneration:
          '123',
        transcoderJobName:
          JOB_NAME,
        nowMs:
          1_790_200_000_000,
      }
    );
  }
);

test(
  'rejects conflicting terminal notification state',
  async () => {
    for (
      const conflict
      of [
        {
          invocationState:
            'FAILED' as const,
          mediaStatus:
            'READY' as const,
        },
        {
          invocationState:
            'SUCCEEDED' as const,
          mediaStatus:
            'TRANSCODE_FAILED' as const,
        },
      ]
    ) {
      const dependencies =
        createDependencies();

      dependencies.readMediaTranscodeCompletionEvidence =
        async () => ({
          mediaId:
            'media-123',
          sourceObject:
            SOURCE_OBJECT,
          verifiedGeneration:
            '123',
          transcoderJobName:
            JOB_NAME,
          status:
            conflict.mediaStatus,
        });

      await assert.rejects(
        executeMediaTranscodeCompletionWithDependencies(
          {
            messageId:
              'message-123',
            jobName:
              JOB_NAME,
            state:
              conflict.invocationState,
          },
          dependencies
        ),
        /MEDIA_TRANSCODE_COMPLETION_MISMATCH/
      );
    }
  }
);

test(
  'rejects mismatched completed job authority before inspecting outputs',
  async () => {
    const dependencies =
      createDependencies();

    dependencies.readCompletedMediaTranscodeJob =
      async () => ({
        jobName:
          JOB_NAME,
        state:
          'SUCCEEDED',
        mediaId:
          'other-media',
        verifiedGeneration:
          '123',
      });

    dependencies.readMediaTranscodeOutputEvidence =
      async () => {
        return assert.fail(
          'Storage must not be read'
        );
      };

    await assert.rejects(
      executeMediaTranscodeCompletionWithDependencies(
        {
          messageId:
            'message-123',
          jobName:
            JOB_NAME,
          state:
            'SUCCEEDED',
        },
        dependencies
      ),
      /MEDIA_TRANSCODE_COMPLETION_MISMATCH/
    );
  }
);

test(
  'preserves operational failures for Pub Sub retry',
  async () => {
    for (
      const stage
      of [
        'job',
        'outputs',
        'complete',
        'failure',
      ] as const
    ) {
      const dependencies =
        createDependencies();

      const failure =
        new Error(
          `TEST_${stage.toUpperCase()}_FAILURE`
        );

      if (stage === 'job') {
        dependencies.readCompletedMediaTranscodeJob =
          async () => {
            throw failure;
          };
      }

      if (stage === 'outputs') {
        dependencies.readMediaTranscodeOutputEvidence =
          async () => {
            throw failure;
          };
      }

      if (stage === 'complete') {
        dependencies.completeMediaTranscodeProcessing =
          async () => {
            throw failure;
          };
      }

      if (stage === 'failure') {
        dependencies.failMediaTranscodeProcessing =
          async () => {
            throw failure;
          };
      }

      await assert.rejects(
        executeMediaTranscodeCompletionWithDependencies(
          {
            messageId:
              'message-123',
            jobName:
              JOB_NAME,
            state:
              stage === 'failure'
                ? 'FAILED'
                : 'SUCCEEDED',
          },
          dependencies
        ),
        (error) =>
          error === failure
      );
    }
  }
);
