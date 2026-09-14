import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptMediaProbeProcessResult,
} from '@/lib/media-probe-result-adapter';

test(
  'parses stdout from a successful bounded probe process result',
  () => {
    const result =
      adaptMediaProbeProcessResult({
        stdout: JSON.stringify({
          streams: [
            {
              codec_type: 'video',
              codec_name: 'h264',
              width: 1920,
              height: 1080,
              avg_frame_rate:
                '30000/1001',
            },
            {
              codec_type: 'audio',
              codec_name: 'aac',
            },
          ],
          format: {
            format_name:
              'mov,mp4,m4a,3gp,3g2,mj2',
            duration: '12.345',
          },
        }),
        stderr: '',
      });

    assert.deepEqual(result, {
      container:
        'mov,mp4,m4a,3gp,3g2,mj2',
      durationMs: 12_345,
      videoCodec: 'h264',
      width: 1920,
      height: 1080,
      frameRate:
        30000 / 1001,
      audioCodec: 'aac',
    });
  }
);

test(
  'fails closed when process stdout cannot be parsed',
  () => {
    assert.throws(
      () =>
        adaptMediaProbeProcessResult({
          stdout: 'not-json',
          stderr: '',
        }),
      /MEDIA_FFPROBE_OUTPUT_INVALID/
    );
  }
);