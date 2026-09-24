import 'server-only';

import type {
  Readable,
} from 'node:stream';

import {
  adminStorageBucket,
} from '@/lib/firebase-admin';

const MAX_PLAYBACK_OBJECT_BYTES =
  10 * 1024 * 1024 * 1024;

export type MediaPlaybackStorageStreamInput = {
  objectPath: string;
  contentType: string;
  allowByteRanges: boolean;
  method: 'GET' | 'HEAD';
  rangeHeader: string | null;
};

export type MediaPlaybackStorageStreamResult = {
  status: 200 | 206 | 416;
  headers: Record<string, string>;
  body: Readable | null;
};

export type MediaPlaybackStorageStreamDependencies = {
  readObjectMetadata: (
    objectPath: string
  ) => Promise<{
    exists: boolean;
    size: unknown;
  }>;

  createObjectReadStream: (
    objectPath: string,
    range:
      | {
          start: number;
          end: number;
        }
      | null
  ) => Readable;
};

type ParsedByteRange = {
  start: number;
  end: number;
};

function isCanonicalObjectPath(
  value: string
): boolean {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.trim() === value &&
    value.startsWith(
      'media/processed/'
    ) &&
    !value.includes('..') &&
    !value.includes('\\') &&
    !value.includes('//')
  );
}

function parseObjectSize(
  value: unknown
): number {
  const parsedSize =
    typeof value === 'number'
      ? value
      : typeof value === 'string' &&
          /^[0-9]+$/.test(value)
        ? Number(value)
        : Number.NaN;

  if (
    !Number.isSafeInteger(
      parsedSize
    ) ||
    parsedSize <= 0 ||
    parsedSize >
      MAX_PLAYBACK_OBJECT_BYTES
  ) {
    throw new Error(
      'INVALID_MEDIA_PLAYBACK_STORAGE_OBJECT'
    );
  }

  return parsedSize;
}

function parseByteRange(
  rangeHeader: string,
  objectSize: number
): ParsedByteRange | null {
  const match =
    rangeHeader.match(
      /^bytes=([0-9]*)-([0-9]*)$/
    );

  if (
    match === null ||
    (
      match[1] === '' &&
      match[2] === ''
    )
  ) {
    return null;
  }

  const startText =
    match[1] ?? '';

  const endText =
    match[2] ?? '';

  if (startText === '') {
    const suffixLength =
      Number(endText);

    if (
      !Number.isSafeInteger(
        suffixLength
      ) ||
      suffixLength <= 0
    ) {
      return null;
    }

    return {
      start:
        Math.max(
          objectSize - suffixLength,
          0
        ),
      end:
        objectSize - 1,
    };
  }

  const start =
    Number(startText);

  if (
    !Number.isSafeInteger(start) ||
    start < 0 ||
    start >= objectSize
  ) {
    return null;
  }

  const requestedEnd =
    endText === ''
      ? objectSize - 1
      : Number(endText);

  if (
    !Number.isSafeInteger(
      requestedEnd
    ) ||
    requestedEnd < start
  ) {
    return null;
  }

  return {
    start,
    end:
      Math.min(
        requestedEnd,
        objectSize - 1
      ),
  };
}

const productionDependencies:
  MediaPlaybackStorageStreamDependencies = {
    readObjectMetadata:
      async (objectPath) => {
        const file =
          adminStorageBucket.file(
            objectPath
          );

        const [exists] =
          await file.exists();

        if (!exists) {
          return {
            exists:
              false,
            size:
              null,
          };
        }

        const [metadata] =
          await file.getMetadata();

        return {
          exists:
            true,
          size:
            metadata.size,
        };
      },

    createObjectReadStream:
      (objectPath, range) => {
        const file =
          adminStorageBucket.file(
            objectPath
          );

        return range === null
          ? file.createReadStream()
          : file.createReadStream({
              start:
                range.start,
              end:
                range.end,
            });
      },
  };

export async function createMediaPlaybackStorageStreamWithDependencies(
  input: MediaPlaybackStorageStreamInput,
  dependencies:
    MediaPlaybackStorageStreamDependencies
): Promise<MediaPlaybackStorageStreamResult> {
  if (
    !isCanonicalObjectPath(
      input.objectPath
    ) ||
    typeof input.contentType !==
      'string' ||
    input.contentType.length === 0 ||
    input.contentType.trim() !==
      input.contentType ||
    typeof input.allowByteRanges !==
      'boolean' ||
    (
      input.method !== 'GET' &&
      input.method !== 'HEAD'
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_PLAYBACK_STORAGE_REQUEST'
    );
  }

  if (
    input.rangeHeader !== null &&
    !input.allowByteRanges
  ) {
    throw new Error(
      'MEDIA_PLAYBACK_RANGE_NOT_ALLOWED'
    );
  }

  const metadata =
    await dependencies.readObjectMetadata(
      input.objectPath
    );

  if (!metadata.exists) {
    throw new Error(
      'MEDIA_PLAYBACK_OBJECT_NOT_FOUND'
    );
  }

  const objectSize =
    parseObjectSize(
      metadata.size
    );

  const baseHeaders:
    Record<string, string> = {
      'Content-Type':
        input.contentType,
      'Cache-Control':
        'private, no-store, max-age=0',
      Pragma:
        'no-cache',
      'X-Content-Type-Options':
        'nosniff',
      'Content-Disposition':
        'inline',
    };

  if (input.allowByteRanges) {
    baseHeaders['Accept-Ranges'] =
      'bytes';
  }

  if (input.rangeHeader !== null) {
    const range =
      parseByteRange(
        input.rangeHeader,
        objectSize
      );

    if (range === null) {
      return {
        status:
          416,
        headers: {
          ...baseHeaders,
          'Content-Range':
            `bytes */${objectSize}`,
          'Content-Length':
            '0',
        },
        body:
          null,
      };
    }

    const contentLength =
      range.end -
      range.start +
      1;

    return {
      status:
        206,
      headers: {
        ...baseHeaders,
        'Content-Range':
          `bytes ${range.start}-${range.end}/${objectSize}`,
        'Content-Length':
          String(contentLength),
      },
      body:
        input.method === 'HEAD'
          ? null
          : dependencies
              .createObjectReadStream(
                input.objectPath,
                range
              ),
    };
  }

  return {
    status:
      200,
    headers: {
      ...baseHeaders,
      'Content-Length':
        String(objectSize),
    },
    body:
      input.method === 'HEAD'
        ? null
        : dependencies
            .createObjectReadStream(
              input.objectPath,
              null
            ),
  };
}

export function createMediaPlaybackStorageStream(
  input: MediaPlaybackStorageStreamInput
): Promise<MediaPlaybackStorageStreamResult> {
  return createMediaPlaybackStorageStreamWithDependencies(
    input,
    productionDependencies
  );
}
