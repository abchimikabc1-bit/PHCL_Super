import 'server-only';

import {
  parseMediaFfprobeOutput,
} from '@/lib/media-ffprobe-output-parser';

import type {
  MediaContentProbe,
} from '@/lib/media-content-validation';

import type {
  MediaProbeProcessResult,
} from '@/lib/media-probe-process';

export function adaptMediaProbeProcessResult(
  result: MediaProbeProcessResult
): MediaContentProbe {
  return parseMediaFfprobeOutput(
    result.stdout
  );
}