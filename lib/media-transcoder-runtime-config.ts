import 'server-only';

const MEDIA_TRANSCODER_LOCATION =
  'me-central1' as const;

const SAFE_PROJECT_ID_PATTERN =
  /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

const SAFE_BUCKET_PATTERN =
  /^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/;

const COMPLETION_TOPIC_PATTERN =
  /^projects\/([a-z][a-z0-9-]{4,28}[a-z0-9])\/topics\/[A-Za-z][A-Za-z0-9._~-]{2,254}$/;

export type MediaTranscoderRuntimeConfig = {
  projectId: string;
  location:
    typeof MEDIA_TRANSCODER_LOCATION;
  bucketName: string;
  completionTopic: string;
};

export type MediaTranscoderRuntimeEnvironment = {
  MEDIA_TRANSCODER_PROJECT_ID?:
    string;

  MEDIA_TRANSCODER_LOCATION?:
    string;

  FIREBASE_STORAGE_BUCKET?:
    string;

  MEDIA_TRANSCODE_COMPLETION_TOPIC?:
    string;
};

function canonicalValue(
  value: string | undefined
): string | null {
  if (
    value === undefined ||
    value.length === 0 ||
    value.trim() !== value
  ) {
    return null;
  }

  return value;
}

export function readMediaTranscoderRuntimeConfigFromEnvironment(
  environment:
    MediaTranscoderRuntimeEnvironment
): MediaTranscoderRuntimeConfig {
  const projectId =
    canonicalValue(
      environment
        .MEDIA_TRANSCODER_PROJECT_ID
    );

  const location =
    canonicalValue(
      environment
        .MEDIA_TRANSCODER_LOCATION
    );

  const bucketName =
    canonicalValue(
      environment
        .FIREBASE_STORAGE_BUCKET
    );

  const completionTopic =
    canonicalValue(
      environment
        .MEDIA_TRANSCODE_COMPLETION_TOPIC
    );

  const topicMatch =
    completionTopic?.match(
      COMPLETION_TOPIC_PATTERN
    );

  if (
    projectId === null ||
    !SAFE_PROJECT_ID_PATTERN.test(
      projectId
    ) ||
    location !==
      MEDIA_TRANSCODER_LOCATION ||
    bucketName === null ||
    !SAFE_BUCKET_PATTERN.test(
      bucketName
    ) ||
    completionTopic === null ||
    topicMatch === null ||
    topicMatch[1] !== projectId
  ) {
    throw new Error(
      'INVALID_MEDIA_TRANSCODER_RUNTIME_CONFIG'
    );
  }

  return {
    projectId,

    location:
      MEDIA_TRANSCODER_LOCATION,

    bucketName,

    completionTopic,
  };
}

export function readMediaTranscoderRuntimeConfig():
  MediaTranscoderRuntimeConfig {
  return readMediaTranscoderRuntimeConfigFromEnvironment(
    {
      MEDIA_TRANSCODER_PROJECT_ID:
        process.env
          .MEDIA_TRANSCODER_PROJECT_ID,

      MEDIA_TRANSCODER_LOCATION:
        process.env
          .MEDIA_TRANSCODER_LOCATION,

      FIREBASE_STORAGE_BUCKET:
        process.env
          .FIREBASE_STORAGE_BUCKET,

      MEDIA_TRANSCODE_COMPLETION_TOPIC:
        process.env
          .MEDIA_TRANSCODE_COMPLETION_TOPIC,
    }
  );
}