import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  MediaTranscodeWorkCompletionResult,
} from '@/lib/media-transcode-work-completion-authority';

import {
  consumeMediaTranscodeWorkWithDependencies,
} from '@/lib/media-transcode-work-consumer';

test(
  'consumer delegates the exact media id and returns the executor result unchanged',
  async () => {
    const calls: string[] = [];

    const expected:
      MediaTranscodeWorkCompletionResult = {
        mediaId:
          'media-123',
        status:
          'TRANSCODING',
        verifiedGeneration:
          '17',
        transcoderJobName:
          'projects/phcl-super-f0d21/locations/us-east1/jobs/job-123',
      };

    const result =
      await consumeMediaTranscodeWorkWithDependencies(
        'media-123',
        {
          executeMediaTranscodeWork:
            async (mediaId) => {
              calls.push(mediaId);

              return expected;
            },
        }
      );

    assert.deepEqual(
      calls,
      [
        'media-123',
      ]
    );

    assert.equal(
      result,
      expected
    );
  }
);

test(
  'consumer preserves null and operational executor failures',
  async () => {
    assert.equal(
      await consumeMediaTranscodeWorkWithDependencies(
        'media-123',
        {
          executeMediaTranscodeWork:
            async () =>
              null,
        }
      ),
      null
    );

    const expectedError =
      new Error(
        'TRANSCODE_EXECUTION_FAILED'
      );

    await assert.rejects(
      consumeMediaTranscodeWorkWithDependencies(
        'media-123',
        {
          executeMediaTranscodeWork:
            async () => {
              throw expectedError;
            },
        }
      ),
      (error: unknown) =>
        error === expectedError
    );
  }
);
