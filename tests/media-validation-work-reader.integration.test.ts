import 'server-only';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  MEDIA_VALIDATION_WORK_TYPE,
} from '@/lib/media-validation-work-authority';

import {
  readMediaValidationWork,
} from '@/lib/media-validation-work-reader';

const MEDIA_VALIDATION_WORK_COLLECTION =
  'mediaValidationWork';

const TEST_MEDIA_ID =
  'media-validation-work-reader-test';

async function deleteTestWork(): Promise<void> {
  await adminDb
    .collection(
      MEDIA_VALIDATION_WORK_COLLECTION
    )
    .doc(TEST_MEDIA_ID)
    .delete();
}

test.beforeEach(
  async () => {
    await deleteTestWork();
  }
);

test.after(
  async () => {
    await deleteTestWork();
  }
);

test(
  'reads authoritative durable media validation work',
  async () => {
    await adminDb
      .collection(
        MEDIA_VALIDATION_WORK_COLLECTION
      )
      .doc(TEST_MEDIA_ID)
      .set({
        workId:
          TEST_MEDIA_ID,

        mediaId:
          TEST_MEDIA_ID,

        workType:
          MEDIA_VALIDATION_WORK_TYPE,
      });

    const work =
      await readMediaValidationWork(
        TEST_MEDIA_ID
      );

    assert.deepEqual(
      work,
      {
        workId:
          TEST_MEDIA_ID,

        mediaId:
          TEST_MEDIA_ID,

        workType:
          MEDIA_VALIDATION_WORK_TYPE,
      }
    );
  }
);

test(
  'returns null when durable validation work does not exist',
  async () => {
    const work =
      await readMediaValidationWork(
        TEST_MEDIA_ID
      );

    assert.equal(
      work,
      null
    );
  }
);

test(
  'rejects durable work whose workId does not match mediaId',
  async () => {
    await adminDb
      .collection(
        MEDIA_VALIDATION_WORK_COLLECTION
      )
      .doc(TEST_MEDIA_ID)
      .set({
        workId:
          'different-media-id',

        mediaId:
          TEST_MEDIA_ID,

        workType:
          MEDIA_VALIDATION_WORK_TYPE,
      });

    await assert.rejects(
      () =>
        readMediaValidationWork(
          TEST_MEDIA_ID
        ),
      /INVALID_MEDIA_VALIDATION_WORK/
    );
  }
);

test(
  'rejects durable work with the wrong work type',
  async () => {
    await adminDb
      .collection(
        MEDIA_VALIDATION_WORK_COLLECTION
      )
      .doc(TEST_MEDIA_ID)
      .set({
        workId:
          TEST_MEDIA_ID,

        mediaId:
          TEST_MEDIA_ID,

        workType:
          'OTHER_WORK_TYPE',
      });

    await assert.rejects(
      () =>
        readMediaValidationWork(
          TEST_MEDIA_ID
        ),
      /INVALID_MEDIA_VALIDATION_WORK/
    );
  }
);

test(
  'rejects durable work with unexpected fields',
  async () => {
    await adminDb
      .collection(
        MEDIA_VALIDATION_WORK_COLLECTION
      )
      .doc(TEST_MEDIA_ID)
      .set({
        workId:
          TEST_MEDIA_ID,

        mediaId:
          TEST_MEDIA_ID,

        workType:
          MEDIA_VALIDATION_WORK_TYPE,

        sourceObject:
          'media/ingest/untrusted/source.mp4',
      });

    await assert.rejects(
      () =>
        readMediaValidationWork(
          TEST_MEDIA_ID
        ),
      /INVALID_MEDIA_VALIDATION_WORK/
    );
  }
);