import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMediaValidationWork,
  MEDIA_VALIDATION_WORK_TYPE,
} from '@/lib/media-validation-work-authority';

const MEDIA_ID =
  'media_validation_work_001';

test(
  'builds deterministic validation work from only the authoritative media identity',
  () => {
    const first =
      buildMediaValidationWork(
        MEDIA_ID
      );

    const second =
      buildMediaValidationWork(
        MEDIA_ID
      );

    assert.deepEqual(
      first,
      second
    );

    assert.deepEqual(
      first,
      {
        workId:
          MEDIA_ID,

        mediaId:
          MEDIA_ID,

        workType:
          MEDIA_VALIDATION_WORK_TYPE,
      }
    );
  }
);

test(
  'rejects an invalid media identity',
  () => {
    assert.throws(
      () =>
        buildMediaValidationWork(
          ''
        ),
      /INVALID_MEDIA_VALIDATION_WORK/
    );

    assert.throws(
      () =>
        buildMediaValidationWork(
          ' media_validation_work_001'
        ),
      /INVALID_MEDIA_VALIDATION_WORK/
    );

    assert.throws(
      () =>
        buildMediaValidationWork(
          'media_validation_work_001 '
        ),
      /INVALID_MEDIA_VALIDATION_WORK/
    );
  }
);