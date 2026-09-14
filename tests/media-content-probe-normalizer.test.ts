import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeMediaContentProbe,
} from '@/lib/media-content-probe-normalizer';

const VALID_RAW_PROBE = {
  container: 'mp4',
  durationMs: 30_000,
  videoCodec: 'h264',
  width: 1080,
  height: 1920,
  frameRate: 30,
  audioCodec: 'aac',
};

test(
  'normalizes an exact structurally valid probe object',
  () => {
    assert.deepEqual(
      normalizeMediaContentProbe(
        VALID_RAW_PROBE
      ),
      VALID_RAW_PROBE
    );
  }
);

test(
  'rejects a non-object probe result',
  () => {
    assert.throws(
      () =>
        normalizeMediaContentProbe(
          'not-an-object'
        ),
      /INVALID_MEDIA_CONTENT_PROBE/
    );
  }
);

test(
  'rejects a probe result with missing fields',
  () => {
    const {
      audioCodec: _audioCodec,
      ...incompleteProbe
    } = VALID_RAW_PROBE;

    assert.throws(
      () =>
        normalizeMediaContentProbe(
          incompleteProbe
        ),
      /INVALID_MEDIA_CONTENT_PROBE/
    );
  }
);

test(
  'rejects unexpected probe fields',
  () => {
    assert.throws(
      () =>
        normalizeMediaContentProbe({
          ...VALID_RAW_PROBE,
          command:
            'untrusted-extra-field',
        }),
      /INVALID_MEDIA_CONTENT_PROBE/
    );
  }
);

test(
  'rejects incorrect primitive field types',
  () => {
    assert.throws(
      () =>
        normalizeMediaContentProbe({
          ...VALID_RAW_PROBE,
          durationMs: '30000',
        }),
      /INVALID_MEDIA_CONTENT_PROBE/
    );
  }
);

test(
  'does not perform media acceptance policy validation',
  () => {
    const structurallyTypedProbe = {
      ...VALID_RAW_PROBE,
      container: '',
      durationMs: 0,
      videoCodec: ' ',
      width: 0,
      height: 0,
      frameRate: 0,
      audioCodec: '',
    };

    assert.deepEqual(
      normalizeMediaContentProbe(
        structurallyTypedProbe
      ),
      structurallyTypedProbe
    );
  }
);