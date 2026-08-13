'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard, RefreshCw, Search, ShieldAlert, ShieldCheck, Webhook } from 'lucide-react';
import { useAdmin } from '@/lib/admin-context';

type PaymentOverviewResponse = {
  success: boolean;
  stripe: {
    configured: boolean;
    publishableKeyConfigured: boolean;
    webhookSecretConfigured: boolean;
    webhookUrl: string;
    webhookAuditPath: string;
    cliCommand: string;
    dashboardHint: string;
  };
  summary: {
    totalOrders: number;
    tracedOrders: number;
    byStatus: {
      paid: number;
      pending: number;
      failed: number;
      requires_payment: number;
    };
    byProvider: {
      stripe: number;
      'mobile-money': number;
      'pi-wallet': number;
      manual: number;
    };
  };
  recentPayments: Array<{
    id: string;
    createdAt: string;
    customerName: string;
    amountUsd: number;
    paymentMethod: string;
    paymentProvider: string;
    paymentStatus: string;
    paymentTransactionId: string | null;
    paymentSessionId: string | null;
    paymentFailureReason: string | null;
  }>;
  webhookEvents: Array<{
    eventId: string;
    eventType: string;
    status: 'processed' | 'ignored' | 'failed';
    orderId?: string;
    paymentSessionId?: string;
    paymentTransactionId?: string;
    detail?: string;
    at: string;
  }>;
};

const formatPaymentStatus = (status: string) => status.replace(/_/g, ' ');

export default function AdminTransactionsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, refreshSession, sessionDebug } = useAdmin();
  const [loadingGuardElapsed, setLoadingGuardElapsed] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [overview, setOverview] = useState<PaymentOverviewResponse | null>(null);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/payments/overview', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      const payload = (await response.json().catch(() => null)) as PaymentOverviewResponse | { message?: string } | null;
      if (!response.ok || !payload || !('success' in payload) || !payload.success) {
        throw new Error((payload && 'message' in payload && payload.message) || `Failed to load payment overview (${response.status})`);
      }

      setOverview(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment overview');
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
      return;
    }

    if (isAuthenticated) {
      void loadOverview();
    }
  }, [isAuthenticated, isLoading, loadOverview, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadingGuardElapsed(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  const loadingActive = isLoading && !loadingGuardElapsed;
  const sessionAgeMinutes =
    sessionDebug.sessionAgeMs !== null ? Math.floor(sessionDebug.sessionAgeMs / 60000) : null;
  const sessionExpiresMinutes =
    sessionDebug.expiresInMs !== null ? Math.floor(sessionDebug.expiresInMs / 60000) : null;

  const filteredPayments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const payments = overview?.recentPayments || [];
    if (!query) return payments;

    return payments.filter((payment) =>
      [
        payment.id,
        payment.customerName,
        payment.paymentMethod,
        payment.paymentProvider,
        payment.paymentStatus,
        payment.paymentTransactionId || '',
        payment.paymentSessionId || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [overview, searchTerm]);

  if (loadingActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-200 font-medium">Loading payment operations...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-purple-400" />
              Payments & Webhooks
            </h1>
            <p className="text-sm text-slate-400 mt-1">Stripe setup health, webhook audit trail, and payment traceability.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/dashboard" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors">
              Back to Dashboard
            </Link>
            <button
              type="button"
              onClick={() => void loadOverview()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loadingOverview ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
          Session Debug: hasSession={sessionDebug.hasSession ? 'yes' : 'no'} • age={sessionAgeMinutes ?? 'n/a'}m • expiresIn={sessionExpiresMinutes ?? 'n/a'}m
          <button
            type="button"
            onClick={refreshSession}
            className="ml-3 rounded bg-slate-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-600"
          >
            Rehydrate Now
          </button>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Orders Traced</p>
            <p className="mt-1 text-2xl font-bold text-cyan-300">
              {overview?.summary.tracedOrders ?? 0}/{overview?.summary.totalOrders ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Paid</p>
            <p className="mt-1 text-2xl font-bold text-emerald-300">{overview?.summary.byStatus.paid ?? 0}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Pending / Requires Action</p>
            <p className="mt-1 text-2xl font-bold text-amber-300">
              {(overview?.summary.byStatus.pending ?? 0) + (overview?.summary.byStatus.requires_payment ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Failed</p>
            <p className="mt-1 text-2xl font-bold text-rose-300">{overview?.summary.byStatus.failed ?? 0}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-cyan-300" />
              <h2 className="text-lg font-semibold text-white">Stripe Webhook Setup</h2>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-slate-400">Secret Key</p>
                <p className={`mt-1 font-semibold ${overview?.stripe.configured ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {overview?.stripe.configured ? 'Configured' : 'Missing'}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-slate-400">Publishable Key</p>
                <p className={`mt-1 font-semibold ${overview?.stripe.publishableKeyConfigured ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {overview?.stripe.publishableKeyConfigured ? 'Configured' : 'Missing'}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-slate-400">Webhook Secret</p>
                <p className={`mt-1 font-semibold ${overview?.stripe.webhookSecretConfigured ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {overview?.stripe.webhookSecretConfigured ? 'Configured' : 'Missing'}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-200">
              <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 p-3">
                <p className="text-xs uppercase tracking-wide text-cyan-200">Dashboard endpoint</p>
                <p className="mt-1 break-all font-mono text-cyan-50">{overview?.stripe.webhookUrl || 'n/a'}</p>
              </div>
              <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 p-3">
                <p className="text-xs uppercase tracking-wide text-amber-200">Stripe CLI</p>
                <p className="mt-1 break-all font-mono text-amber-50">{overview?.stripe.cliCommand || 'n/a'}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-slate-300">
                {overview?.stripe.dashboardHint}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold text-white">Webhook Health</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-slate-400">Processed Events</p>
                <p className="mt-1 text-xl font-bold text-emerald-300">
                  {overview?.webhookEvents.filter((event) => event.status === 'processed').length ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-slate-400">Failed Events</p>
                <p className="mt-1 text-xl font-bold text-rose-300">
                  {overview?.webhookEvents.filter((event) => event.status === 'failed').length ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-slate-400">Audit Log</p>
                <p className="mt-1 break-all text-xs text-slate-200">{overview?.stripe.webhookAuditPath || 'n/a'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex items-center gap-2">
            {overview?.stripe.configured && overview?.stripe.webhookSecretConfigured ? (
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-amber-300" />
            )}
            <h2 className="text-lg font-semibold text-white">Recent Webhook Events</h2>
          </div>
          {overview?.webhookEvents.length ? (
            <div className="space-y-2">
              {overview.webhookEvents.map((event) => (
                <div key={`${event.eventId}-${event.at}`} className="rounded border border-white/10 bg-black/20 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{event.eventType}</p>
                    <span className="text-xs text-slate-300">{new Date(event.at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    status={event.status} • order={event.orderId || 'n/a'} • txn={event.paymentTransactionId || 'n/a'}
                  </p>
                  {event.detail ? <p className="mt-1 text-xs text-slate-300">{event.detail}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No webhook events captured yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search order, customer, method, provider, session, or reference..."
              className="w-full rounded-lg border border-white/20 bg-slate-900/70 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-300">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold text-slate-400">
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Method</th>
                  <th className="px-4 py-3 text-left">Provider</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-left">Session</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{payment.id}</p>
                        <p className="text-xs text-slate-400">{new Date(payment.createdAt).toLocaleString()}</p>
                      </td>
                      <td className="px-4 py-3 text-white">{payment.customerName}</td>
                      <td className="px-4 py-3 uppercase">{payment.paymentMethod}</td>
                      <td className="px-4 py-3">{payment.paymentProvider}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold ${
                            payment.paymentStatus === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : payment.paymentStatus === 'failed'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {formatPaymentStatus(payment.paymentStatus)}
                        </span>
                        {payment.paymentFailureReason ? (
                          <p className="mt-1 max-w-xs text-[11px] text-rose-200">{payment.paymentFailureReason}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-purple-300">{payment.paymentTransactionId || 'N/A'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">{payment.paymentSessionId || 'N/A'}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-400">${payment.amountUsd.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
