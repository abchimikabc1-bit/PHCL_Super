import assert from 'node:assert/strict';
import test from 'node:test';

import {
  handleMediaTranscodeCompletionRequestWithDependencies,
} from '@/lib/media-transcode-completion-handler';

const JOB_NAME =
  'projects/823513556612/locations/me-central1/jobs/job-123';

function createRequest(): Request {
  return new Request(
    'https://worker.invalid/media-transcode-completion',
    {
      method:
        'POST',
      body:
        '{}',
    }
  );
}

test(
  'rejects unauthenticated completion request before parsing',
  async () => {
    let parsed =
      false;

    const response =
      await handleMediaTranscodeCompletionRequestWithDependencies(
        createRequest(),
        {
          authenticateRequest:
            async () => false,

          readInvocation:
            async () => {
              parsed =
                true;

              throw new Error(
                'UNEXPECTED_PARSE'
              );
            },

          executeMediaTranscodeCompletion:
            async () => null,
        }
      );

    assert.equal(
      response.status,
      401
    );

    assert.equal(
      parsed,
      false
    );
  }
);

test(
  'maps oversized and invalid authenticated completion requests',
  async () => {
    for (
      const scenario
      of [
        {
          error:
            'REQUEST_TOO_LARGE',
          status:
            413,
        },
        {
          error:
            'INVALID_MEDIA_TRANSCODE_COMPLETION_INVOCATION',
          status:
            400,
        },
      ]
    ) {
      let executed =
        false;

      const response =
        await handleMediaTranscodeCompletionRequestWithDependencies(
          createRequest(),
          {
            authenticateRequest:
              async () => true,

            readInvocation:
              async () => {
                throw new Error(
                  scenario.error
                );
              },

            executeMediaTranscodeCompletion:
              async () => {
                executed =
                  true;

                return null;
              },
          }
        );

      assert.equal(
        response.status,
        scenario.status
      );

      assert.equal(
        executed,
        false
      );
    }
  }
);

test(
  'acknowledges successful failed idempotent and unknown completion results',
  async () => {
    for (
      const result
      of [
        null,
        {
          mediaId:
            'media-123',
          status:
            'READY' as const,
          verifiedGeneration:
            '123',
          transcoderJobName:
            JOB_NAME,
          outputPrefix:
            'media/processed/media-123/',
          masterManifestObject:
            'media/processed/media-123/master.m3u8',
          mp4Objects: [
            'media/processed/media-123/video-1080p.mp4',
          ],
          thumbnailObject:
            'media/processed/media-123/thumbnail0000000000.jpeg',
          completedAtMs:
            1_790_200_000_000,
        },
        {
          mediaId:
            'media-123',
          status:
            'TRANSCODE_FAILED' as const,
          verifiedGeneration:
            '123',
          transcoderJobName:
            JOB_NAME,
          failureCode:
            'TRANSCODER_JOB_FAILED' as const,
          failedAtMs:
            1_790_200_000_000,
        },
      ]
    ) {
      let receivedJobName:
        string | null = null;

      const response =
        await handleMediaTranscodeCompletionRequestWithDependencies(
          createRequest(),
          {
            authenticateRequest:
              async () => true,

            readInvocation:
              async () => ({
                messageId:
                  'message-123',
                jobName:
                  JOB_NAME,
                state:
                  'SUCCEEDED',
              }),

            executeMediaTranscodeCompletion:
              async (invocation) => {
                receivedJobName =
                  invocation.jobName;

                return result;
              },
          }
        );

      assert.equal(
        response.status,
        204
      );

      assert.equal(
        receivedJobName,
        JOB_NAME
      );

      assert.equal(
        await response.text(),
        ''
      );
    }
  }
);

test(
  'preserves completion execution failure for Pub Sub retry',
  async () => {
    const failure =
      new Error(
        'TEST_COMPLETION_FAILURE'
      );

    await assert.rejects(
      handleMediaTranscodeCompletionRequestWithDependencies(
        createRequest(),
        {
          authenticateRequest:
            async () => true,

          readInvocation:
            async () => ({
              messageId:
                'message-123',
              jobName:
                JOB_NAME,
              state:
                'SUCCEEDED',
            }),

          executeMediaTranscodeCompletion:
            async () => {
              throw failure;
            },
        }
      ),
      (error) =>
        error === failure
    );
  }
);
