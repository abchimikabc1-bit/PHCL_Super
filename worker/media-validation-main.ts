import 'server-only';

import type {
  Server,
} from 'node:http';

import {
  installMediaValidationWorkerShutdownHandlers,
} from './media-validation-process';

import {
  startMediaValidationWorker,
} from './media-validation-worker';

export type MediaValidationWorkerMainDependencies = {
  startWorker: () => Promise<Server>;

  installShutdownHandlers: (
    server: Server
  ) => () => void;
};

export async function runMediaValidationWorkerProcessWithDependencies(
  dependencies:
    MediaValidationWorkerMainDependencies
): Promise<void> {
  const server =
    await dependencies.startWorker();

  dependencies.installShutdownHandlers(
    server
  );
}

const productionDependencies:
  MediaValidationWorkerMainDependencies = {
    startWorker:
      startMediaValidationWorker,

    installShutdownHandlers:
      installMediaValidationWorkerShutdownHandlers,
  };

export function runMediaValidationWorkerProcess(): Promise<void> {
  return runMediaValidationWorkerProcessWithDependencies(
    productionDependencies
  );
}