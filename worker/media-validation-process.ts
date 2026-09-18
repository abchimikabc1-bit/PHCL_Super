import 'server-only';

import type {
  Server,
} from 'node:http';

import {
  closeMediaValidationWorkerHttpServer,
} from './media-validation-server';

export type MediaValidationWorkerProcessDependencies = {
  closeServer: (
    server: Server
  ) => Promise<void>;
};

const productionDependencies:
  MediaValidationWorkerProcessDependencies = {
    closeServer:
      closeMediaValidationWorkerHttpServer,
  };

export function installMediaValidationWorkerShutdownHandlersWithDependencies(
  server: Server,
  dependencies:
    MediaValidationWorkerProcessDependencies
): () => void {
  let shuttingDown =
    false;

  const shutdown =
    async () => {
      if (shuttingDown) {
        return;
      }

      shuttingDown =
        true;

      try {
        await dependencies.closeServer(
          server
        );
      } catch {
        process.exitCode =
          1;
      }
    };

  const onSigterm =
    () => {
      void shutdown();
    };

  const onSigint =
    () => {
      void shutdown();
    };

  process.once(
    'SIGTERM',
    onSigterm
  );

  process.once(
    'SIGINT',
    onSigint
  );

  return () => {
    process.off(
      'SIGTERM',
      onSigterm
    );

    process.off(
      'SIGINT',
      onSigint
    );
  };
}

export function installMediaValidationWorkerShutdownHandlers(
  server: Server
): () => void {
  return installMediaValidationWorkerShutdownHandlersWithDependencies(
    server,
    productionDependencies
  );
}