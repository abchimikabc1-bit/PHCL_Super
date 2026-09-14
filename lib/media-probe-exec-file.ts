import 'server-only';

import {
  execFile,
  type ExecFileException,
} from 'node:child_process';

import type {
  MediaProbeProcessOptions,
  MediaProbeProcessResult,
} from '@/lib/media-probe-process';

type MediaProbeExecFileOptions =
  MediaProbeProcessOptions & {
    encoding: 'utf8';
  };

type MediaProbeExecFileCallback = (
  error: ExecFileException | null,
  stdout: string,
  stderr: string
) => void;

export type MediaProbeExecFileDependencies = {
  execFile: (
    executable: string,
    args: string[],
    options: MediaProbeExecFileOptions,
    callback: MediaProbeExecFileCallback
  ) => void;
};

export function executeMediaProbeFileWithDependencies(
  executable: string,
  args: string[],
  options: MediaProbeProcessOptions,
  dependencies: MediaProbeExecFileDependencies
): Promise<MediaProbeProcessResult> {
  return new Promise(
    (resolve, reject) => {
      dependencies.execFile(
        executable,
        args,
        {
          ...options,
          encoding: 'utf8',
        },
        (
          error,
          stdout,
          stderr
        ) => {
          if (error) {
            reject(error);
            return;
          }

          resolve({
            stdout,
            stderr,
          });
        }
      );
    }
  );
}

const productionDependencies:
  MediaProbeExecFileDependencies = {
    execFile(
      executable,
      args,
      options,
      callback
    ) {
      execFile(
        executable,
        args,
        options,
        callback
      );
    },
  };

export function executeMediaProbeFile(
  executable: string,
  args: string[],
  options: MediaProbeProcessOptions
): Promise<MediaProbeProcessResult> {
  return executeMediaProbeFileWithDependencies(
    executable,
    args,
    options,
    productionDependencies
  );
}