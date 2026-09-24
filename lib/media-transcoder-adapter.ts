import 'server-only';

import {
  v1,
  type protos,
} from '@google-cloud/video-transcoder';

import {
  buildMediaTranscodeJob,
  type MediaTranscodeJob,
} from '@/lib/media-transcode-job-config';

const SAFE_PROJECT_ID_PATTERN =
  /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

const SAFE_LOCATION_PATTERN =
  /^[a-z][a-z0-9-]{0,62}$/;

const SAFE_BUCKET_PATTERN =
  /^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/;

const SAFE_GENERATION_PATTERN =
  /^[0-9]{1,32}$/;

const JOB_NAME_PATTERN =
  /^projects\/([a-z][a-z0-9-]{4,28}[a-z0-9]|[1-9][0-9]{5,19})\/locations\/([a-z][a-z0-9-]{0,62})\/jobs\/[A-Za-z0-9_-]+$/;

const PROJECT_NUMBER_PATTERN =
  /^[1-9][0-9]{5,19}$/;

const SUCCEEDED_JOB_STATE =
  3;

export type MediaTranscoderSubmissionInput = {
  projectId: string;
  location: string;
  bucketName: string;
  completionTopic: string;
  mediaId: string;
  sourceObject: string;
  verifiedGeneration: string;
};

export type MediaTranscoderSubmissionResult = {
  jobName: string;
  created: boolean;
};

export type MediaTranscoderAdapterDependencies = {
  listJobs: (
    parent: string,
    filter: string
  ) => AsyncIterable<MediaTranscodeJob>;

  createJob: (
    parent: string,
    job: MediaTranscodeJob
  ) => Promise<MediaTranscodeJob>;
};

export type MediaTranscoderCompletedJobInput = {
  location: string;
  bucketName: string;
  mediaId: string;
  sourceObject: string;
  verifiedGeneration: string;
  transcoderJobName: string;
};

export type MediaTranscoderCompletedJob = {
  jobName: string;
  state: 'SUCCEEDED';
  mediaId: string;
  verifiedGeneration: string;
};

export type MediaTranscoderCompletedJobDependencies = {
  getJob: (
    name: string
  ) => Promise<MediaTranscodeJob>;
};

function invalidSubmission(): never {
  throw new Error(
    'INVALID_MEDIA_TRANSCODER_SUBMISSION'
  );
}

function invalidCompletedJob(): never {
  throw new Error(
    'INVALID_MEDIA_TRANSCODER_COMPLETED_JOB'
  );
}

function isCanonicalNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.trim() === value
  );
}

function assertSubmissionInput(
  input: MediaTranscoderSubmissionInput
): void {
  if (
    !SAFE_PROJECT_ID_PATTERN.test(
      input.projectId
    ) ||
    !SAFE_LOCATION_PATTERN.test(
      input.location
    ) ||
    !isCanonicalNonEmptyString(
      input.mediaId
    ) ||
    !isCanonicalNonEmptyString(
      input.verifiedGeneration
    )
  ) {
    return invalidSubmission();
  }

  buildMediaTranscodeJob({
    bucketName:
      input.bucketName,
    mediaId:
      input.mediaId,
    sourceObject:
      input.sourceObject,
    verifiedGeneration:
      input.verifiedGeneration,
    completionTopic:
      input.completionTopic,
  });
}

function assertCompletedJobInput(
  input: MediaTranscoderCompletedJobInput
): void {
  if (
    !SAFE_LOCATION_PATTERN.test(
      input.location
    ) ||
    !SAFE_BUCKET_PATTERN.test(
      input.bucketName
    ) ||
    !isCanonicalNonEmptyString(
      input.mediaId
    ) ||
    !isCanonicalNonEmptyString(
      input.sourceObject
    ) ||
    !SAFE_GENERATION_PATTERN.test(
      input.verifiedGeneration
    ) ||
    !isCanonicalNonEmptyString(
      input.transcoderJobName
    )
  ) {
    return invalidCompletedJob();
  }

  if (
    !input.sourceObject.startsWith(
      'media/ingest/'
    ) ||
    !input.sourceObject.includes(
      `/${input.mediaId}/`
    ) ||
    input.sourceObject.includes('..') ||
    input.sourceObject.includes('\\')
  ) {
    return invalidCompletedJob();
  }

  const match =
    input.transcoderJobName.match(
      JOB_NAME_PATTERN
    );

  if (
    match === null ||
    match[2] !== input.location
  ) {
    return invalidCompletedJob();
  }
}

function buildParent(
  projectId: string,
  location: string
): string {
  return (
    `projects/${projectId}/` +
    `locations/${location}`
  );
}

function buildIdentityFilter(
  mediaId: string,
  verifiedGeneration: string
): string {
  return (
    `labels.phcl_media_id:${mediaId} ` +
    `AND labels.phcl_generation:${verifiedGeneration} ` +
    'AND labels.phcl_pipeline:media-transcode-v1'
  );
}

function hasExactIdentity(
  job: MediaTranscodeJob,
  mediaId: string,
  verifiedGeneration: string
): boolean {
  return (
    job.labels?.phcl_media_id ===
      mediaId &&
    job.labels?.phcl_generation ===
      verifiedGeneration &&
    job.labels?.phcl_pipeline ===
      'media-transcode-v1'
  );
}

function readJobName(
  job: MediaTranscodeJob,
  input: MediaTranscoderSubmissionInput
): string {
  if (
    !isCanonicalNonEmptyString(
      job.name
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_TRANSCODER_JOB'
    );
  }

  const match =
    job.name.match(
      JOB_NAME_PATTERN
    );

  if (match === null) {
    throw new Error(
      'INVALID_MEDIA_TRANSCODER_JOB'
    );
  }

  const projectReference =
    match[1];

  const location =
    match[2];

  if (
    location !== input.location ||
    (
      projectReference !==
        input.projectId &&
      !PROJECT_NUMBER_PATTERN.test(
        projectReference ?? ''
      )
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_TRANSCODER_JOB'
    );
  }

  return job.name;
}

function isSucceededState(
  value: unknown
): boolean {
  return (
    value === 'SUCCEEDED' ||
    value === SUCCEEDED_JOB_STATE
  );
}

function hasCanonicalCompletedJobConfig(
  job: MediaTranscodeJob,
  input: MediaTranscoderCompletedJobInput
): boolean {
  const inputs =
    job.config?.inputs;

  const expectedInputUri =
    `gs://${input.bucketName}/${input.sourceObject}`;

  const expectedOutputUri =
    `gs://${input.bucketName}/media/processed/${input.mediaId}/`;

  return (
    Array.isArray(inputs) &&
    inputs.length === 1 &&
    inputs[0]?.key === 'source' &&
    inputs[0]?.uri === expectedInputUri &&
    job.config?.output?.uri ===
      expectedOutputUri
  );
}

export async function submitMediaTranscodeJobWithDependencies(
  input: MediaTranscoderSubmissionInput,
  dependencies: MediaTranscoderAdapterDependencies
): Promise<MediaTranscoderSubmissionResult> {
  assertSubmissionInput(
    input
  );

  const parent =
    buildParent(
      input.projectId,
      input.location
    );

  const filter =
    buildIdentityFilter(
      input.mediaId,
      input.verifiedGeneration
    );

  let matchingJob:
    MediaTranscodeJob | null = null;

  for await (
    const job
    of dependencies.listJobs(
      parent,
      filter
    )
  ) {
    if (
      !hasExactIdentity(
        job,
        input.mediaId,
        input.verifiedGeneration
      )
    ) {
      continue;
    }

    if (matchingJob !== null) {
      throw new Error(
        'AMBIGUOUS_MEDIA_TRANSCODER_JOBS'
      );
    }

    matchingJob =
      job;
  }

  if (matchingJob !== null) {
    return {
      jobName:
        readJobName(
          matchingJob,
          input
        ),
      created:
        false,
    };
  }

  const job =
    buildMediaTranscodeJob({
      bucketName:
        input.bucketName,
      mediaId:
        input.mediaId,
      sourceObject:
        input.sourceObject,
      verifiedGeneration:
        input.verifiedGeneration,
      completionTopic:
        input.completionTopic,
    });

  const createdJob =
    await dependencies.createJob(
      parent,
      job
    );

  if (
    !hasExactIdentity(
      createdJob,
      input.mediaId,
      input.verifiedGeneration
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_TRANSCODER_JOB'
    );
  }

  return {
    jobName:
      readJobName(
        createdJob,
        input
      ),
    created:
      true,
  };
}

export async function readCompletedMediaTranscodeJobWithDependencies(
  input: MediaTranscoderCompletedJobInput,
  dependencies: MediaTranscoderCompletedJobDependencies
): Promise<MediaTranscoderCompletedJob> {
  assertCompletedJobInput(
    input
  );

  const job =
    await dependencies.getJob(
      input.transcoderJobName
    );

  if (
    job.name !==
      input.transcoderJobName ||
    !hasExactIdentity(
      job,
      input.mediaId,
      input.verifiedGeneration
    ) ||
    !hasCanonicalCompletedJobConfig(
      job,
      input
    )
  ) {
    return invalidCompletedJob();
  }

  if (!isSucceededState(job.state)) {
    throw new Error(
      'MEDIA_TRANSCODER_JOB_NOT_SUCCEEDED'
    );
  }

  return {
    jobName:
      input.transcoderJobName,
    state:
      'SUCCEEDED',
    mediaId:
      input.mediaId,
    verifiedGeneration:
      input.verifiedGeneration,
  };
}

type TranscoderJob =
  protos.google.cloud.video.transcoder.v1.IJob;

const transcoderClient =
  new v1.TranscoderServiceClient();

const productionSubmissionDependencies:
  MediaTranscoderAdapterDependencies = {
    listJobs: (
      parent,
      filter
    ) =>
      transcoderClient.listJobsAsync({
        parent,
        filter,
        pageSize:
          10,
      }),

    createJob:
      async (
        parent,
        job
      ) => {
        const [createdJob] =
          await transcoderClient.createJob({
            parent,
            job:
              job as TranscoderJob,
          });

        return createdJob;
      },
  };

const productionCompletedJobDependencies:
  MediaTranscoderCompletedJobDependencies = {
    getJob:
      async (name) => {
        const [job] =
          await transcoderClient.getJob({
            name,
          });

        return job;
      },
  };

export function submitMediaTranscodeJob(
  input: MediaTranscoderSubmissionInput
): Promise<MediaTranscoderSubmissionResult> {
  return submitMediaTranscodeJobWithDependencies(
    input,
    productionSubmissionDependencies
  );
}

export function readCompletedMediaTranscodeJob(
  input: MediaTranscoderCompletedJobInput
): Promise<MediaTranscoderCompletedJob> {
  return readCompletedMediaTranscodeJobWithDependencies(
    input,
    productionCompletedJobDependencies
  );
}
