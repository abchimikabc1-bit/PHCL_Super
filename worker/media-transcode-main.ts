import 'server-only';

import type {
  Server,
} from 'node:http';

import {
  installMediaValidationWorkerShutdownHandlers,
} from './media-validation-process';

import {
  startMediaTranscodeWorker,
} from './media-transcode-worker';

export type MediaTranscodeWorkerMainDependencies = {
  startWorker: () => Promise<Server>;

  installShutdownHandlers: (
    server: Server
  ) => () => void;
};

export async function runMediaTranscodeWorkerProcessWithDependencies(
  dependencies:
    MediaTranscodeWorkerMainDependencies
): Promise<void> {
  const server =
    await dependencies.startWorker();

  dependencies.installShutdownHandlers(
    server
  );
}

const productionDependencies:
  MediaTranscodeWorkerMainDependencies = {
    startWorker:
      startMediaTranscodeWorker,

    installShutdownHandlers:
      installMediaValidationWorkerShutdownHandlers,
  };

export function runMediaTranscodeWorkerProcess(): Promise<void> {
  return runMediaTranscodeWorkerProcessWithDependencies(
    productionDependencies
  );
}
