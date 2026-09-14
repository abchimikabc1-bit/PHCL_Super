import 'server-only';

import type {
  MediaContentProbe,
} from '@/lib/media-content-validation';

const MEDIA_CONTENT_PROBE_KEYS = [
  'container',
  'durationMs',
  'videoCodec',
  'width',
  'height',
  'frameRate',
  'audioCodec',
] as const;

function failInvalidMediaContentProbe(): never {
  throw new Error(
    'INVALID_MEDIA_CONTENT_PROBE'
  );
}

function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

export function normalizeMediaContentProbe(
  value: unknown
): MediaContentProbe {
  if (!isPlainObject(value)) {
    failInvalidMediaContentProbe();
  }

  const keys = Object.keys(value);

  if (
    keys.length !==
      MEDIA_CONTENT_PROBE_KEYS.length ||
    MEDIA_CONTENT_PROBE_KEYS.some(
      (key) =>
        !Object.prototype.hasOwnProperty.call(
          value,
          key
        )
    )
  ) {
    failInvalidMediaContentProbe();
  }

  const {
    container,
    durationMs,
    videoCodec,
    width,
    height,
    frameRate,
    audioCodec,
  } = value;

  if (
    typeof container !== 'string' ||
    typeof durationMs !== 'number' ||
    typeof videoCodec !== 'string' ||
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    typeof frameRate !== 'number' ||
    typeof audioCodec !== 'string'
  ) {
    failInvalidMediaContentProbe();
  }

  return {
    container,
    durationMs,
    videoCodec,
    width,
    height,
    frameRate,
    audioCodec,
  };
}