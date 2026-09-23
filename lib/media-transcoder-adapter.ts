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

const JOB_NAME_PATTERN =
  /^projects\/([a-z][a-z0-9-]{4,28}[a-z0-9]|[1-9][0-9]{5,19})\/locations\/([a-z][a-z0-9-]{0,62})\/jobs\/[A-Za-z0-9_-]+$/;

const PROJECT_NUMBER_PATTERN =
  /^[1-9][0-9]{5,19}$/;

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

function invalidSubmission(): never {
  throw new Error(
    'INVALID_MEDIA_TRANSCODER_SUBMISSION'
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
  input: MediaTranscoderSubmissionInput
): boolean {
  return (
    job.labels?.phcl_media_id ===
      input.mediaId &&
    job.labels?.phcl_generation ===
      input.verifiedGeneration &&
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
        input
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
      input
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

type TranscoderJob =
  protos.google.cloud.video.transcoder.v1.IJob;

const transcoderClient =
  new v1.TranscoderServiceClient();

const productionDependencies:
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

export function submitMediaTranscodeJob(
  input: MediaTranscoderSubmissionInput
): Promise<MediaTranscoderSubmissionResult> {
  return submitMediaTranscodeJobWithDependencies(
    input,
    productionDependencies
  );
}
