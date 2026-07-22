'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdmin } from '@/lib/admin-context';
import {
  getProductStockAudit,
  getCriticalStockProducts,
  getProductStockHealthSummary,
  getStockStatus,
  type ProductStock,
  type ProductStockAuditEntry,
  type ProductStockHealthSummary,
} from '@/lib/admin-product-stock';
import { getAdminCurrencyAudit, getAdminCurrencyConfig } from '@/lib/admin-currency-rates';
import { getAdminLanguageAudit, getAdminLanguageConfig } from '@/lib/admin-language-settings';
import { getAdminSettingsAudit } from '@/lib/admin-settings';
import { getPolicyVersions } from '@/lib/policy-compliance';
import { getOrderIntegrityEvents, getOrders, type OrderIntegrityEvent, type StoredOrder } from '@/lib/order-storage';
import { convertAmount, formatCurrencyAmount } from '@/components/marketplace/currency-utils';

type DashboardLogEntry = {
  timestamp: string;
  source: string;
  summary: string;
  tone: 'normal' | 'warning';
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, logout, checkAuth } = useAdmin();

  const [stockHealth, setStockHealth] = useState<ProductStockHealthSummary>(() => getProductStockHealthSummary());
  const [criticalStocks, setCriticalStocks] = useState<ProductStock[]>(() => getCriticalStockProducts(6));
  const [currencyCount, setCurrencyCount] = useState<number>(() => getAdminCurrencyConfig().managed.length);
  const [languageCount, setLanguageCount] = useState<number>(() => getAdminLanguageConfig().enabledLanguages.length);
  const [orders, setOrders] = useState<StoredOrder[]>(() => getOrders());
  const [recentLogs, setRecentLogs] = useState<DashboardLogEntry[]>([]);
  const [policyVersions, setPolicyVersions] = useState(() => getPolicyVersions());

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/admin/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const syncDashboard = () => {
      setStockHealth(getProductStockHealthSummary());
      setCriticalStocks(getCriticalStockProducts(6));
      setCurrencyCount(getAdminCurrencyConfig().managed.length);
      setLanguageCount(getAdminLanguageConfig().enabledLanguages.length);
      setOrders(getOrders());
      setPolicyVersions(getPolicyVersions());

      const stockAudit = getProductStockAudit()
        .slice(-3)
        .reverse()
        .map<DashboardLogEntry>((event: ProductStockAuditEntry) => ({
          timestamp: event.timestamp,
          source: 'Stock',
          summary: `${event.action.replace(/_/g, ' ')}${event.productName ? ` • ${event.productName}` : ''}`,
          tone: event.action === 'disabled_product' ? 'warning' : 'normal',
        }));

      const currencyAudit = getAdminCurrencyAudit()
        .slice(0, 3)
        .map<DashboardLogEntry>((event) => ({
          timestamp: event.changedAt,
          source: 'Currency',
          summary: `Updated ${event.changedCodes.join(', ')} • active ${event.activeBefore} -> ${event.activeAfter}`,
          tone: event.statusChangedCodes.length > 0 ? 'warning' : 'normal',
        }));

      const languageAudit = getAdminLanguageAudit()
        .slice(0, 3)
        .map<DashboardLogEntry>((event) => ({
          timestamp: event.changedAt,
          source: 'Language',
          summary: `Default ${event.defaultLanguageFrom} -> ${event.defaultLanguageTo}`,
          tone: event.removedLanguages.length > 0 ? 'warning' : 'normal',
        }));

      const settingsAudit = getAdminSettingsAudit()
        .slice(0, 3)
        .map<DashboardLogEntry>((event) => ({
          timestamp: event.changedAt,
          source: 'Settings',
          summary: `${event.action === 'reset' ? 'Reset settings' : 'Updated settings'} • ${event.changedKeys.join(', ')}`,
          tone: event.action === 'reset' ? 'warning' : 'normal',
        }));

      const integrityAudit = getOrderIntegrityEvents()
        .slice(0, 3)
        .map<DashboardLogEntry>((event: OrderIntegrityEvent) => ({
          timestamp: event.timestamp,
          source: 'Orders',
          summary: event.reason,
          tone: 'warning',
        }));

      setRecentLogs(
        [...stockAudit, ...currencyAudit, ...languageAudit, ...settingsAudit, ...integrityAudit]
          .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
          .slice(0, 8)
      );
    };

    syncDashboard();
    window.addEventListener('storage', syncDashboard);
    return () => window.removeEventListener('storage', syncDashboard);
  }, []);

  const revenueMetrics = useMemo(() => {
    return {
      totalUsd: orders.reduce((sum, order) => sum + order.totalUsd, 0),
      totalTzs: orders.reduce((sum, order) => sum + convertAmount(order.totalUsd, 'usd', 'tzs'), 0),
      totalPi: orders.reduce((sum, order) => sum + convertAmount(order.totalUsd, 'usd', 'pi'), 0),
      orderCount: orders.length,
      byMethod: orders.reduce(
        (acc, order) => {
          acc[order.paymentMethod] += 1;
          return acc;
        },
        { usd: 0, tzs: 0, ntzs: 0, pi: 0 }
      ),
    };
  }, [orders]);

  const operationalReadiness = [
    {
      label: 'Commerce Flow',
      value: revenueMetrics.orderCount > 0 ? 'Receiving Orders' : 'Ready for First Orders',
      tone: 'emerald',
    },
    {
      label: 'Stock Pressure',
      value:
        stockHealth.lowStockProducts > 0 || stockHealth.outOfStockProducts > 0
          ? `${stockHealth.lowStockProducts + stockHealth.outOfStockProducts} item(s) need review`
          : 'Healthy',
      tone: stockHealth.lowStockProducts > 0 || stockHealth.outOfStockProducts > 0 ? 'amber' : 'emerald',
    },
    {
      label: 'Policy Baseline',
      value: `Terms v${policyVersions.termsVersion} • Privacy v${policyVersions.privacyVersion}`,
      tone: 'cyan',
    },
    {
      label: 'Ops Logs',
      value: recentLogs.length > 0 ? `${recentLogs.length} recent event(s)` : 'No recent log events',
      tone: recentLogs.some((entry) => entry.tone === 'warning') ? 'amber' : 'emerald',
    },
  ] as const;

  const menuItems = [
    { title: 'Products', description: 'Manage marketplace products', icon: '📦', href: '/admin/products', color: 'from-purple-500 to-pink-500' },
    { title: 'Currencies', description: 'Manage currencies & rates', icon: '💱', href: '/admin/currencies', color: 'from-green-500 to-emerald-500' },
    { title: 'Languages', description: 'Manage translations', icon: '🌍', href: '/admin/languages', color: 'from-blue-500 to-cyan-500' },
    { title: 'Analytics', description: 'View system analytics', icon: '📊', href: '/admin/analytics', color: 'from-orange-500 to-red-500' },
    { title: 'Users', description: 'Manage user accounts', icon: '👥', href: '/admin/users', color: 'from-indigo-500 to-purple-500' },
    { title: 'Orders', description: 'Review customer orders', icon: '🧾', href: '/admin/orders', color: 'from-amber-500 to-orange-500' },
    { title: 'Settings', description: 'System configuration', icon: '⚙️', href: '/admin/settings', color: 'from-slate-500 to-gray-500' },
    { title: 'Converter', description: 'Currency conversion tool', icon: '🔄', href: '/admin/converter', color: 'from-cyan-500 to-blue-500' },
    { title: 'Security', description: 'Auth audit and lockout monitor', icon: '🛡️', href: '/admin/security', color: 'from-rose-500 to-red-500' },
  ];

  const handleLogout = async () => {
    await logout();
    router.replace('/admin/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-200">Loading admin panel...</p>
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
            <h1 className="text-2xl font-bold text-white">PHCL Admin Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1">Welcome, Admin</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={checkAuth}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg"
            >
              Recheck Session
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-2">Dashboard</h2>
          <p className="text-slate-300">Manage all aspects of your PHCL Super platform</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
            <div className="text-2xl font-bold text-purple-400">{stockHealth.totalProducts}</div>
            <p className="text-sm text-slate-400">Products</p>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
            <div className="text-2xl font-bold text-green-400">{currencyCount}</div>
            <p className="text-sm text-slate-400">Currencies</p>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
            <div className="text-2xl font-bold text-blue-400">{languageCount}</div>
            <p className="text-sm text-slate-400">Languages</p>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
            <div className="text-2xl font-bold text-orange-400">24/7</div>
            <p className="text-sm text-slate-400">Support</p>
          </div>
        </div>

        <div className="mb-12 rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-white">Financial Overview</h3>
            <Link href="/admin/orders" className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
              View Orders
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h4 className="text-sm font-semibold text-white mb-3">Revenue by Currency</h4>
              <div className="space-y-2">
                <div className="flex justify-between rounded bg-blue-500/10 px-3 py-2 border border-blue-300/20">
                  <span className="text-blue-200">USD Total</span>
                  <span className="text-blue-300 font-bold">{formatCurrencyAmount('usd', revenueMetrics.totalUsd)}</span>
                </div>
                <div className="flex justify-between rounded bg-amber-500/10 px-3 py-2 border border-amber-300/20">
                  <span className="text-amber-200">TZS Total</span>
                  <span className="text-amber-300 font-bold">{formatCurrencyAmount('tzs', revenueMetrics.totalTzs)}</span>
                </div>
                <div className="flex justify-between rounded bg-yellow-500/10 px-3 py-2 border border-yellow-300/20">
                  <span className="text-yellow-200">PI Total</span>
                  <span className="text-yellow-300 font-bold">{formatCurrencyAmount('pi', revenueMetrics.totalPi)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h4 className="text-sm font-semibold text-white mb-3">Order Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between rounded bg-purple-500/10 px-3 py-2 border border-purple-300/20">
                  <span className="text-purple-200">Total Orders</span>
                  <span className="text-purple-300 font-bold">{revenueMetrics.orderCount}</span>
                </div>
                <div className="flex justify-between rounded bg-slate-500/10 px-3 py-2 border border-slate-300/20">
                  <span className="text-slate-200">By Payment Method</span>
                  <span className="text-slate-300 font-bold text-right">
                    USD {revenueMetrics.byMethod.usd} | TZS {revenueMetrics.byMethod.tzs} | nTZS {revenueMetrics.byMethod.ntzs} | PI {revenueMetrics.byMethod.pi}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-12 rounded-lg border border-cyan-300/20 bg-cyan-500/10 p-6 backdrop-blur-md">
          <h3 className="text-lg font-semibold text-white mb-4">Operational Readiness</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {operationalReadiness.map((item) => (
              <div key={item.label} className="rounded border border-white/10 bg-slate-950/40 p-4">
                <p className="text-xs text-slate-300">{item.label}</p>
                <p
                  className={`mt-2 text-sm font-semibold ${
                    item.tone === 'emerald' ? 'text-emerald-300' : item.tone === 'amber' ? 'text-amber-300' : 'text-cyan-300'
                  }`}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-12 rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-white">Stock Health Command Center</h3>
            <Link href="/admin/products" className="rounded bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-700">
              Open Product Stock Manager
            </Link>
          </div>

          <div className="rounded border border-white/10 bg-black/20 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-200">Critical Products</p>
            {criticalStocks.length === 0 ? (
              <p className="text-xs text-slate-400">No critical stock alerts right now.</p>
            ) : (
              <div className="space-y-2">
                {criticalStocks.map((product) => {
                  const status = getStockStatus(product.productId);
                  return (
                    <div key={product.productId} className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2">
                      <div>
                        <p className="text-sm text-white">{product.productName}</p>
                        <p className="text-xs text-slate-400">ID: {product.productId}</p>
                      </div>
                      <span
                        className={`rounded px-2 py-1 text-[11px] font-semibold ${
                          status.color === 'green'
                            ? 'bg-green-500/20 text-green-300'
                            : status.color === 'amber'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {status.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href} className="group">
              <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 hover:border-white/20 p-6 h-full transition-all hover:shadow-lg hover:shadow-purple-500/10 transform hover:scale-105">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${item.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Unified Activity Log</h3>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-slate-400">No recent admin or operations log entries.</p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((entry, index) => (
                <div key={`${entry.source}-${entry.timestamp}-${index}`} className="rounded border border-white/10 bg-slate-950/40 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`rounded px-2 py-1 text-[11px] font-semibold ${entry.tone === 'warning' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                      {entry.source}
                    </span>
                    <span className="text-[11px] text-slate-400">{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-200">{entry.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}