import 'server-only';

import type {
  MediaContentProbe,
} from '@/lib/media-content-validation';

const MEDIA_FFPROBE_OUTPUT_INVALID =
  'MEDIA_FFPROBE_OUTPUT_INVALID';

type UnknownRecord =
  Record<string, unknown>;

function failInvalid():
  never {
  throw new Error(
    MEDIA_FFPROBE_OUTPUT_INVALID
  );
}

function isRecord(
  value: unknown
): value is UnknownRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readNonEmptyString(
  value: unknown
): string {
  if (
    typeof value !== 'string' ||
    value.trim() === ''
  ) {
    failInvalid();
  }

  return value;
}

function readPositiveNumber(
  value: unknown
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    failInvalid();
  }

  return value;
}

function parseDurationMs(
  value: unknown
): number {
  const duration =
    Number(
      readNonEmptyString(value)
    );

  if (
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    failInvalid();
  }

  const durationMs =
    duration * 1000;

  if (
    !Number.isFinite(durationMs) ||
    durationMs <= 0
  ) {
    failInvalid();
  }

  return durationMs;
}

function parseFrameRate(
  value: unknown
): number {
  const raw =
    readNonEmptyString(value);

  const parts =
    raw.split('/');

  if (parts.length !== 2) {
    failInvalid();
  }

  const numerator =
    Number(parts[0]);

  const denominator =
    Number(parts[1]);

  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    numerator <= 0 ||
    denominator <= 0
  ) {
    failInvalid();
  }

  const frameRate =
    numerator / denominator;

  if (
    !Number.isFinite(frameRate) ||
    frameRate <= 0
  ) {
    failInvalid();
  }

  return frameRate;
}

export function parseMediaFfprobeOutput(
  stdout: string
): MediaContentProbe {
  let raw: unknown;

  try {
    raw = JSON.parse(stdout);
  } catch {
    failInvalid();
  }

  if (!isRecord(raw)) {
    failInvalid();
  }

  if (!Array.isArray(raw.streams)) {
    failInvalid();
  }

  if (!isRecord(raw.format)) {
    failInvalid();
  }

  const videoStream =
    raw.streams.find(
      (stream) =>
        isRecord(stream) &&
        stream.codec_type === 'video'
    );

  const audioStream =
    raw.streams.find(
      (stream) =>
        isRecord(stream) &&
        stream.codec_type === 'audio'
    );

  if (
    !isRecord(videoStream) ||
    !isRecord(audioStream)
  ) {
    failInvalid();
  }

  return {
    container:
      readNonEmptyString(
        raw.format.format_name
      ),

    durationMs:
      parseDurationMs(
        raw.format.duration
      ),

    videoCodec:
      readNonEmptyString(
        videoStream.codec_name
      ),

    width:
      readPositiveNumber(
        videoStream.width
      ),

    height:
      readPositiveNumber(
        videoStream.height
      ),

    frameRate:
      parseFrameRate(
        videoStream.avg_frame_rate
      ),

    audioCodec:
      readNonEmptyString(
        audioStream.codec_name
      ),
  };
}