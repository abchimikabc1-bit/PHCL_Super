import 'server-only';

const CONFIGURATION_ERROR =
  'MEDIA_UPLOAD_ORIGIN_CONFIGURATION_INVALID';

const FORBIDDEN_ERROR =
  'MEDIA_UPLOAD_ORIGIN_FORBIDDEN';

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
    string | null
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

  if (
    parsed.protocol !== 'https:' ||
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
    string | undefined
): string {
  const configuredOrigin =
    readConfiguredOrigin(
      configuredSiteUrl
    );

  const normalizedRequestOrigin =
    readRequestOrigin(
      requestOrigin
    );

  if (
    normalizedRequestOrigin !==
    configuredOrigin
  ) {
    throw new Error(
      FORBIDDEN_ERROR
    );
  }

  return configuredOrigin;
}