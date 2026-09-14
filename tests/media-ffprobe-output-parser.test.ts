import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseMediaFfprobeOutput,
} from '@/lib/media-ffprobe-output-parser';

test(
  'maps bounded ffprobe JSON output into the internal media probe shape',
  () => {
    const result =
      parseMediaFfprobeOutput(
        JSON.stringify({
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
        })
      );

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
  'normalizes fractional ffprobe milliseconds to the nearest whole millisecond',
  () => {
    const result =
      parseMediaFfprobeOutput(
        JSON.stringify({
          streams: [
            {
              codec_type: 'video',
              codec_name: 'h264',
              width: 1920,
              height: 1080,
              avg_frame_rate: '30/1',
            },
            {
              codec_type: 'audio',
              codec_name: 'aac',
            },
          ],
          format: {
            format_name: 'mp4',
            duration: '12.3456',
          },
        })
      );

    assert.equal(
      result.durationMs,
      12_346
    );

    assert.equal(
      Number.isSafeInteger(
        result.durationMs
      ),
      true
    );
  }
);

test(
  'fails closed when ffprobe stdout is not valid JSON',
  () => {
    assert.throws(
      () =>
        parseMediaFfprobeOutput(
          'not-json'
        ),
      /MEDIA_FFPROBE_OUTPUT_INVALID/
    );
  }
);

test(
  'fails closed when required video or audio streams are missing',
  () => {
    assert.throws(
      () =>
        parseMediaFfprobeOutput(
          JSON.stringify({
            streams: [],
            format: {
              format_name: 'mp4',
              duration: '10',
            },
          })
        ),
      /MEDIA_FFPROBE_OUTPUT_INVALID/
    );
  }
);

test(
  'fails closed on an invalid frame-rate denominator',
  () => {
    assert.throws(
      () =>
        parseMediaFfprobeOutput(
          JSON.stringify({
            streams: [
              {
                codec_type: 'video',
                codec_name: 'h264',
                width: 1920,
                height: 1080,
                avg_frame_rate: '30/0',
              },
              {
                codec_type: 'audio',
                codec_name: 'aac',
              },
            ],
            format: {
              format_name: 'mp4',
              duration: '10',
            },
          })
        ),
      /MEDIA_FFPROBE_OUTPUT_INVALID/
    );
  }
);