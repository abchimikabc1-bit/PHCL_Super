'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getOrders } from '@/lib/order-storage';
import { convertAmount, formatCurrencyAmount } from '@/components/marketplace/currency-utils';
import { MARKETPLACE_PRODUCTS } from '@/lib/marketplace-products';
import { useToast } from '@/hooks/use-toast';
import { getWalletLedger, type WalletLedgerEntry } from '@/lib/wallet-storage';

interface AnalyticsMetrics {
  totalRevenue: { usd: number; tzs: number; pi: number };
  totalOrders: number;
  averageOrderValue: { usd: number; tzs: number; pi: number };
  ordersByStatus: Record<string, number>;
  ordersByCurrency: Record<string, number>;
  topProducts: Array<{ id: number; name: string; count: number; revenue: number }>;
  topSellers: Array<{ seller: string; count: number; revenue: number }>;
}

interface RumSummary {
  totalReports: number;
  deviceBreakdown: { mobile: number; tablet: number; desktop: number };
  averages: {
    lcp: number;
    fid: number;
    cls: number;
    ttfb: number;
    pageLoadTime: number;
    imageLoadTime: number;
    bandwidthSavings: number;
  };
  ratings: {
    lcpGoodRate: number;
    fidGoodRate: number;
    clsGoodRate: number;
    ttfbGoodRate: number;
  };
  recentReports: Array<{
    timestamp: number;
    device: 'mobile' | 'tablet' | 'desktop';
    url: string;
    lcp: number;
    fid: number;
    cls: number;
    ttfb: number;
  }>;
  alerts?: Array<{
    metric: 'lcp' | 'fid' | 'cls' | 'ttfb' | 'imageBandwidth' | 'imageLoadTime';
    severity: 'warning' | 'critical';
    message: string;
    value: number;
    threshold: number;
  }>;
}

interface AlertPreferencesView {
  enabledChannels: Array<'email' | 'slack' | 'sms'>;
  thresholdSeverity: 'critical' | 'warning';
  batchAlerts: boolean;
  batchIntervalMs: number;
  hasEmailConfigured: boolean;
  hasSlackConfigured: boolean;
  hasSmsConfigured: boolean;
}

interface AlertStats {
  totalAlerts: number;
  criticalCount: number;
  warningCount: number;
  sentCount: number;
  failedCount: number;
  byChannel: { email: number; slack: number; sms: number };
}

interface AlertNotification {
  id: string;
  timestamp: number;
  channel: 'email' | 'slack' | 'sms';
  status: 'sent' | 'failed';
  recipient: string;
  alert: {
    metric: string;
    severity: 'critical' | 'warning';
    message: string;
  };
}

const ORDER_STATUS_KEY = 'phcl_admin_order_status_map';

export default function AdminAnalyticsPage() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [rumSummary, setRumSummary] = useState<RumSummary | null>(null);
  const [alertPreferences, setAlertPreferences] = useState<AlertPreferencesView | null>(null);
  const [alertStats, setAlertStats] = useState<AlertStats | null>(null);
  const [alertHistory, setAlertHistory] = useState<AlertNotification[]>([]);
  const [walletLedger, setWalletLedger] = useState<WalletLedgerEntry[]>([]);
  const [savingAlertPrefs, setSavingAlertPrefs] = useState(false);
  const [alertPrefsInitialized, setAlertPrefsInitialized] = useState(false);
  const [historyChannelFilter, setHistoryChannelFilter] = useState<'all' | 'email' | 'slack' | 'sms'>('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [alertForm, setAlertForm] = useState({
    emailEnabled: false,
    slackEnabled: false,
    smsEnabled: false,
    thresholdSeverity: 'critical' as 'critical' | 'warning',
    batchAlerts: true,
    batchIntervalMs: 300000,
    emailAddress: '',
    slackWebhookUrl: '',
    phoneNumber: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateMetrics = () => {
      const orders = getOrders();
      setWalletLedger(getWalletLedger());
      let orderStatusMap: Record<string, string> = {};
      try {
        const raw = localStorage.getItem(ORDER_STATUS_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        if (parsed && typeof parsed === 'object') {
          orderStatusMap = parsed as Record<string, string>;
        }
      } catch {
        orderStatusMap = {};
      }

      let totalUSD = 0;
      const ordersByCurrency: Record<string, number> = { usd: 0, tzs: 0, ntzs: 0, pi: 0 };
      const ordersByStatus: Record<string, number> = {
        new: 0,
        processing: 0,
        packed: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
      };
      const topProductsMap = new Map<number, { count: number; revenue: number }>();
      const topSellersMap = new Map<string, { count: number; revenue: number }>();

      orders.forEach((order) => {
        const orderTotal = order.totalUsd || 0;
        totalUSD += orderTotal;

        const currency = order.paymentMethod?.toLowerCase() || 'usd';
        if (currency === 'pi') ordersByCurrency['pi']++;
        else if (currency === 'ntzs') ordersByCurrency['ntzs']++;
        else if (currency === 'tzs') ordersByCurrency['tzs']++;
        else ordersByCurrency['usd']++;

        const status = orderStatusMap[order.id] || 'new';
        ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;

        const items = order.items || [];
        items.forEach((item) => {
          const productId = parseInt(item.id);
          const current = topProductsMap.get(productId) || { count: 0, revenue: 0 };
          current.count += item.quantity;
          current.revenue += item.price * item.quantity;
          topProductsMap.set(productId, current);

          const product = MARKETPLACE_PRODUCTS.find((p) => p.id === productId);
          if (product) {
            const sellerCurrent = topSellersMap.get(product.seller) || { count: 0, revenue: 0 };
            sellerCurrent.count += item.quantity;
            sellerCurrent.revenue += item.price * item.quantity;
            topSellersMap.set(product.seller, sellerCurrent);
          }
        });
      });

      const topProducts = Array.from(topProductsMap.entries())
        .map(([id, data]) => {
          const product = MARKETPLACE_PRODUCTS.find((p) => p.id === id);
          return {
            id,
            name: product?.name || `Product ${id}`,
            count: data.count,
            revenue: data.revenue,
          };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const topSellers = Array.from(topSellersMap.entries())
        .map(([seller, data]) => ({
          seller,
          count: data.count,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const totalTZS = convertAmount(totalUSD, 'usd', 'tzs');
      const totalPI = convertAmount(totalUSD, 'usd', 'pi');
      const avgOrderUSD = orders.length > 0 ? totalUSD / orders.length : 0;
      const avgOrderTZS = convertAmount(avgOrderUSD, 'usd', 'tzs');
      const avgOrderPI = convertAmount(avgOrderUSD, 'usd', 'pi');

      setMetrics({
        totalRevenue: { usd: totalUSD, tzs: totalTZS, pi: totalPI },
        totalOrders: orders.length,
        averageOrderValue: { usd: avgOrderUSD, tzs: avgOrderTZS, pi: avgOrderPI },
        ordersByStatus,
        ordersByCurrency,
        topProducts,
        topSellers,
      });
      setLoading(false);
    };

    calculateMetrics();
    const interval = setInterval(calculateMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadAlertData = useCallback(async () => {
    try {
      const [prefsRes, statsRes, historyRes] = await Promise.all([
        fetch('/api/alerts/preferences', { cache: 'no-store' }),
        fetch('/api/alerts?action=stats', { cache: 'no-store' }),
        fetch('/api/alerts?action=history&limit=10', { cache: 'no-store' }),
      ]);

      if (prefsRes.ok) {
        const prefsPayload = await prefsRes.json();
        const prefs = prefsPayload.preferences as AlertPreferencesView;
        setAlertPreferences(prefs);

        if (!alertPrefsInitialized) {
          setAlertForm((prev) => ({
            ...prev,
            emailEnabled: prefs.enabledChannels.includes('email'),
            slackEnabled: prefs.enabledChannels.includes('slack'),
            smsEnabled: prefs.enabledChannels.includes('sms'),
            thresholdSeverity: prefs.thresholdSeverity,
            batchAlerts: prefs.batchAlerts,
            batchIntervalMs: prefs.batchIntervalMs,
          }));
          setAlertPrefsInitialized(true);
        }
      }

      if (statsRes.ok) {
        const statsPayload = await statsRes.json();
        setAlertStats(statsPayload.stats as AlertStats);
      }

      if (historyRes.ok) {
        const historyPayload = await historyRes.json();
        setAlertHistory((historyPayload.notifications || []) as AlertNotification[]);
      }
    } catch (error) {
      console.error('Failed to load alert data:', error);
    }
  }, [alertPrefsInitialized]);

  useEffect(() => {
    loadAlertData();
    const interval = setInterval(loadAlertData, 15000);
    return () => clearInterval(interval);
  }, [loadAlertData]);

  const saveAlertPreferences = async () => {
    try {
      setSavingAlertPrefs(true);
      const enabledChannels: Array<'email' | 'slack' | 'sms'> = [];
      if (alertForm.emailEnabled) enabledChannels.push('email');
      if (alertForm.slackEnabled) enabledChannels.push('slack');
      if (alertForm.smsEnabled) enabledChannels.push('sms');

      const response = await fetch('/api/alerts/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabledChannels,
          thresholdSeverity: alertForm.thresholdSeverity,
          batchAlerts: alertForm.batchAlerts,
          batchIntervalMs: alertForm.batchIntervalMs,
          emailAddress: alertForm.emailAddress || undefined,
          slackWebhookUrl: alertForm.slackWebhookUrl || undefined,
          phoneNumber: alertForm.phoneNumber || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save alert preferences');
      }

      const payload = await response.json();
      setAlertPreferences(payload.preferences as AlertPreferencesView);
      await loadAlertData();
      toast({
        title: 'Alert preferences saved',
        description: 'Notification settings updated successfully.',
      });
    } catch (error) {
      console.error('Failed to save alert preferences:', error);
      toast({
        title: 'Failed to save preferences',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingAlertPrefs(false);
    }
  };

  const filteredAlertHistory = alertHistory.filter((entry) => {
    if (historyChannelFilter !== 'all' && entry.channel !== historyChannelFilter) {
      return false;
    }

    if (historyStatusFilter !== 'all' && entry.status !== historyStatusFilter) {
      return false;
    }

    if (!historySearch.trim()) {
      return true;
    }

    const q = historySearch.toLowerCase();
    return (
      entry.alert.metric.toLowerCase().includes(q) ||
      entry.alert.message.toLowerCase().includes(q) ||
      entry.recipient.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    const loadRumSummary = async () => {
      try {
        const response = await fetch('/api/analytics/performance?limit=20', { cache: 'no-store' });
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setRumSummary(data.summary ? { ...data.summary, alerts: data.alerts || [] } : null);
      } catch (error) {
        console.error('Failed to load RUM summary:', error);
      }
    };

    loadRumSummary();
    const interval = setInterval(loadRumSummary, 15000);
    return () => clearInterval(interval);
  }, []);

  const walletTrend = useMemo(() => {
    const dayMap = new Map<string, {
      date: string;
      debitCount: number;
      creditCount: number;
      refundCount: number;
      debitUsd: number;
      refundUsd: number;
    }>();

    walletLedger.forEach((entry) => {
      const dayKey = new Date(entry.createdAt).toISOString().slice(0, 10);
      const existing = dayMap.get(dayKey) || {
        date: dayKey,
        debitCount: 0,
        creditCount: 0,
        refundCount: 0,
        debitUsd: 0,
        refundUsd: 0,
      };

      if (entry.type === 'debit') {
        existing.debitCount += 1;
        existing.debitUsd += convertAmount(entry.amount, entry.currency, 'usd');
      } else {
        existing.creditCount += 1;
        if (entry.reason.toLowerCase().includes('refund')) {
          existing.refundCount += 1;
          existing.refundUsd += convertAmount(entry.amount, entry.currency, 'usd');
        }
      }

      dayMap.set(dayKey, existing);
    });

    return Array.from(dayMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);
  }, [walletLedger]);

  const reconciliationMetrics = useMemo(() => {
    const orders = getOrders();
    const withPaymentTxn = orders.filter((order) => order.audit?.paymentTransactionId).length;
    const cancelledOrders = orders.filter((order) => order.audit?.cancellation?.cancelledAt);
    const withRefundTxn = cancelledOrders.filter((order) => order.audit?.cancellation?.refundTransactionId).length;

    return {
      tracedOrders: withPaymentTxn,
      missingPaymentRefs: orders.length - withPaymentTxn,
      cancelledOrders: cancelledOrders.length,
      missingRefundRefs: cancelledOrders.length - withRefundTxn,
      paymentCoverage: orders.length > 0 ? (withPaymentTxn / orders.length) * 100 : 100,
      refundCoverage: cancelledOrders.length > 0 ? (withRefundTxn / cancelledOrders.length) * 100 : 100,
    };
  }, [walletLedger, metrics]);

  if (loading || !metrics) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
          <p className="text-amber-100">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_22%)]" />

      <section className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black sm:text-4xl">📊 Analytics Dashboard</h1>
            <p className="mt-2 text-sm text-amber-50/85">Real-time sales metrics, revenue trends, and business insights</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/dashboard" className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-slate-700">
              Dashboard
            </Link>
            <Link href="/admin/orders" className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-slate-700">
              Orders
            </Link>
            <Link href="/admin/products" className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-slate-700">
              Products
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-amber-200/15 bg-slate-900/45 p-5 global-glass">
            <p className="text-xs font-semibold text-amber-100/80">💰 Total Revenue</p>
            <p className="mt-2 text-2xl font-black text-yellow-200">${metrics.totalRevenue.usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
            <p className="mt-1 text-xs text-amber-50/70">≈ TSh {(metrics.totalRevenue.tzs / 1000000).toFixed(1)}M</p>
            <p className="mt-1 text-xs text-amber-50/70">≈ Π {metrics.totalRevenue.pi.toFixed(4)}</p>
          </div>

          <div className="rounded-2xl border border-amber-200/15 bg-slate-900/45 p-5 global-glass">
            <p className="text-xs font-semibold text-amber-100/80">📦 Total Orders</p>
            <p className="mt-2 text-2xl font-black text-yellow-200">{metrics.totalOrders}</p>
            <p className="mt-1 text-xs text-amber-50/70">{metrics.ordersByStatus.delivered || 0} Delivered</p>
            <p className="mt-1 text-xs text-amber-50/70">{metrics.ordersByStatus.new || 0} New</p>
          </div>

          <div className="rounded-2xl border border-amber-200/15 bg-slate-900/45 p-5 global-glass">
            <p className="text-xs font-semibold text-amber-100/80">📊 Avg Order Value</p>
            <p className="mt-2 text-2xl font-black text-yellow-200">${metrics.averageOrderValue.usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
            <p className="mt-1 text-xs text-amber-50/70">≈ TSh {(metrics.averageOrderValue.tzs / 1000).toFixed(0)}K</p>
            <p className="mt-1 text-xs text-amber-50/70">≈ Π {metrics.averageOrderValue.pi.toFixed(6)}</p>
          </div>

          <div className="rounded-2xl border border-amber-200/15 bg-slate-900/45 p-5 global-glass">
            <p className="text-xs font-semibold text-amber-100/80">💳 Payment Methods</p>
            <p className="mt-2 text-lg font-black text-yellow-200">4 Currencies</p>
            <p className="mt-1 text-xs text-amber-50/70">USD: {metrics.ordersByCurrency.usd}</p>
            <p className="mt-1 text-xs text-amber-50/70">TZS: {metrics.ordersByCurrency.tzs} | nTZS: {metrics.ordersByCurrency.ntzs} | PI: {metrics.ordersByCurrency.pi}</p>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-cyan-200/15 bg-slate-900/45 p-6 global-glass">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Wallet Flow Trends</h2>
              <p className="text-sm text-amber-50/70">Seven-day debit/refund trend and reconciliation coverage.</p>
            </div>
            <Link href="/admin/wallet" className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-700">
              Open Wallet Ledger
            </Link>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-cyan-200/10 bg-slate-800/40 p-4">
              <p className="text-xs font-semibold text-cyan-100/80">Wallet Debits</p>
              <p className="mt-2 text-2xl font-black text-cyan-300">{walletLedger.filter((entry) => entry.type === 'debit').length}</p>
            </div>
            <div className="rounded-xl border border-rose-200/10 bg-slate-800/40 p-4">
              <p className="text-xs font-semibold text-rose-100/80">Refund Credits</p>
              <p className="mt-2 text-2xl font-black text-rose-300">{walletLedger.filter((entry) => entry.type === 'credit' && entry.reason.toLowerCase().includes('refund')).length}</p>
            </div>
            <div className="rounded-xl border border-amber-200/10 bg-slate-800/40 p-4">
              <p className="text-xs font-semibold text-amber-100/80">Payment Coverage</p>
              <p className="mt-2 text-2xl font-black text-amber-300">{reconciliationMetrics.paymentCoverage.toFixed(1)}%</p>
              <p className="mt-1 text-xs text-amber-50/70">Missing: {reconciliationMetrics.missingPaymentRefs}</p>
            </div>
            <div className="rounded-xl border border-violet-200/10 bg-slate-800/40 p-4">
              <p className="text-xs font-semibold text-violet-100/80">Refund Coverage</p>
              <p className="mt-2 text-2xl font-black text-violet-300">{reconciliationMetrics.refundCoverage.toFixed(1)}%</p>
              <p className="mt-1 text-xs text-amber-50/70">Missing: {reconciliationMetrics.missingRefundRefs}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-slate-800/30 p-4">
              <h3 className="mb-3 text-sm font-bold text-white">Daily USD Debit vs Refund</h3>
              {walletTrend.length === 0 ? (
                <p className="text-sm text-amber-50/70">No wallet transactions available yet.</p>
              ) : (
                <div className="space-y-3">
                  {walletTrend.map((day) => {
                    const maxUsd = Math.max(...walletTrend.map((item) => Math.max(item.debitUsd, item.refundUsd)), 1);
                    return (
                      <div key={day.date}>
                        <div className="mb-1 flex items-center justify-between text-xs text-amber-50/75">
                          <span>{day.date}</span>
                          <span>Debit {formatCurrencyAmount('usd', day.debitUsd)} | Refund {formatCurrencyAmount('usd', day.refundUsd)}</span>
                        </div>
                        <div className="grid gap-2">
                          <div className="h-3 rounded-full bg-slate-700/60">
                            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${(day.debitUsd / maxUsd) * 100}%` }} />
                          </div>
                          <div className="h-3 rounded-full bg-slate-700/60">
                            <div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-500" style={{ width: `${(day.refundUsd / maxUsd) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-800/30 p-4">
              <h3 className="mb-3 text-sm font-bold text-white">Daily Transaction Counts</h3>
              {walletTrend.length === 0 ? (
                <p className="text-sm text-amber-50/70">No wallet transactions available yet.</p>
              ) : (
                <div className="space-y-3">
                  {walletTrend.map((day) => {
                    const maxCount = Math.max(...walletTrend.map((item) => Math.max(item.debitCount, item.refundCount, item.creditCount)), 1);
                    return (
                      <div key={`${day.date}-counts`} className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
                        <div className="flex items-center justify-between text-xs text-amber-50/75">
                          <span>{day.date}</span>
                          <span>Debits {day.debitCount} | Refunds {day.refundCount} | Credits {day.creditCount}</span>
                        </div>
                        <div className="mt-2 grid gap-2">
                          <div className="h-2 rounded-full bg-slate-700/60"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${(day.debitCount / maxCount) * 100}%` }} /></div>
                          <div className="h-2 rounded-full bg-slate-700/60"><div className="h-full rounded-full bg-rose-400" style={{ width: `${(day.refundCount / maxCount) * 100}%` }} /></div>
                          <div className="h-2 rounded-full bg-slate-700/60"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${(day.creditCount / maxCount) * 100}%` }} /></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Products & Sellers */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top Products */}
          <div className="rounded-2xl border border-amber-200/15 bg-slate-900/45 p-6 global-glass">
            <h2 className="mb-4 text-lg font-bold text-white">🏆 Top 5 Products</h2>
            <div className="space-y-3">
              {metrics.topProducts.length === 0 ? (
                <p className="text-sm text-amber-50/70">No sales yet</p>
              ) : (
                metrics.topProducts.map((product, idx) => (
                  <div key={product.id} className="flex items-center justify-between rounded-lg border border-amber-200/10 bg-slate-800/40 p-3">
                    <div>
                      <p className="text-sm font-semibold text-yellow-100">
                        #{idx + 1} {product.name}
                      </p>
                      <p className="text-xs text-amber-50/70">{product.count} units • ${product.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className="text-right">
                      <div className="h-2 w-20 rounded-full bg-slate-700/50">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-400"
                          style={{
                            width: `${(
                              (product.revenue / Math.max(...metrics.topProducts.map((p) => p.revenue), 1)) *
                              100
                            ).toFixed(0)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Sellers */}
          <div className="rounded-2xl border border-amber-200/15 bg-slate-900/45 p-6 global-glass">
            <h2 className="mb-4 text-lg font-bold text-white">⭐ Top 5 Sellers</h2>
            <div className="space-y-3">
              {metrics.topSellers.length === 0 ? (
                <p className="text-sm text-amber-50/70">No sales yet</p>
              ) : (
                metrics.topSellers.map((seller, idx) => (
                  <div key={seller.seller} className="flex items-center justify-between rounded-lg border border-amber-200/10 bg-slate-800/40 p-3">
                    <div>
                      <p className="text-sm font-semibold text-yellow-100">#{idx + 1} {seller.seller}</p>
                      <p className="text-xs text-amber-50/70">{seller.count} units sold</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-400">${seller.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                      <p className="text-xs text-amber-50/70">TSh {(convertAmount(seller.revenue, 'usd', 'tzs') / 1000).toFixed(0)}K</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Payment Method Distribution */}
        <div className="mt-6 rounded-2xl border border-amber-200/15 bg-slate-900/45 p-6 global-glass">
          <h2 className="mb-4 text-lg font-bold text-white">💳 Payment Method Distribution</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-blue-200/10 bg-blue-500/10 p-4 text-center">
              <p className="text-xs font-semibold text-blue-100">USD Payments</p>
              <p className="mt-2 text-2xl font-black text-blue-300">{metrics.ordersByCurrency.usd}</p>
            </div>
            <div className="rounded-lg border border-amber-200/10 bg-amber-500/10 p-4 text-center">
              <p className="text-xs font-semibold text-amber-100">TZS Payments</p>
              <p className="mt-2 text-2xl font-black text-amber-300">{metrics.ordersByCurrency.tzs}</p>
            </div>
            <div className="rounded-lg border border-cyan-200/10 bg-cyan-500/10 p-4 text-center">
              <p className="text-xs font-semibold text-cyan-100">nTZS Payments</p>
              <p className="mt-2 text-2xl font-black text-cyan-300">{metrics.ordersByCurrency.ntzs}</p>
            </div>
            <div className="rounded-lg border border-yellow-200/10 bg-yellow-500/10 p-4 text-center">
              <p className="text-xs font-semibold text-yellow-100">PI Payments</p>
              <p className="mt-2 text-2xl font-black text-yellow-300">{metrics.ordersByCurrency.pi}</p>
            </div>
          </div>
        </div>

        {/* Real User Monitoring */}
        {rumSummary && (
          <div className="mt-6 rounded-2xl border border-cyan-200/15 bg-slate-900/45 p-6 global-glass">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">📡 Real User Monitoring</h2>
                <p className="text-sm text-amber-50/70">Production Core Web Vitals and image performance from real sessions</p>
              </div>
              <div className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                {rumSummary.totalReports} reports
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-cyan-200/10 bg-slate-800/40 p-4">
                <p className="text-xs font-semibold text-cyan-100/80">Avg LCP</p>
                <p className="mt-2 text-2xl font-black text-cyan-300">{rumSummary.averages.lcp.toFixed(0)}ms</p>
                <p className="mt-1 text-xs text-amber-50/70">Good rate: {rumSummary.ratings.lcpGoodRate.toFixed(0)}%</p>
              </div>
              <div className="rounded-xl border border-cyan-200/10 bg-slate-800/40 p-4">
                <p className="text-xs font-semibold text-cyan-100/80">Avg FID</p>
                <p className="mt-2 text-2xl font-black text-cyan-300">{rumSummary.averages.fid.toFixed(0)}ms</p>
                <p className="mt-1 text-xs text-amber-50/70">Good rate: {rumSummary.ratings.fidGoodRate.toFixed(0)}%</p>
              </div>
              <div className="rounded-xl border border-cyan-200/10 bg-slate-800/40 p-4">
                <p className="text-xs font-semibold text-cyan-100/80">Avg CLS</p>
                <p className="mt-2 text-2xl font-black text-cyan-300">{rumSummary.averages.cls.toFixed(3)}</p>
                <p className="mt-1 text-xs text-amber-50/70">Good rate: {rumSummary.ratings.clsGoodRate.toFixed(0)}%</p>
              </div>
              <div className="rounded-xl border border-cyan-200/10 bg-slate-800/40 p-4">
                <p className="text-xs font-semibold text-cyan-100/80">Avg Page Load</p>
                <p className="mt-2 text-2xl font-black text-cyan-300">{rumSummary.averages.pageLoadTime.toFixed(0)}ms</p>
                <p className="mt-1 text-xs text-amber-50/70">Avg TTFB: {rumSummary.averages.ttfb.toFixed(0)}ms</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-slate-800/40 p-4">
                <p className="text-xs font-semibold text-amber-100/80">Mobile</p>
                <p className="mt-2 text-2xl font-black text-yellow-200">{rumSummary.deviceBreakdown.mobile}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-800/40 p-4">
                <p className="text-xs font-semibold text-amber-100/80">Tablet</p>
                <p className="mt-2 text-2xl font-black text-yellow-200">{rumSummary.deviceBreakdown.tablet}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-800/40 p-4">
                <p className="text-xs font-semibold text-amber-100/80">Desktop</p>
                <p className="mt-2 text-2xl font-black text-yellow-200">{rumSummary.deviceBreakdown.desktop}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-slate-800/30 p-4">
              <h3 className="mb-3 text-sm font-bold text-white">Recent Sessions</h3>
              <div className="space-y-2">
                {rumSummary.recentReports.length === 0 ? (
                  <p className="text-sm text-amber-50/70">No RUM sessions collected yet.</p>
                ) : (
                  rumSummary.recentReports.map((entry) => (
                    <div key={`${entry.timestamp}-${entry.url}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-xs">
                      <div>
                        <p className="font-semibold text-amber-100 capitalize">{entry.device}</p>
                        <p className="max-w-[28rem] truncate text-amber-50/70">{entry.url}</p>
                      </div>
                      <div className="grid grid-cols-4 gap-3 text-right text-amber-50/80">
                        <span>LCP {entry.lcp.toFixed(0)}ms</span>
                        <span>FID {entry.fid.toFixed(0)}ms</span>
                        <span>CLS {entry.cls.toFixed(3)}</span>
                        <span>TTFB {entry.ttfb.toFixed(0)}ms</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-slate-800/30 p-4">
              <h3 className="mb-3 text-sm font-bold text-white">Threshold Alerts</h3>
              {rumSummary.alerts && rumSummary.alerts.length > 0 ? (
                <div className="space-y-2">
                  {rumSummary.alerts.map((alert, index) => (
                    <div
                      key={`${alert.metric}-${index}`}
                      className={`rounded-lg border px-3 py-2 text-xs ${
                        alert.severity === 'critical'
                          ? 'border-red-300/30 bg-red-500/10 text-red-100'
                          : 'border-amber-300/30 bg-amber-500/10 text-amber-100'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold uppercase tracking-wide">{alert.metric}</p>
                        <p className="font-semibold">{alert.severity.toUpperCase()}</p>
                      </div>
                      <p className="mt-1">{alert.message}</p>
                      <p className="mt-1 text-[11px] opacity-80">
                        Value: {alert.value} | Threshold: {alert.threshold}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-emerald-200">No threshold alerts. Current sessions are within expected bounds.</p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-slate-800/30 p-4">
                <h3 className="mb-3 text-sm font-bold text-white">Alert Control Panel</h3>

                <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-xs text-amber-100">
                    <input
                      type="checkbox"
                      checked={alertForm.emailEnabled}
                      onChange={(e) => setAlertForm((prev) => ({ ...prev, emailEnabled: e.target.checked }))}
                    />
                    Email
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-xs text-amber-100">
                    <input
                      type="checkbox"
                      checked={alertForm.slackEnabled}
                      onChange={(e) => setAlertForm((prev) => ({ ...prev, slackEnabled: e.target.checked }))}
                    />
                    Slack
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-xs text-amber-100">
                    <input
                      type="checkbox"
                      checked={alertForm.smsEnabled}
                      onChange={(e) => setAlertForm((prev) => ({ ...prev, smsEnabled: e.target.checked }))}
                    />
                    SMS
                  </label>
                </div>

                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xs font-semibold text-amber-100/80">Severity:</span>
                  <select
                    value={alertForm.thresholdSeverity}
                    onChange={(e) =>
                      setAlertForm((prev) => ({
                        ...prev,
                        thresholdSeverity: e.target.value as 'critical' | 'warning',
                      }))
                    }
                    className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-1 text-xs text-amber-100"
                  >
                    <option value="critical">Critical only</option>
                    <option value="warning">Critical + Warning</option>
                  </select>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-2">
                  <label className="text-xs font-semibold text-amber-100/80">Email Recipient</label>
                  <input
                    type="email"
                    value={alertForm.emailAddress}
                    onChange={(e) => setAlertForm((prev) => ({ ...prev, emailAddress: e.target.value }))}
                    placeholder="alerts@company.com"
                    className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-xs text-amber-100 placeholder:text-amber-50/40"
                  />

                  <label className="text-xs font-semibold text-amber-100/80">Slack Webhook URL</label>
                  <input
                    type="text"
                    value={alertForm.slackWebhookUrl}
                    onChange={(e) => setAlertForm((prev) => ({ ...prev, slackWebhookUrl: e.target.value }))}
                    placeholder="https://hooks.slack.com/services/..."
                    className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-xs text-amber-100 placeholder:text-amber-50/40"
                  />

                  <label className="text-xs font-semibold text-amber-100/80">SMS Number</label>
                  <input
                    type="text"
                    value={alertForm.phoneNumber}
                    onChange={(e) => setAlertForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="+2557XXXXXXXX"
                    className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-xs text-amber-100 placeholder:text-amber-50/40"
                  />
                </div>

                <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-xs text-amber-100">
                    <input
                      type="checkbox"
                      checked={alertForm.batchAlerts}
                      onChange={(e) => setAlertForm((prev) => ({ ...prev, batchAlerts: e.target.checked }))}
                    />
                    Batch alerts
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-xs text-amber-100">
                    Interval (ms)
                    <input
                      type="number"
                      min={10000}
                      step={5000}
                      value={alertForm.batchIntervalMs}
                      onChange={(e) =>
                        setAlertForm((prev) => ({
                          ...prev,
                          batchIntervalMs: Number(e.target.value) || 300000,
                        }))
                      }
                      className="w-28 rounded border border-white/20 bg-slate-900 px-2 py-1 text-[11px] text-amber-100"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={saveAlertPreferences}
                  disabled={savingAlertPrefs}
                  className="rounded-lg border border-cyan-300/30 bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingAlertPrefs ? 'Saving...' : 'Save Alert Preferences'}
                </button>

                {alertPreferences && (
                  <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-amber-50/75">
                    <p>Email Configured: {alertPreferences.hasEmailConfigured ? 'Yes' : 'No'}</p>
                    <p>Slack Configured: {alertPreferences.hasSlackConfigured ? 'Yes' : 'No'}</p>
                    <p>SMS Configured: {alertPreferences.hasSmsConfigured ? 'Yes' : 'No'}</p>
                    <p>Batch: {alertPreferences.batchAlerts ? 'Enabled' : 'Disabled'}</p>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-800/30 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">Notification Health</h3>
                  <button
                    type="button"
                    onClick={loadAlertData}
                    className="rounded-lg border border-white/20 bg-slate-900/60 px-3 py-1 text-[11px] font-semibold text-amber-100 hover:bg-slate-900"
                  >
                    Refresh
                  </button>
                </div>

                <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <select
                    value={historyChannelFilter}
                    onChange={(e) => setHistoryChannelFilter(e.target.value as 'all' | 'email' | 'slack' | 'sms')}
                    className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-xs text-amber-100"
                  >
                    <option value="all">All Channels</option>
                    <option value="email">Email</option>
                    <option value="slack">Slack</option>
                    <option value="sms">SMS</option>
                  </select>
                  <select
                    value={historyStatusFilter}
                    onChange={(e) => setHistoryStatusFilter(e.target.value as 'all' | 'sent' | 'failed')}
                    className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-xs text-amber-100"
                  >
                    <option value="all">All Status</option>
                    <option value="sent">Sent</option>
                    <option value="failed">Failed</option>
                  </select>
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search metric/message"
                    className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-xs text-amber-100 placeholder:text-amber-50/40"
                  />
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-emerald-100">
                    Sent: {alertStats?.sentCount ?? 0}
                  </div>
                  <div className="rounded-lg border border-red-300/20 bg-red-500/10 px-3 py-2 text-red-100">
                    Failed: {alertStats?.failedCount ?? 0}
                  </div>
                  <div className="rounded-lg border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-amber-100">
                    Critical: {alertStats?.criticalCount ?? 0}
                  </div>
                  <div className="rounded-lg border border-cyan-300/20 bg-cyan-500/10 px-3 py-2 text-cyan-100">
                    Warning: {alertStats?.warningCount ?? 0}
                  </div>
                </div>

                <div className="space-y-2">
                  {filteredAlertHistory.length === 0 ? (
                    <p className="text-xs text-amber-50/70">No notification history yet.</p>
                  ) : (
                    filteredAlertHistory.map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-[11px]">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold uppercase text-amber-100">{entry.channel}</p>
                          <p className={entry.status === 'sent' ? 'text-emerald-300' : 'text-red-300'}>{entry.status}</p>
                        </div>
                        <p className="mt-1 text-amber-50/80">{entry.alert.metric}: {entry.alert.message}</p>
                        <p className="mt-1 text-amber-50/60">{entry.recipient}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
