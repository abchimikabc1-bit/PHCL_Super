import 'server-only';

export type MediaProbeProcessOptions = {
  shell: false;
  timeout: number;
  maxBuffer: number;
  windowsHide: boolean;
};

export type MediaProbeProcessResult = {
  stdout: string;
  stderr: string;
};

export type MediaProbeProcessDependencies = {
  executeFile: (
    executable: string,
    args: string[],
    options: MediaProbeProcessOptions
  ) => Promise<unknown>;
};

const MEDIA_PROBE_EXECUTABLE =
  'ffprobe';

const MEDIA_PROBE_TIMEOUT_MS =
  15_000;

const MEDIA_PROBE_MAX_BUFFER_BYTES =
  1_048_576;

export async function executeMediaProbeProcessWithDependencies(
  filePath: string,
  dependencies: MediaProbeProcessDependencies
): Promise<unknown> {
  return dependencies.executeFile(
    MEDIA_PROBE_EXECUTABLE,
    [
      '-v',
      'error',
      '-show_format',
      '-show_streams',
      '-of',
      'json',
      filePath,
    ],
    {
      shell: false,
      timeout: MEDIA_PROBE_TIMEOUT_MS,
      maxBuffer:
        MEDIA_PROBE_MAX_BUFFER_BYTES,
      windowsHide: true,
    }
  );
}