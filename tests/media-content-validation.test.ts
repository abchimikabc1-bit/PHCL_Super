import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateMediaContentValidation,
  type MediaContentProbe,
} from '@/lib/media-content-validation';

const VALID_PROBE: MediaContentProbe = {
  container: 'mp4',
  durationMs: 30_000,
  videoCodec: 'h264',
  width: 1080,
  height: 1920,
  frameRate: 30,
  audioCodec: 'aac',
};

test(
  'accepts structurally valid media probe data',
  () => {
    const result =
      evaluateMediaContentValidation(
        VALID_PROBE
      );

    assert.deepEqual(result, {
      valid: true,
      probe: VALID_PROBE,
    });
  }
);

test(
  'accepts ffprobe container aliases when mp4 is present',
  () => {
    const probe: MediaContentProbe = {
      ...VALID_PROBE,
      container:
        'mov,mp4,m4a,3gp,3g2,mj2',
    };

    const result =
      evaluateMediaContentValidation(
        probe
      );

    assert.deepEqual(result, {
      valid: true,
      probe,
    });
  }
);

test(
  'rejects invalid container data',
  () => {
    const result =
      evaluateMediaContentValidation({
        ...VALID_PROBE,
        container: '',
      });

    assert.deepEqual(result, {
      valid: false,
      reason: 'INVALID_CONTAINER',
    });
  }
);

test(
  'rejects a structurally valid non-mp4 container',
  () => {
    const result =
      evaluateMediaContentValidation({
        ...VALID_PROBE,
        container: 'matroska,webm',
      });

    assert.deepEqual(result, {
      valid: false,
      reason: 'INVALID_CONTAINER',
    });
  }
);

test(
  'rejects invalid duration data',
  () => {
    const result =
      evaluateMediaContentValidation({
        ...VALID_PROBE,
        durationMs: 0,
      });

    assert.deepEqual(result, {
      valid: false,
      reason: 'INVALID_DURATION',
    });
  }
);

test(
  'rejects invalid video codec data',
  () => {
    const result =
      evaluateMediaContentValidation({
        ...VALID_PROBE,
        videoCodec: ' ',
      });

    assert.deepEqual(result, {
      valid: false,
      reason: 'INVALID_VIDEO_CODEC',
    });
  }
);

test(
  'rejects a structurally valid non-h264 video codec',
  () => {
    const result =
      evaluateMediaContentValidation({
        ...VALID_PROBE,
        videoCodec: 'hevc',
      });

    assert.deepEqual(result, {
      valid: false,
      reason: 'INVALID_VIDEO_CODEC',
    });
  }
);

test(
  'rejects invalid dimensions',
  () => {
    const result =
      evaluateMediaContentValidation({
        ...VALID_PROBE,
        width: 0,
      });

    assert.deepEqual(result, {
      valid: false,
      reason: 'INVALID_DIMENSIONS',
    });
  }
);

test(
  'rejects invalid frame rate',
  () => {
    const result =
      evaluateMediaContentValidation({
        ...VALID_PROBE,
        frameRate: Number.NaN,
      });

    assert.deepEqual(result, {
      valid: false,
      reason: 'INVALID_FRAME_RATE',
    });
  }
);

test(
  'rejects invalid audio codec data',
  () => {
    const result =
      evaluateMediaContentValidation({
        ...VALID_PROBE,
        audioCodec: ' aac',
      });

    assert.deepEqual(result, {
      valid: false,
      reason: 'INVALID_AUDIO_CODEC',
    });
  }
);

test(
  'rejects a structurally valid non-aac audio codec',
  () => {
    const result =
      evaluateMediaContentValidation({
        ...VALID_PROBE,
        audioCodec: 'opus',
      });

    assert.deepEqual(result, {
      valid: false,
      reason: 'INVALID_AUDIO_CODEC',
    });
  }
);