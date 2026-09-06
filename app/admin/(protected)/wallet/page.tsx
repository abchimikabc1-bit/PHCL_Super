'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAdmin } from '@/lib/admin-context';

type FinancialAsset = 'USD' | 'TZS' | 'NTZS' | 'PI';
type LedgerDirection = 'CREDIT' | 'DEBIT';
type WalletMode = 'GLOBAL' | 'CUSTOMER';

type LedgerEntry = {
  ledgerEntryId: string;
  operationId: string;
  uid: string;
  operationType: string;
  asset: FinancialAsset;
  direction: LedgerDirection;
  amountAtomic: string;
  amount: string;
  balanceBeforeAtomic: string;
  balanceBefore: string;
  balanceAfterAtomic: string;
  balanceAfter: string;
  description: string;
  createdAt: string | null;
};

type CustomerProfile = {
  uid: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  role: string | null;
  tier: 'regular' | 'small_business' | 'corporate' | null;
  accountStatus: string | null;
  verificationStatus: string | null;
  kycStatus: string | null;
  kysStatus: string | null;
  kybStatus: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  biometricVerificationStatus: string | null;
  mfaEnabled: boolean;
  mfaVerified: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type FinancialAccount = {
  uid: string;
  exists: boolean;
  balances: {
    USD: string;
    TZS: string;
    NTZS: string;
    PI: string;
  };
  balancesAtomic: {
    usd: string;
    tzs: string;
    ntzs: string;
    pi: string;
  };
  updatedAt: string | null;
};

type WalletApiResponse = {
  ok: boolean;
  mode?: WalletMode;
  uid?: string;
  profile?: CustomerProfile | null;
  account?: FinancialAccount;
  entries?: LedgerEntry[];
  count?: number;
  nextCursor?: string | null;
  error?: string;
};

type DirectionFilter = 'ALL' | LedgerDirection;
type AssetFilter = 'ALL' | FinancialAsset;

const PAGE_LIMIT = 50;
const ASSETS: FinancialAsset[] = ['USD', 'TZS', 'NTZS', 'PI'];

function formatAssetLabel(asset: FinancialAsset): string {
  return asset === 'NTZS' ? 'nTZS' : asset;
}

function formatDisplayAmount(asset: FinancialAsset, amount: string): string {
  const normalized = amount.trim();
  return `${formatAssetLabel(asset)} ${normalized || '0'}`;
}

function formatDate(value: string | null): string {
  if (!value) return 'Pending timestamp';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString();
}

function truncateId(value: string, start = 10, end = 8): string {
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function csvEscape(
  value: string | number | null | undefined,
): string {
  const raw = String(value ?? '');
  const neutralized = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;

  if (
    neutralized.includes(',') ||
    neutralized.includes('"') ||
    neutralized.includes('\n')
  ) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }

  return neutralized;
}

function addDecimalStrings(values: string[]): string {
  if (values.length === 0) return '0';

  let maxDecimals = 0;

  const parsed = values.map((raw) => {
    const normalized = raw.trim();
    const negative = normalized.startsWith('-');
    const unsigned = negative ? normalized.slice(1) : normalized;
    const [whole = '0', fraction = ''] = unsigned.split('.');
    maxDecimals = Math.max(maxDecimals, fraction.length);
    return { negative, whole, fraction };
  });

  let total = BigInt(0);

  for (const value of parsed) {
    const paddedFraction = value.fraction.padEnd(maxDecimals, '0');
    const atomicText =
      `${value.whole}${paddedFraction}`.replace(/^0+(?=\d)/, '') || '0';
    const atomic = BigInt(atomicText);
    total += value.negative ? -atomic : atomic;
  }

  const negative = total < BigInt(0);
  const absolute = (negative ? -total : total).toString();

  if (maxDecimals === 0) {
    return `${negative ? '-' : ''}${absolute}`;
  }

  const padded = absolute.padStart(maxDecimals + 1, '0');
  const whole = padded.slice(0, -maxDecimals);
  const fraction = padded.slice(-maxDecimals).replace(/0+$/, '');

  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

function statusClass(value: string | null | undefined): string {
  const normalized = (value ?? '').toUpperCase();

  if (
    normalized.includes('VERIFIED') ||
    normalized.includes('APPROVED') ||
    normalized === 'ACTIVE'
  ) {
    return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200';
  }

  if (
    normalized.includes('PENDING') ||
    normalized.includes('STARTED') ||
    normalized.includes('REVIEW')
  ) {
    return 'border-amber-400/20 bg-amber-400/10 text-amber-200';
  }

  if (
    normalized.includes('REJECTED') ||
    normalized.includes('RESTRICTED') ||
    normalized.includes('SUSPENDED') ||
    normalized.includes('DISABLED')
  ) {
    return 'border-rose-400/20 bg-rose-400/10 text-rose-200';
  }

  return 'border-white/10 bg-white/5 text-slate-300';
}

function StatusBadge({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <span
        className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
          value,
        )}`}
      >
        {value || 'N/A'}
      </span>
    </div>
  );
}

export default function AdminWalletPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAdminLoading } = useAdmin();

  const [mode, setMode] = useState<WalletMode>('GLOBAL');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [account, setAccount] = useState<FinancialAccount | null>(null);

  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] =
    useState<DirectionFilter>('ALL');
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('ALL');
  const [operationTypeFilter, setOperationTypeFilter] = useState('ALL');

  useEffect(() => {
    if (!isAdminLoading && !isAuthenticated) {
      router.replace('/admin/login');
    }
  }, [isAdminLoading, isAuthenticated, router]);

  const handleProtectedResponse = useCallback(
    (status: number): boolean => {
      if (status === 401) {
        router.replace('/admin/login');
        return true;
      }

      if (status === 403) {
        router.replace('/admin/security/verify-device');
        return true;
      }

      return false;
    },
    [router],
  );

  const loadGlobalLedger = useCallback(
    async (cursor?: string) => {
      if (cursor) {
        setIsLoadingMore(true);
      } else {
        setIsFetching(true);
        setError('');
      }

      try {
        const params = new URLSearchParams();
        params.set('limit', String(PAGE_LIMIT));

        if (cursor) {
          params.set('cursor', cursor);
        }

        const response = await fetch(
          `/api/admin/wallet?${params.toString()}`,
          {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          },
        );

        const data = (await response.json()) as WalletApiResponse;

        if (handleProtectedResponse(response.status)) return;

        if (
          !response.ok ||
          !data.ok ||
          data.mode !== 'GLOBAL' ||
          !Array.isArray(data.entries)
        ) {
          throw new Error(data.error || 'Unable to load financial ledger.');
        }

        setMode('GLOBAL');
        setSelectedUid(null);
        setProfile(null);
        setAccount(null);

        setEntries((current) => {
          if (!cursor) return data.entries!;

          const byId = new Map<string, LedgerEntry>();

          for (const entry of current) {
            byId.set(entry.ledgerEntryId, entry);
          }

          for (const entry of data.entries!) {
            byId.set(entry.ledgerEntryId, entry);
          }

          return Array.from(byId.values());
        });

        setNextCursor(data.nextCursor ?? null);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to load financial ledger.',
        );
      } finally {
        setIsFetching(false);
        setIsLoadingMore(false);
      }
    },
    [handleProtectedResponse],
  );

  const loadCustomerWallet = useCallback(
    async (uid: string, cursor?: string) => {
      const normalizedUid = uid.trim();
      if (!normalizedUid) return;

      if (cursor) {
        setIsLoadingMore(true);
      } else {
        setIsFetching(true);
        setError('');
      }

      try {
        const params = new URLSearchParams();
        params.set('uid', normalizedUid);
        params.set('limit', String(PAGE_LIMIT));

        if (cursor) {
          params.set('cursor', cursor);
        }

        const response = await fetch(
          `/api/admin/wallet?${params.toString()}`,
          {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          },
        );

        const data = (await response.json()) as WalletApiResponse;

        if (handleProtectedResponse(response.status)) return;

        if (
          !response.ok ||
          !data.ok ||
          data.mode !== 'CUSTOMER' ||
          data.uid !== normalizedUid ||
          !Array.isArray(data.entries) ||
          !data.account
        ) {
          throw new Error(data.error || 'Unable to load customer wallet.');
        }

        setMode('CUSTOMER');
        setSelectedUid(normalizedUid);
        setProfile(data.profile ?? null);
        setAccount(data.account);

        setEntries((current) => {
          if (!cursor) return data.entries!;

          const byId = new Map<string, LedgerEntry>();

          for (const entry of current) {
            byId.set(entry.ledgerEntryId, entry);
          }

          for (const entry of data.entries!) {
            byId.set(entry.ledgerEntryId, entry);
          }

          return Array.from(byId.values());
        });

        setNextCursor(data.nextCursor ?? null);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to load customer wallet.',
        );
      } finally {
        setIsFetching(false);
        setIsLoadingMore(false);
      }
    },
    [handleProtectedResponse],
  );

  useEffect(() => {
    if (isAdminLoading || !isAuthenticated) return;
    void loadGlobalLedger();
  }, [isAdminLoading, isAuthenticated, loadGlobalLedger]);

  const operationTypes = useMemo(
    () =>
      Array.from(
        new Set(entries.map((entry) => entry.operationType)),
      ).sort(),
    [entries],
  );

  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return entries.filter((entry) => {
      if (
        directionFilter !== 'ALL' &&
        entry.direction !== directionFilter
      ) {
        return false;
      }

      if (assetFilter !== 'ALL' && entry.asset !== assetFilter) {
        return false;
      }

      if (
        operationTypeFilter !== 'ALL' &&
        entry.operationType !== operationTypeFilter
      ) {
        return false;
      }

      if (!query) return true;

      return [
        entry.ledgerEntryId,
        entry.operationId,
        entry.uid,
        entry.operationType,
        entry.asset,
        entry.direction,
        entry.description,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [
    entries,
    searchTerm,
    directionFilter,
    assetFilter,
    operationTypeFilter,
  ]);

  const metrics = useMemo(() => {
    const debitEntries = entries.filter(
      (entry) => entry.direction === 'DEBIT',
    );
    const creditEntries = entries.filter(
      (entry) => entry.direction === 'CREDIT',
    );

    const debitVolume = Object.fromEntries(
      ASSETS.map((asset) => [
        asset,
        addDecimalStrings(
          debitEntries
            .filter((entry) => entry.asset === asset)
            .map((entry) => entry.amount),
        ),
      ]),
    ) as Record<FinancialAsset, string>;

    const creditVolume = Object.fromEntries(
      ASSETS.map((asset) => [
        asset,
        addDecimalStrings(
          creditEntries
            .filter((entry) => entry.asset === asset)
            .map((entry) => entry.amount),
        ),
      ]),
    ) as Record<FinancialAsset, string>;

    return {
      debitCount: debitEntries.length,
      creditCount: creditEntries.length,
      uniqueCustomers: new Set(entries.map((entry) => entry.uid)).size,
      debitVolume,
      creditVolume,
    };
  }, [entries]);

  function exportLedger() {
    const header = [
      'ledger_entry_id',
      'operation_id',
      'customer_uid',
      'operation_type',
      'direction',
      'asset',
      'amount',
      'balance_before',
      'balance_after',
      'description',
      'created_at',
    ];

    const rows = filteredEntries.map((entry) => [
      csvEscape(entry.ledgerEntryId),
      csvEscape(entry.operationId),
      csvEscape(entry.uid),
      csvEscape(entry.operationType),
      csvEscape(entry.direction),
      csvEscape(entry.asset),
      csvEscape(entry.amount),
      csvEscape(entry.balanceBefore),
      csvEscape(entry.balanceAfter),
      csvEscape(entry.description),
      csvEscape(entry.createdAt),
    ]);

    const csv = [
      header.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download =
      mode === 'CUSTOMER' && selectedUid
        ? `phcl-customer-wallet-${selectedUid}-${new Date()
            .toISOString()
            .replace(/[:.]/g, '-')}.csv`
        : `phcl-global-financial-ledger-${new Date()
            .toISOString()
            .replace(/[:.]/g, '-')}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function returnToGlobal() {
    setSearchTerm('');
    setDirectionFilter('ALL');
    setAssetFilter('ALL');
    setOperationTypeFilter('ALL');
    void loadGlobalLedger();
  }

  if (isAdminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <p className="text-sm text-slate-300">
          Loading Admin Wallet...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">
              PHCL Super Financial Control
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">
              {mode === 'CUSTOMER'
                ? 'Customer Wallet Detail'
                : 'Global Financial Ledger'}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              {mode === 'CUSTOMER'
                ? 'Read-only authoritative customer financial account, compliance summary and UID-bound ledger.'
                : 'Server-authoritative view of customer wallet activity. Every financial entry remains bound to its customer UID.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {mode === 'CUSTOMER' ? (
              <button
                type="button"
                onClick={returnToGlobal}
                className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
              >
                ← Global Ledger
              </button>
            ) : null}

            <Link
              href="/admin/dashboard"
              className="rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Dashboard
            </Link>

            <Link
              href="/admin/orders"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              Orders
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {mode === 'GLOBAL' ? (
          <>
            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Loaded Ledger Entries" value={entries.length} />
              <MetricCard
                label="Customer Wallets Seen"
                value={metrics.uniqueCustomers}
                valueClass="text-cyan-300"
              />
              <MetricCard
                label="Debit Entries"
                value={metrics.debitCount}
                valueClass="text-rose-300"
              />
              <MetricCard
                label="Credit Entries"
                value={metrics.creditCount}
                valueClass="text-emerald-300"
              />
            </section>

            <section className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
              <p className="text-sm font-semibold text-amber-200">
                Customer Wallet Architecture
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Global Ledger is an administrative monitoring view.
                Wallet balances are not combined here. Each customer retains
                an independent financial account under their UID. Select a
                Customer UID below to inspect that customer&apos;s authoritative
                wallet and applicable KYC, KYS or KYB status.
              </p>
            </section>
          </>
        ) : (
          <CustomerSummary
            uid={selectedUid}
            profile={profile}
            account={account}
          />
        )}

        <section className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search UID, ledger ID, operation ID, description..."
              className="min-w-[260px] flex-1 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-purple-400"
            />

            <select
              value={directionFilter}
              onChange={(event) =>
                setDirectionFilter(event.target.value as DirectionFilter)
              }
              className="rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
            >
              <option value="ALL">All Directions</option>
              <option value="DEBIT">Debit</option>
              <option value="CREDIT">Credit</option>
            </select>

            <select
              value={assetFilter}
              onChange={(event) =>
                setAssetFilter(event.target.value as AssetFilter)
              }
              className="rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
            >
              <option value="ALL">All Assets</option>
              {ASSETS.map((asset) => (
                <option key={asset} value={asset}>
                  {formatAssetLabel(asset)}
                </option>
              ))}
            </select>

            <select
              value={operationTypeFilter}
              onChange={(event) =>
                setOperationTypeFilter(event.target.value)
              }
              className="rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
            >
              <option value="ALL">All Operations</option>
              {operationTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={exportLedger}
              disabled={filteredEntries.length === 0}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export CSV
            </button>

            <button
              type="button"
              onClick={() =>
                mode === 'CUSTOMER' && selectedUid
                  ? void loadCustomerWallet(selectedUid)
                  : void loadGlobalLedger()
              }
              disabled={isFetching}
              className="rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Showing {filteredEntries.length} of {entries.length} loaded ledger
            entries.
          </p>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <VolumeCard
            title="Loaded Debit Volume"
            titleClass="text-rose-300"
            values={metrics.debitVolume}
          />
          <VolumeCard
            title="Loaded Credit Volume"
            titleClass="text-emerald-300"
            values={metrics.creditVolume}
          />
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
            <div>
              <h2 className="font-semibold text-white">
                {mode === 'CUSTOMER'
                  ? 'Customer Financial Ledger'
                  : 'Financial Ledger Entries'}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Read-only authoritative transaction history.
              </p>
            </div>

            {nextCursor ? (
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                More entries available
              </span>
            ) : null}
          </div>

          {error ? (
            <div className="m-4 rounded-lg border border-rose-400/30 bg-rose-400/10 p-4">
              <p className="text-sm font-semibold text-rose-200">
                Unable to load wallet
              </p>
              <p className="mt-1 text-sm text-rose-100/80">{error}</p>
              <button
                type="button"
                onClick={() =>
                  mode === 'CUSTOMER' && selectedUid
                    ? void loadCustomerWallet(selectedUid)
                    : void loadGlobalLedger()
                }
                className="mt-3 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400"
              >
                Retry
              </button>
            </div>
          ) : null}

          {isFetching && entries.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              Loading authoritative financial wallet...
            </div>
          ) : null}

          {!isFetching && !error && entries.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-slate-300">
                No financial ledger entries found.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Entries appear only after server-authorized financial
                operations.
              </p>
            </div>
          ) : null}

          {entries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-white/10 bg-slate-950/40 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Customer UID</th>
                    <th className="px-4 py-3 text-left">Operation</th>
                    <th className="px-4 py-3 text-left">Direction</th>
                    <th className="px-4 py-3 text-left">Asset</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Balance Before</th>
                    <th className="px-4 py-3 text-right">Balance After</th>
                    <th className="px-4 py-3 text-left">Ledger ID</th>
                    <th className="px-4 py-3 text-left">Time</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.ledgerEntryId}
                      className="border-b border-white/5 align-top hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3">
                        {mode === 'GLOBAL' ? (
                          <button
                            type="button"
                            title={entry.uid}
                            onClick={() => {
                              setSearchTerm('');
                              setDirectionFilter('ALL');
                              setAssetFilter('ALL');
                              setOperationTypeFilter('ALL');
                              void loadCustomerWallet(entry.uid);
                            }}
                            className="text-left font-mono text-xs text-cyan-300 underline decoration-cyan-500/40 underline-offset-4 transition hover:text-cyan-200"
                          >
                            {truncateId(entry.uid)}
                          </button>
                        ) : (
                          <div
                            className="font-mono text-xs text-cyan-300"
                            title={entry.uid}
                          >
                            {truncateId(entry.uid)}
                          </div>
                        )}

                        <div className="mt-1 text-[11px] text-slate-500">
                          {mode === 'CUSTOMER'
                            ? profile?.tier
                              ? `${profile.tier.replace('_', ' ')} customer wallet`
                              : 'Customer wallet'
                            : 'Open customer wallet'}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-200">
                          {entry.operationType}
                        </p>
                        {entry.description ? (
                          <p className="mt-1 max-w-[260px] text-xs text-slate-500">
                            {entry.description}
                          </p>
                        ) : null}
                        <p
                          className="mt-1 font-mono text-[10px] text-slate-600"
                          title={entry.operationId}
                        >
                          {truncateId(entry.operationId, 12, 8)}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={
                            entry.direction === 'DEBIT'
                              ? 'rounded-full bg-rose-400/10 px-2 py-1 text-xs font-semibold text-rose-300'
                              : 'rounded-full bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-300'
                          }
                        >
                          {entry.direction}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-semibold text-amber-300">
                        {formatAssetLabel(entry.asset)}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold text-white">
                        {entry.amount}
                      </td>

                      <td className="px-4 py-3 text-right text-slate-400">
                        {entry.balanceBefore}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold text-slate-200">
                        {entry.balanceAfter}
                      </td>

                      <td
                        className="px-4 py-3 font-mono text-[11px] text-purple-300"
                        title={entry.ledgerEntryId}
                      >
                        {truncateId(entry.ledgerEntryId, 12, 8)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                        {formatDate(entry.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {nextCursor ? (
            <div className="flex justify-center border-t border-white/10 p-4">
              <button
                type="button"
                disabled={isLoadingMore}
                onClick={() =>
                  mode === 'CUSTOMER' && selectedUid
                    ? void loadCustomerWallet(selectedUid, nextCursor)
                    : void loadGlobalLedger(nextCursor)
                }
                className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingMore ? 'Loading more...' : 'Load More'}
              </button>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function MetricCard({
  label,
  value,
  valueClass = 'text-white',
}: {
  label: string;
  value: number;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function VolumeCard({
  title,
  titleClass,
  values,
}: {
  title: string;
  titleClass: string;
  values: Record<FinancialAsset, string>;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h2
        className={`text-sm font-semibold uppercase tracking-wide ${titleClass}`}
      >
        {title}
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {ASSETS.map((asset) => (
          <div
            key={asset}
            className="rounded-lg border border-white/5 bg-slate-950/40 p-3"
          >
            <p className="text-xs text-slate-500">
              {formatAssetLabel(asset)}
            </p>
            <p className="mt-1 break-all font-semibold text-slate-200">
              {formatDisplayAmount(asset, values[asset])}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomerSummary({
  uid,
  profile,
  account,
}: {
  uid: string | null;
  profile: CustomerProfile | null;
  account: FinancialAccount | null;
}) {
  return (
    <>
      <section className="mb-6 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Customer Wallet
            </p>
            <h2 className="mt-2 text-xl font-bold text-white">
              {profile?.fullName || profile?.email || 'Customer Account'}
            </h2>
            <p className="mt-2 break-all font-mono text-xs text-cyan-200">
              {uid || 'Unknown UID'}
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-950/40 px-4 py-3 text-right">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Financial Account
            </p>
            <p
              className={`mt-1 text-sm font-semibold ${
                account?.exists ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {account?.exists
                ? 'Authoritative account exists'
                : 'No stored account document'}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ASSETS.map((asset) => (
          <div
            key={asset}
            className="rounded-xl border border-white/10 bg-white/5 p-5"
          >
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {formatAssetLabel(asset)} Balance
            </p>
            <p className="mt-2 break-all text-2xl font-bold text-white">
              {formatDisplayAmount(
                asset,
                account?.balances[asset] ?? '0',
              )}
            </p>
          </div>
        ))}
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-semibold text-white">
            Registration & Profile
          </h2>

          {profile ? (
            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ProfileField label="Full Name" value={profile.fullName} />
              <ProfileField label="Email" value={profile.email} />
              <ProfileField label="Phone" value={profile.phone} />
              <ProfileField label="Country" value={profile.country} />
              <ProfileField label="Role" value={profile.role} />
              <ProfileField
                label="Tier"
                value={profile.tier?.replace('_', ' ') ?? null}
              />
              <ProfileField
                label="Email Verified"
                value={profile.emailVerified ? 'YES' : 'NO'}
              />
              <ProfileField
                label="Phone Verified"
                value={profile.phoneVerified ? 'YES' : 'NO'}
              />
            </dl>
          ) : (
            <p className="mt-4 text-sm text-amber-200">
              No customer profile document is available for this UID.
              Financial records remain inspectable independently.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-semibold text-white">
            Compliance & Security Status
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatusBadge
              label="Account"
              value={profile?.accountStatus}
            />
            <StatusBadge
              label="Verification"
              value={profile?.verificationStatus}
            />
            <StatusBadge label="KYC" value={profile?.kycStatus} />
            <StatusBadge label="KYS" value={profile?.kysStatus} />
            <StatusBadge label="KYB" value={profile?.kybStatus} />
            <StatusBadge
              label="Biometric"
              value={profile?.biometricVerificationStatus}
            />
            <StatusBadge
              label="MFA"
              value={
                profile
                  ? profile.mfaVerified
                    ? 'VERIFIED'
                    : profile.mfaEnabled
                      ? 'ENABLED'
                      : 'DISABLED'
                  : null
              }
            />
            <StatusBadge
              label="Tier"
              value={profile?.tier?.replace('_', ' ') ?? null}
            />
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-purple-400/20 bg-purple-400/5 p-4">
        <p className="text-sm font-semibold text-purple-200">
          Read-only financial authority
        </p>
        <p className="mt-1 text-sm text-slate-300">
          Balances shown here come from the server-authoritative financial
          account. This Admin screen does not edit balances, approve
          KYC/KYS/KYB, or write financial ledger entries from the browser.
        </p>
      </section>
    </>
  );
}

function ProfileField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-slate-950/30 p-3">
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-all text-sm font-medium text-slate-200">
        {value || 'N/A'}
      </dd>
    </div>
  );
}
