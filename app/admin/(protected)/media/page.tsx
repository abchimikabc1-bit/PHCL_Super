'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  useAdmin,
} from '@/lib/admin-context';

type MediaRecord = {
  mediaId: string | null;
  ownerId: string | null;
  sourceFileName: string | null;
  contentType: string | null;
  declaredSizeBytes: number | null;
  status: string | null;
  schemaVersion: number | null;
  sourceObject: string | null;
  verifiedGeneration: string | null;
  validatedGeneration: string | null;
  validatedAtMs: number | null;
  validationFailureReason: string | null;
  validationProbe: unknown;
  transcoderJobName: string | null;
  transcodeSubmittedGeneration: string | null;
  transcodeSubmittedAtMs: number | null;
  transcodeCompletedGeneration: string | null;
  transcodeCompletedAtMs: number | null;
  processedOutputPrefix: string | null;
  masterManifestObject: string | null;
  hlsManifestObjects: string[];
  mp4Objects: string[];
  thumbnailObject: string | null;
  createdAtMs: number | null;
  updatedAtMs: number | null;
  serverCreatedAt: string | null;
  serverUpdatedAt: string | null;
};

type MediaResponse = {
  ok: boolean;
  message?: string;
  code?: string;
  generatedAt?: string;
  summary?: {
    total: number;
    matched: number;
    returned: number;
    statusCounts: Record<string, number>;
  };
  media?: MediaRecord[];
};

const STATUS_OPTIONS = [
  'ALL',
  'UPLOADING',
  'VALIDATED',
  'REJECTED',
  'TRANSCODE_PENDING',
  'TRANSCODING',
  'READY',
];

function formatBytes(
  value: number | null
): string {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return '—';
  }

  if (value < 1024) {
    return `${value} B`;
  }

  const units = [
    'KB',
    'MB',
    'GB',
  ];

  let size = value / 1024;
  let unitIndex = 0;

  while (
    size >= 1024 &&
    unitIndex <
      units.length - 1
  ) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(
    size >= 100
      ? 0
      : size >= 10
        ? 1
        : 2
  )} ${units[unitIndex]}`;
}

function formatDate(
  value: number | null
): string {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return '—';
  }

  try {
    return new Date(
      value
    ).toLocaleString();
  } catch {
    return '—';
  }
}

function statusClass(
  status: string | null
): string {
  switch (status) {
    case 'READY':
      return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300';

    case 'REJECTED':
      return 'border-rose-400/30 bg-rose-400/10 text-rose-300';

    case 'TRANSCODING':
      return 'border-purple-400/30 bg-purple-400/10 text-purple-300';

    case 'TRANSCODE_PENDING':
      return 'border-amber-400/30 bg-amber-400/10 text-amber-300';

    case 'VALIDATED':
      return 'border-sky-400/30 bg-sky-400/10 text-sky-300';

    case 'UPLOADING':
      return 'border-slate-400/30 bg-slate-400/10 text-slate-300';

    default:
      return 'border-white/10 bg-white/5 text-slate-300';
  }
}

function outputCount(
  media: MediaRecord
): number {
  return (
    media.hlsManifestObjects.length +
    media.mp4Objects.length +
    (
      media.thumbnailObject
        ? 1
        : 0
    )
  );
}

export default function AdminMediaPage() {
  const router = useRouter();

  const {
    isAuthenticated,
    isLoading,
    refreshSession,
    sessionDebug,
  } = useAdmin();

  const [
    media,
    setMedia,
  ] = useState<MediaRecord[]>([]);

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('ALL');

  const [
    searchTerm,
    setSearchTerm,
  ] = useState('');

  const [
    selectedMedia,
    setSelectedMedia,
  ] = useState<MediaRecord | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    summary,
    setSummary,
  ] = useState<
    MediaResponse['summary']
  >();

  const loadMedia = useCallback(
    async () => {
      if (!isAuthenticated) {
        return;
      }

      setLoading(true);
      setErrorMessage('');

      try {
        const params =
          new URLSearchParams();

        params.set(
          'limit',
          '100'
        );

        if (
          statusFilter !==
          'ALL'
        ) {
          params.set(
            'status',
            statusFilter
          );
        }

        if (
          searchTerm.trim()
        ) {
          params.set(
            'search',
            searchTerm.trim()
          );
        }

        const response =
          await fetch(
            `/api/admin/media?${params.toString()}`,
            {
              method: 'GET',
              credentials: 'include',
              cache: 'no-store',
              headers: {
                Accept:
                  'application/json',
              },
            }
          );

        const result =
          (await response.json()) as MediaResponse;

        if (
          response.status ===
          401
        ) {
          router.replace(
            '/admin/login'
          );
          return;
        }

        if (
          response.status ===
          403
        ) {
          setErrorMessage(
            'Trusted Admin device verification inahitajika.'
          );
          return;
        }

        if (
          !response.ok ||
          !result.ok
        ) {
          throw new Error(
            result.message ||
              'Imeshindikana kupata Media inventory.'
          );
        }

        setMedia(
          result.media ?? []
        );

        setSummary(
          result.summary
        );
      } catch (
        error
      ) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Imeshindikana kupata Media inventory.'
        );
      } finally {
        setLoading(false);
      }
    },
    [
      isAuthenticated,
      router,
      searchTerm,
      statusFilter,
    ]
  );

  useEffect(() => {
    if (
      !isLoading &&
      !isAuthenticated
    ) {
      router.replace(
        '/admin/login'
      );
    }
  }, [
    isAuthenticated,
    isLoading,
    router,
  ]);

  useEffect(() => {
    if (
      isAuthenticated
    ) {
      void loadMedia();
    }
  }, [
    isAuthenticated,
    loadMedia,
  ]);

  const visibleMedia =
    useMemo(
      () => media,
      [media]
    );

  const statusCounts =
    summary?.statusCounts ?? {};

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="rounded-xl border border-amber-300/20 bg-white/5 px-6 py-5 text-sm font-semibold text-amber-200">
          Inahakiki Admin session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black">
              <span className="text-amber-300">
                🎬
              </span>
              Media Management
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              PHCL Super private media
              processing inventory
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void loadMedia();
              }}
              disabled={loading}
              className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? 'Refreshing...'
                : 'Refresh'}
            </button>

            <Link
              href="/admin/dashboard"
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-600"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Total Media
            </p>
            <p className="mt-2 text-3xl font-black text-white">
              {summary?.total ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Ready
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-300">
              {statusCounts.READY ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-purple-400/20 bg-purple-400/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-300">
              Transcoding
            </p>
            <p className="mt-2 text-3xl font-black text-purple-300">
              {statusCounts.TRANSCODING ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-300">
              Rejected
            </p>
            <p className="mt-2 text-3xl font-black text-rose-300">
              {statusCounts.REJECTED ?? 0}
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Search media ID, owner, filename..."
              className="min-h-11 flex-1 rounded-lg border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-300/50"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="min-h-11 rounded-lg border border-white/10 bg-slate-900 px-4 text-sm text-white outline-none focus:border-amber-300/50"
            >
              {STATUS_OPTIONS.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status ===
                    'ALL'
                      ? 'All statuses'
                      : status}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
            {Object.entries(
              statusCounts
            ).map(
              ([
                status,
                count,
              ]) => (
                <span
                  key={status}
                  className={`rounded-full border px-2.5 py-1 ${statusClass(status)}`}
                >
                  {status}: {count}
                </span>
              )
            )}
          </div>
        </section>

        {errorMessage ? (
          <section className="mb-6 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200">
            <p className="font-semibold">
              Media inventory error
            </p>
            <p className="mt-1">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => {
                void loadMedia();
              }}
              className="mt-3 rounded-lg bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-500/30"
            >
              Retry
            </button>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm text-slate-300">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">
                    Media
                  </th>
                  <th className="px-4 py-3">
                    Owner
                  </th>
                  <th className="px-4 py-3">
                    Size
                  </th>
                  <th className="px-4 py-3">
                    Status
                  </th>
                  <th className="px-4 py-3">
                    Outputs
                  </th>
                  <th className="px-4 py-3">
                    Updated
                  </th>
                  <th className="px-4 py-3">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {visibleMedia.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-sm text-slate-400"
                    >
                      {loading
                        ? 'Inapakia media...'
                        : 'Hakuna media inayolingana na search/filter.'}
                    </td>
                  </tr>
                ) : (
                  visibleMedia.map(
                    (entry) => (
                      <tr
                        key={
                          entry.mediaId ??
                          `${entry.sourceFileName}-${entry.createdAtMs}`
                        }
                        className="transition hover:bg-white/5"
                      >
                        <td className="px-4 py-4">
                          <p className="max-w-[280px] truncate font-semibold text-white">
                            {entry.sourceFileName ??
                              'Unnamed media'}
                          </p>

                          <p className="mt-1 max-w-[280px] truncate font-mono text-[11px] text-slate-500">
                            {entry.mediaId ??
                              '—'}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <span className="font-mono text-xs text-slate-300">
                            {entry.ownerId ??
                              '—'}
                          </span>
                        </td>

                        <td className="px-4 py-4 font-medium text-white">
                          {formatBytes(
                            entry.declaredSizeBytes
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(entry.status)}`}
                          >
                            {entry.status ??
                              'UNKNOWN'}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="space-y-1 text-xs">
                            <p>
                              HLS:{' '}
                              <span className="font-semibold text-white">
                                {
                                  entry
                                    .hlsManifestObjects
                                    .length
                                }
                              </span>
                            </p>

                            <p>
                              MP4:{' '}
                              <span className="font-semibold text-white">
                                {
                                  entry
                                    .mp4Objects
                                    .length
                                }
                              </span>
                            </p>

                            <p>
                              Total:{' '}
                              <span className="font-semibold text-amber-200">
                                {outputCount(
                                  entry
                                )}
                              </span>
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-400">
                          {formatDate(
                            entry.updatedAtMs
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedMedia(
                                entry
                              )
                            }
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
          <span>
            Returned:{' '}
            {summary?.returned ?? 0}
            {' / '}
            {summary?.matched ?? 0}
            matched
          </span>

          <span>
            Admin session:{' '}
            {sessionDebug.hasSession
              ? 'active'
              : 'unknown'}
          </span>
        </div>
      </main>

      {selectedMedia ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedMedia(
                null
              );
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur">
              <div>
                <h2 className="font-bold text-white">
                  Media Details
                </h2>

                <p className="mt-1 font-mono text-xs text-slate-500">
                  {selectedMedia.mediaId ??
                    '—'}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedMedia(
                    null
                  )
                }
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="mb-3 text-sm font-bold text-amber-200">
                  Identity
                </h3>

                <dl className="space-y-2 text-xs">
                  <Detail
                    label="File"
                    value={
                      selectedMedia.sourceFileName
                    }
                  />
                  <Detail
                    label="Owner"
                    value={
                      selectedMedia.ownerId
                    }
                  />
                  <Detail
                    label="Content type"
                    value={
                      selectedMedia.contentType
                    }
                  />
                  <Detail
                    label="Size"
                    value={formatBytes(
                      selectedMedia.declaredSizeBytes
                    )}
                  />
                  <Detail
                    label="Status"
                    value={
                      selectedMedia.status
                    }
                  />
                  <Detail
                    label="Generation"
                    value={
                      selectedMedia.verifiedGeneration
                    }
                  />
                </dl>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="mb-3 text-sm font-bold text-amber-200">
                  Validation
                </h3>

                <dl className="space-y-2 text-xs">
                  <Detail
                    label="Validated generation"
                    value={
                      selectedMedia.validatedGeneration
                    }
                  />
                  <Detail
                    label="Validated at"
                    value={formatDate(
                      selectedMedia.validatedAtMs
                    )}
                  />
                  <Detail
                    label="Failure reason"
                    value={
                      selectedMedia.validationFailureReason
                    }
                  />
                </dl>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="mb-3 text-sm font-bold text-amber-200">
                  Transcoding
                </h3>

                <dl className="space-y-2 text-xs">
                  <Detail
                    label="Job"
                    value={
                      selectedMedia.transcoderJobName
                    }
                  />
                  <Detail
                    label="Submitted generation"
                    value={
                      selectedMedia.transcodeSubmittedGeneration
                    }
                  />
                  <Detail
                    label="Submitted at"
                    value={formatDate(
                      selectedMedia.transcodeSubmittedAtMs
                    )}
                  />
                  <Detail
                    label="Completed generation"
                    value={
                      selectedMedia.transcodeCompletedGeneration
                    }
                  />
                  <Detail
                    label="Completed at"
                    value={formatDate(
                      selectedMedia.transcodeCompletedAtMs
                    )}
                  />
                </dl>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="mb-3 text-sm font-bold text-amber-200">
                  Outputs
                </h3>

                <dl className="space-y-2 text-xs">
                  <Detail
                    label="HLS manifests"
                    value={
                      selectedMedia
                        .hlsManifestObjects
                        .length
                        .toString()
                    }
                  />
                  <Detail
                    label="MP4 outputs"
                    value={
                      selectedMedia
                        .mp4Objects
                        .length
                        .toString()
                    }
                  />
                  <Detail
                    label="Thumbnail"
                    value={
                      selectedMedia.thumbnailObject
                        ? 'Present'
                        : 'Not present'
                    }
                  />
                  <Detail
                    label="Output prefix"
                    value={
                      selectedMedia.processedOutputPrefix
                    }
                  />
                </dl>
              </div>

              <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="mb-3 text-sm font-bold text-amber-200">
                  Storage Objects
                </h3>

                <div className="space-y-3 text-xs">
                  <ObjectList
                    title="HLS"
                    objects={
                      selectedMedia.hlsManifestObjects
                    }
                  />

                  <ObjectList
                    title="MP4"
                    objects={
                      selectedMedia.mp4Objects
                    }
                  />

                  <ObjectList
                    title="Thumbnail"
                    objects={
                      selectedMedia.thumbnailObject
                        ? [
                            selectedMedia.thumbnailObject,
                          ]
                        : []
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number
    | null
    | undefined;
}) {
  return (
    <div className="flex gap-3 border-b border-white/5 pb-2">
      <dt className="w-40 shrink-0 text-slate-500">
        {label}
      </dt>

      <dd className="min-w-0 break-all text-slate-200">
        {value === null ||
        value === undefined ||
        value === ''
          ? '—'
          : String(value)}
      </dd>
    </div>
  );
}

function ObjectList({
  title,
  objects,
}: {
  title: string;
  objects: string[];
}) {
  return (
    <div>
      <p className="mb-1 font-semibold text-slate-300">
        {title}
      </p>

      {objects.length === 0 ? (
        <p className="text-slate-600">
          None
        </p>
      ) : (
        <ul className="space-y-1">
          {objects.map(
            (object) => (
              <li
                key={object}
                className="break-all rounded bg-black/30 px-3 py-2 font-mono text-slate-400"
              >
                {object}
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}
