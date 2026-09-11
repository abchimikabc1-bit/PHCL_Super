import 'server-only';

import { randomUUID } from 'node:crypto';

const SAFE_ID_PATTERN =
  /^[A-Za-z0-9_-]{1,128}$/;

const SAFE_FILE_NAME_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/;

function assertSafeId(
  value: string,
  fieldName: string
): string {
  const normalized =
  value.trim();

if (
  value !== normalized ||
  !SAFE_ID_PATTERN.test(
    normalized
  )
) {

    throw new Error(
      `${fieldName} is invalid.`
    );
  }

  return normalized;
}

function assertSafeFileName(
  fileName: string
): string {
 const normalized =
  fileName.trim();

if (
  fileName !== normalized ||
  !SAFE_FILE_NAME_PATTERN.test(
    normalized
  ) ||
    normalized === '.' ||
    normalized === '..'
  ) {
    throw new Error(
      'Media file name is invalid.'
    );
  }

  return normalized;
}

export function createMediaId():
  string {
  return randomUUID();
}

export function buildMediaIngestPath(
  userId: string,
  mediaId: string,
  fileName: string
): string {
  return [
    'media',
    'ingest',
    assertSafeId(
      userId,
      'userId'
    ),
    assertSafeId(
      mediaId,
      'mediaId'
    ),
    assertSafeFileName(
      fileName
    ),
  ].join('/');
}

export function buildMediaProcessedPath(
  mediaId: string,
  fileName: string
): string {
  return [
    'media',
    'processed',
    assertSafeId(
      mediaId,
      'mediaId'
    ),
    assertSafeFileName(
      fileName
    ),
  ].join('/');
}

export function buildMediaThumbnailPath(
  mediaId: string,
  fileName: string
): string {
  return [
    'media',
    'thumbnails',
    assertSafeId(
      mediaId,
      'mediaId'
    ),
    assertSafeFileName(
      fileName
    ),
  ].join('/');
}

export function buildMediaQuarantinePath(
  mediaId: string,
  fileName: string
): string {
  return [
    'media',
    'quarantine',
    assertSafeId(
      mediaId,
      'mediaId'
    ),
    assertSafeFileName(
      fileName
    ),
  ].join('/');
}