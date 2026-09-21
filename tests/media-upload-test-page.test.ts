import assert from 'node:assert/strict';
import test from 'node:test';

import MediaUploadTestPage from '@/app/dev/media-upload-test/page';

test(
  'development media upload test page exists',
  () => {
    assert.equal(
      typeof MediaUploadTestPage,
      'function',
    );
  },
);