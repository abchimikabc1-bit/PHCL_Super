import {
  test,
} from 'node:test';

import assert from 'node:assert/strict';

import {
  evaluateMediaUploadVerification,
} from '@/lib/media-upload-verification';

const authoritativeMedia = {
  schemaVersion: 2,
  mediaId: 'media_123',
  ownerId: 'user_123',
  sourceObject:
    'media/ingest/user_123/media_123/video.mp4',
  sourceFileName: 'video.mp4',
  contentType: 'video/mp4',
  declaredSizeBytes: 1_048_576,
  status: 'UPLOADING',
  createdAtMs: 1,
  updatedAtMs: 1,
} as const;

const uploadedObject = {
  path:
    'media/ingest/user_123/media_123/video.mp4',
  exists: true,
  size: 1_048_576,
  contentType: 'video/mp4',
  generation: '123456789',
} as const;

test(
  'media upload verification accepts an exact authoritative upload match',
  () => {
    const result =
      evaluateMediaUploadVerification(
        authoritativeMedia,
        uploadedObject
      );

    assert.deepEqual(
      result,
      {
        verified: true,
        mediaId: 'media_123',
        sourceObject:
          'media/ingest/user_123/media_123/video.mp4',
        generation: '123456789',
      }
    );
  }
);

test(
  'media upload verification rejects a missing uploaded object',
  () => {
    const result =
      evaluateMediaUploadVerification(
        authoritativeMedia,
        {
          ...uploadedObject,
          exists: false,
          size: null,
          contentType: null,
          generation: null,
        }
      );

    assert.equal(
      result.verified,
      false
    );

    if (!result.verified) {
      assert.equal(
        result.reason,
        'OBJECT_NOT_FOUND'
      );
    }
  }
);

test(
  'media upload verification rejects an actual size mismatch',
  () => {
    const result =
      evaluateMediaUploadVerification(
        authoritativeMedia,
        {
          ...uploadedObject,
          size: 1_048_575,
        }
      );

    assert.equal(
      result.verified,
      false
    );

    if (!result.verified) {
      assert.equal(
        result.reason,
        'SIZE_MISMATCH'
      );
    }
  }
);

test(
  'media upload verification rejects an actual content type mismatch',
  () => {
    const result =
      evaluateMediaUploadVerification(
        authoritativeMedia,
        {
          ...uploadedObject,
          contentType: 'video/webm',
        }
      );

    assert.equal(
      result.verified,
      false
    );

    if (!result.verified) {
      assert.equal(
        result.reason,
        'CONTENT_TYPE_MISMATCH'
      );
    }
  }
);

test(
  'media upload verification rejects an invalid object generation',
  () => {
    const result =
      evaluateMediaUploadVerification(
        authoritativeMedia,
        {
          ...uploadedObject,
          generation: '',
        }
      );

    assert.equal(
      result.verified,
      false
    );

    if (!result.verified) {
      assert.equal(
        result.reason,
        'INVALID_GENERATION'
      );
    }
  }
);

test(
  'media upload verification rejects a storage path mismatch',
  () => {
    const result =
      evaluateMediaUploadVerification(
        authoritativeMedia,
        {
          ...uploadedObject,
          path:
            'media/ingest/user_123/media_123/other.mp4',
        }
      );

    assert.equal(
      result.verified,
      false
    );

    if (!result.verified) {
      assert.equal(
        result.reason,
        'OBJECT_PATH_MISMATCH'
      );
    }
  }
);