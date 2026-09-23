import 'server-only';

import {
  startMediaTranscodeWorkerEntrypoint,
} from './media-transcode-entrypoint';

await startMediaTranscodeWorkerEntrypoint();
