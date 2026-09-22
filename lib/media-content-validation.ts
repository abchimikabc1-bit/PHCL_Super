import 'server-only';

export type MediaContentProbe = {
  container: string;
  durationMs: number;
  videoCodec: string;
  width: number;
  height: number;
  frameRate: number;
  audioCodec: string;
};

export type MediaContentValidationFailureReason =
  | 'INVALID_CONTAINER'
  | 'INVALID_DURATION'
  | 'INVALID_VIDEO_CODEC'
  | 'INVALID_DIMENSIONS'
  | 'INVALID_FRAME_RATE'
  | 'INVALID_AUDIO_CODEC';

export type MediaContentValidationResult =
  | {
      valid: true;
      probe: MediaContentProbe;
    }
  | {
      valid: false;
      reason: MediaContentValidationFailureReason;
    };

const MIN_DURATION_MS =
  10_000;

const MAX_DURATION_MS =
  60_000;

const MIN_MEDIA_DIMENSION_PX =
  240;

const MAX_MEDIA_DIMENSION_PX =
  4096;

const MIN_FRAME_RATE =
  1;

const MAX_FRAME_RATE =
  60;

function isCanonicalNonEmptyString(
  value: string
): boolean {
  return (
    value.length > 0 &&
    value.trim() === value
  );
}

function isMp4Container(
  value: string
): boolean {
  if (
    !isCanonicalNonEmptyString(
      value
    )
  ) {
    return false;
  }

  return value
    .split(',')
    .some(
      (container) =>
        container === 'mp4'
    );
}

function isH264VideoCodec(
  value: string
): boolean {
  return (
    isCanonicalNonEmptyString(
      value
    ) &&
    value === 'h264'
  );
}

function isAacAudioCodec(
  value: string
): boolean {
  return (
    isCanonicalNonEmptyString(
      value
    ) &&
    value === 'aac'
  );
}

function isAllowedMediaDimension(
  value: number
): boolean {
  return (
    Number.isSafeInteger(
      value
    ) &&
    value >=
      MIN_MEDIA_DIMENSION_PX &&
    value <=
      MAX_MEDIA_DIMENSION_PX
  );
}

function isAllowedFrameRate(
  value: number
): boolean {
  return (
    Number.isFinite(
      value
    ) &&
    value >=
      MIN_FRAME_RATE &&
    value <=
      MAX_FRAME_RATE
  );
}

export function evaluateMediaContentValidation(
  probe: MediaContentProbe
): MediaContentValidationResult {
  if (
    !isMp4Container(
      probe.container
    )
  ) {
    return {
      valid: false,
      reason:
        'INVALID_CONTAINER',
    };
  }

  if (
    !Number.isSafeInteger(
      probe.durationMs
    ) ||
    probe.durationMs <
      MIN_DURATION_MS ||
    probe.durationMs >
      MAX_DURATION_MS
  ) {
    return {
      valid: false,
      reason:
        'INVALID_DURATION',
    };
  }

  if (
    !isH264VideoCodec(
      probe.videoCodec
    )
  ) {
    return {
      valid: false,
      reason:
        'INVALID_VIDEO_CODEC',
    };
  }

  if (
    !isAllowedMediaDimension(
      probe.width
    ) ||
    !isAllowedMediaDimension(
      probe.height
    )
  ) {
    return {
      valid: false,
      reason:
        'INVALID_DIMENSIONS',
    };
  }

  if (
    !isAllowedFrameRate(
      probe.frameRate
    )
  ) {
    return {
      valid: false,
      reason:
        'INVALID_FRAME_RATE',
    };
  }

  if (
    !isAacAudioCodec(
      probe.audioCodec
    )
  ) {
    return {
      valid: false,
      reason:
        'INVALID_AUDIO_CODEC',
    };
  }

  return {
    valid: true,
    probe,
  };
}