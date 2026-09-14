import assert from 'node:assert/strict';
import test from 'node:test';

import {
  executeAndParseMediaProbeWithDependencies,
} from '@/lib/media-probe-execution-result-parser';

test(
  'maps the typed probe process result through the parser adapter',
  async () => {
    const calls: string[] = [];

    const result =
      await executeAndParseMediaProbeWithDependencies(
        'media/ingest/owner-123/media-123/video.mp4',
        '1740000000000000',
        {
          async executeMediaProbe(
            sourceObject,
            generation
          ) {
            calls.push(
              `execute:${sourceObject}:${generation}`
            );

            return {
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
            };
          },
        }
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

    assert.deepEqual(calls, [
      'execute:media/ingest/owner-123/media-123/video.mp4:1740000000000000',
    ]);
  }
);

test(
  'fails closed when the probe process result contains invalid stdout',
  async () => {
    await assert.rejects(
      () =>
        executeAndParseMediaProbeWithDependencies(
          'media/ingest/owner-123/media-123/video.mp4',
          '1740000000000000',
          {
            async executeMediaProbe() {
              return {
                stdout: 'not-json',
                stderr: '',
              };
            },
          }
        ),
      /MEDIA_FFPROBE_OUTPUT_INVALID/
    );
  }
);