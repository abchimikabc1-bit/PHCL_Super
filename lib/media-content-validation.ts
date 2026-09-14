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
    !isCanonicalNonEmptyString(value)
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
    isCanonicalNonEmptyString(value) &&
    value === 'h264'
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
      reason: 'INVALID_CONTAINER',
    };
  }

  if (
    !Number.isSafeInteger(
      probe.durationMs
    ) ||
    probe.durationMs <= 0
  ) {
    return {
      valid: false,
      reason: 'INVALID_DURATION',
    };
  }

  if (
    !isH264VideoCodec(
      probe.videoCodec
    )
  ) {
    return {
      valid: false,
      reason: 'INVALID_VIDEO_CODEC',
    };
  }

  if (
    !Number.isSafeInteger(probe.width) ||
    probe.width <= 0 ||
    !Number.isSafeInteger(probe.height) ||
    probe.height <= 0
  ) {
    return {
      valid: false,
      reason: 'INVALID_DIMENSIONS',
    };
  }

  if (
    !Number.isFinite(probe.frameRate) ||
    probe.frameRate <= 0
  ) {
    return {
      valid: false,
      reason: 'INVALID_FRAME_RATE',
    };
  }

  if (
    !isCanonicalNonEmptyString(
      probe.audioCodec
    )
  ) {
    return {
      valid: false,
      reason: 'INVALID_AUDIO_CODEC',
    };
  }

  return {
    valid: true,
    probe,
  };
}