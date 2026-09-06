'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';

type RecoverySummary = {
  total: number;
  remaining: number;
  used: number;
  createdAtMs: number | null;
};

type StatusResponse = {
  ok: boolean;
  summary?: RecoverySummary;
};

type GenerateResponse = {
  ok: boolean;
  codes?: string[];
  count?: number;
  message?: string;
};

export default function AdminRecoveryPage() {
  const [summary, setSummary] =
    useState<RecoverySummary | null>(null);

  const [codes, setCodes] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [generating, setGenerating] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const loadStatus = useCallback(
    async () => {
      try {
        const response = await fetch(
          '/api/admin/recovery/status',
          {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
          }
        );

        const data =
          (await response.json()) as StatusResponse;

        if (
          response.ok &&
          data.ok &&
          data.summary
        ) {
          setSummary(data.summary);
        }
      } catch {
        setMessage(
          'Unable to read recovery-code status.'
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function generateCodes() {
    if (generating) {
      return;
    }

    if (
      summary &&
      summary.total > 0
    ) {
      const confirmed =
        window.confirm(
          'Generating a new set will invalidate all existing recovery codes. Continue?'
        );

      if (!confirmed) {
        return;
      }
    }

    setGenerating(true);
    setMessage('');
    setCodes([]);

    try {
      const response = await fetch(
        '/api/admin/recovery/generate',
        {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
        }
      );

      const data =
        (await response.json()) as GenerateResponse;

      if (
        !response.ok ||
        !data.ok ||
        !Array.isArray(data.codes)
      ) {
        throw new Error(
          data.message ||
            'Unable to generate recovery codes.'
        );
      }

      setCodes(data.codes);

      setMessage(
        'Recovery codes generated. Save them securely now; they will not be displayed again.'
      );

      await loadStatus();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to generate recovery codes.'
      );
    } finally {
      setGenerating(false);
    }
  }

  async function copyCodes() {
    if (codes.length === 0) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        codes.join('\n')
      );

      setMessage(
        'Recovery codes copied. Clear clipboard after storing them securely.'
      );
    } catch {
      setMessage(
        'Unable to copy recovery codes.'
      );
    }
  }

  function printCodes() {
    if (codes.length === 0) {
      return;
    }

    window.print();
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <section className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
          PHCL Super Admin Security
        </p>

        <h1 className="mt-3 text-3xl font-bold text-white">
          Admin Recovery Codes
        </h1>

        <p className="mt-4 leading-7 text-slate-300">
          Recovery codes provide emergency
          access if the primary Trusted Admin
          Device becomes unavailable. Each
          code can be used only once.
        </p>

        <div className="mt-6 rounded-2xl border border-amber-300/25 bg-slate-950 p-5">
          {loading ? (
            <p className="text-slate-300">
              Loading recovery status...
            </p>
          ) : (
            <>
              <p className="font-semibold text-white">
                Recovery status
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase text-slate-400">
                    Total
                  </p>
                  <p className="text-xl font-bold text-white">
                    {summary?.total ?? 0}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase text-slate-400">
                    Remaining
                  </p>
                  <p className="text-xl font-bold text-emerald-300">
                    {summary?.remaining ?? 0}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase text-slate-400">
                    Used
                  </p>
                  <p className="text-xl font-bold text-amber-300">
                    {summary?.used ?? 0}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {message && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-white/15 bg-slate-950 p-4 text-sm text-white"
          >
            {message}
          </div>
        )}

        {codes.length === 0 ? (
          <button
            type="button"
            onClick={generateCodes}
            disabled={
              loading ||
              generating
            }
            className="mt-6 rounded-xl bg-amber-400 px-6 py-3 font-bold text-slate-950 disabled:opacity-60"
          >
            {generating
              ? 'Generating...'
              : summary &&
                  summary.total > 0
                ? 'Regenerate Recovery Codes'
                : 'Generate Recovery Codes'}
          </button>
        ) : (
          <div className="mt-6">
            <div className="rounded-2xl border border-amber-300/40 bg-slate-950 p-5">
              <p className="font-bold text-amber-300">
                Save these codes now
              </p>

              <p className="mt-2 text-sm text-slate-300">
                PHCL Super will not show this
                plaintext set again after you
                leave or refresh this page.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {codes.map(
                  (code, index) => (
                    <code
                      key={code}
                      className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white"
                    >
                      {String(
                        index + 1
                      ).padStart(
                        2,
                        '0'
                      )}
                      {' — '}
                      {code}
                    </code>
                  )
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 print:hidden">
              <button
                type="button"
                onClick={copyCodes}
                className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-white"
              >
                Copy Codes
              </button>

              <button
                type="button"
                onClick={printCodes}
                className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-white"
              >
                Print Codes
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 border-t border-white/10 pt-5 print:hidden">
          <p className="text-sm leading-6 text-slate-400">
            Keep the recovery codes outside
            this computer. Do not store them
            in source code, GitHub, .env files,
            screenshots, or plain-text cloud
            documents.
          </p>

          <Link
            href="/admin/dashboard"
            className="mt-4 inline-block font-semibold text-amber-300"
          >
            ← Return to Admin Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}