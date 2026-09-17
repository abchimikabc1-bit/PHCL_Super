import assert from 'node:assert/strict';
import test from 'node:test';

import {
  consumeMediaValidationWorkWithDependencies,
} from '@/lib/media-validation-work-consumer';

test(
  'consumer delegates the exact media id to the validation work executor',
  async () => {
    const calls: string[] = [];

    const result =
      await consumeMediaValidationWorkWithDependencies(
        'media-123',
        {
          executeMediaValidationWork:
            async (mediaId) => {
              calls.push(mediaId);

              return null;
            },
        }
      );

    assert.deepEqual(
      calls,
      ['media-123']
    );

    assert.equal(
      result,
      null
    );
  }
);

test(
  'consumer returns the executor result unchanged',
  async () => {
    const expected = {
      mediaId: 'media-456',
      status: 'VALIDATED',
      verifiedGeneration: '17',
    } as const;

    const result =
      await consumeMediaValidationWorkWithDependencies(
        'media-456',
        {
          executeMediaValidationWork:
            async () => expected,
        }
      );

    assert.equal(
      result,
      expected
    );
  }
);

test(
  'consumer preserves executor failures',
  async () => {
    const expectedError =
      new Error(
        'VALIDATION_EXECUTION_FAILED'
      );

    await assert.rejects(
      consumeMediaValidationWorkWithDependencies(
        'media-789',
        {
          executeMediaValidationWork:
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