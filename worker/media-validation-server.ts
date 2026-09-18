import 'server-only';

import {
  createServer,
  type Server,
} from 'node:http';

import {
  createMediaValidationWorkerNodeHttpListener,
  type MediaValidationWorkerRequestHandler,
} from '@/lib/media-validation-worker-node-http-adapter';

const DEFAULT_HOST =
  '0.0.0.0';

export function readMediaValidationWorkerPort(
  value:
    string | undefined
): number {
  if (!value) {
    throw new Error(
      'MISSING_PORT'
    );
  }

  if (
    !/^\d+$/.test(
      value
    )
  ) {
    throw new Error(
      'INVALID_PORT'
    );
  }

  const port =
    Number(
      value
    );

  if (
    !Number.isSafeInteger(
      port
    ) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error(
      'INVALID_PORT'
    );
  }

  return port;
}

export function createMediaValidationWorkerHttpServer(
  handler:
    MediaValidationWorkerRequestHandler
): Server {
  return createServer(
    createMediaValidationWorkerNodeHttpListener(
      handler
    )
  );
}

export async function listenMediaValidationWorkerHttpServer(
  server: Server,
  port: number,
  host:
    string =
      DEFAULT_HOST
): Promise<void> {
  await new Promise<void>(
    (
      resolve,
      reject
    ) => {
      const onError =
        (
          error: Error
        ) => {
          server.off(
            'listening',
            onListening
          );

          reject(
            error
          );
        };

      const onListening =
        () => {
          server.off(
            'error',
            onError
          );

          resolve();
        };

      server.once(
        'error',
        onError
      );

      server.once(
        'listening',
        onListening
      );

      server.listen(
        port,
        host
      );
    }
  );
}

export async function closeMediaValidationWorkerHttpServer(
  server: Server
): Promise<void> {
  if (!server.listening) {
    return;
  }

  await new Promise<void>(
    (
      resolve,
      reject
    ) => {
      server.close(
        (
          error
        ) => {
          if (error) {
            reject(
              error
            );

            return;
          }

          resolve();
        }
      );
    }
  );
}