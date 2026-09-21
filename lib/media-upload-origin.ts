import 'server-only';

const CONFIGURATION_ERROR =
  'MEDIA_UPLOAD_ORIGIN_CONFIGURATION_INVALID';

const FORBIDDEN_ERROR =
  'MEDIA_UPLOAD_ORIGIN_FORBIDDEN';

const DEVELOPMENT_ORIGIN =
  'http://localhost:3000';

function readConfiguredOrigin(
  configuredSiteUrl:
    string | undefined
): string {
  if (
    typeof configuredSiteUrl !==
      'string' ||
    configuredSiteUrl.length === 0 ||
    configuredSiteUrl.trim() !==
      configuredSiteUrl
  ) {
    throw new Error(
      CONFIGURATION_ERROR
    );
  }

  let parsed:
    URL;

  try {
    parsed =
      new URL(
        configuredSiteUrl
      );
  } catch {
    throw new Error(
      CONFIGURATION_ERROR
    );
  }

  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      CONFIGURATION_ERROR
    );
  }

  return parsed.origin;
}

function readRequestOrigin(
  requestOrigin:
    string | null,
  runtimeEnvironment:
    string | undefined
): string {
  if (
    typeof requestOrigin !==
      'string' ||
    requestOrigin.length === 0 ||
    requestOrigin.trim() !==
      requestOrigin
  ) {
    throw new Error(
      FORBIDDEN_ERROR
    );
  }

  let parsed:
    URL;

  try {
    parsed =
      new URL(
        requestOrigin
      );
  } catch {
    throw new Error(
      FORBIDDEN_ERROR
    );
  }

  const isDevelopmentOrigin =
    runtimeEnvironment ===
      'development' &&
    requestOrigin ===
      DEVELOPMENT_ORIGIN;

  if (
    (
      parsed.protocol !==
        'https:' &&
      !isDevelopmentOrigin
    ) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== '/' ||
    parsed.origin !==
      requestOrigin
  ) {
    throw new Error(
      FORBIDDEN_ERROR
    );
  }

  return parsed.origin;
}

export function resolveTrustedMediaUploadOrigin(
  requestOrigin:
    string | null,
  configuredSiteUrl:
    string | undefined,
  runtimeEnvironment:
    string | undefined =
      process.env.NODE_ENV
): string {
  const configuredOrigin =
    readConfiguredOrigin(
      configuredSiteUrl
    );

  const normalizedRequestOrigin =
    readRequestOrigin(
      requestOrigin,
      runtimeEnvironment
    );

  if (
    normalizedRequestOrigin ===
    configuredOrigin
  ) {
    return configuredOrigin;
  }

  if (
    runtimeEnvironment ===
      'development' &&
    normalizedRequestOrigin ===
      DEVELOPMENT_ORIGIN
  ) {
    return DEVELOPMENT_ORIGIN;
  }

  throw new Error(
    FORBIDDEN_ERROR
  );
}
