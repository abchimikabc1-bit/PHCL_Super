import 'server-only';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  startMediaValidationWorker,
} from '../worker/media-validation-worker';

test(
  'exports the media validation worker startup boundary without starting it on import',
  () => {
    assert.equal(
      typeof startMediaValidationWorker,
      'function'
    );
  }
);