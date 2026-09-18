import 'server-only';

import {
  startMediaValidationWorkerEntrypoint,
} from './media-validation-entrypoint';

await startMediaValidationWorkerEntrypoint();