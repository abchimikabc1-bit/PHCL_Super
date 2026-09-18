import 'server-only';

import type {
  IncomingMessage,
  ServerResponse,
} from 'node:http';

import {
  Readable,
} from 'node:stream';

export type MediaValidationWorkerRequestHandler =
  (
    request: Request
  ) => Promise<Response>;

function getRequestOrigin(
  request: IncomingMessage
): string {
  const forwardedProto =
    request.headers[
      'x-forwarded-proto'
    ];

  const protocol =
    typeof forwardedProto ===
      'string' &&
    forwardedProto.trim()
      ? forwardedProto
          .split(',')[0]
          .trim()
      : 'http';

  const forwardedHost =
    request.headers[
      'x-forwarded-host'
    ];

  const host =
    typeof forwardedHost ===
      'string' &&
    forwardedHost.trim()
      ? forwardedHost
          .split(',')[0]
          .trim()
      : request.headers.host;

  if (!host) {
    throw new Error(
      'MISSING_REQUEST_HOST'
    );
  }

  return `${protocol}://${host}`;
}

export function createWebRequestFromNodeRequest(
  request: IncomingMessage
): Request {
  const method =
    request.method ?? 'GET';

  const url =
    new URL(
      request.url ?? '/',
      getRequestOrigin(request)
    );

  const headers =
    new Headers();

  for (
    const [
      name,
      value,
    ] of Object.entries(
      request.headers
    )
  ) {
    if (
      typeof value === 'string'
    ) {
      headers.append(
        name,
        value
      );

      continue;
    }

    if (
      Array.isArray(value)
    ) {
      for (
        const item of value
      ) {
        headers.append(
          name,
          item
        );
      }
    }
  }

  const hasBody =
    method !== 'GET' &&
    method !== 'HEAD';

  return new Request(
    url,
    {
      method,
      headers,

      body:
        hasBody
          ? Readable.toWeb(
              request
            ) as ReadableStream
          : undefined,

      duplex:
        hasBody
          ? 'half'
          : undefined,
    } as RequestInit
  );
}

export async function writeWebResponseToNodeResponse(
  response: Response,
  nodeResponse: ServerResponse
): Promise<void> {
  nodeResponse.statusCode =
    response.status;

  response.headers.forEach(
    (
      value,
      name
    ) => {
      nodeResponse.setHeader(
        name,
        value
      );
    }
  );

  if (!response.body) {
    nodeResponse.end();

    return;
  }

  const body =
    Readable.fromWeb(
      response.body as never
    );

  for await (
    const chunk of body
  ) {
    if (
      !nodeResponse.write(
        chunk
      )
    ) {
      await new Promise<void>(
        (
          resolve
        ) => {
          nodeResponse.once(
            'drain',
            resolve
          );
        }
      );
    }
  }

  nodeResponse.end();
}

export function createMediaValidationWorkerNodeHttpListener(
  handler:
    MediaValidationWorkerRequestHandler
) {
  return async (
    request: IncomingMessage,
    response: ServerResponse
  ): Promise<void> => {
    try {
      const webRequest =
        createWebRequestFromNodeRequest(
          request
        );

      const webResponse =
        await handler(
          webRequest
        );

      await writeWebResponseToNodeResponse(
        webResponse,
        response
      );
    } catch {
      if (
        !response.headersSent
      ) {
        response.statusCode =
          500;

        response.setHeader(
          'Cache-Control',
          'no-store, max-age=0'
        );

        response.setHeader(
          'Pragma',
          'no-cache'
        );
      }

      if (!response.writableEnded) {
        response.end();
      }
    }
  };
}