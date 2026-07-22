'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdmin } from '@/lib/admin-context';
import { useCommerceSnapshot } from '@/hooks/use-commerce-snapshot';
import { useCommerceBootstrap } from '@/hooks/use-commerce-bootstrap';
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
import { getWalletLedger, getWalletSnapshot, type WalletLedgerEntry } from '@/lib/wallet-storage';
import { convertCurrency, formatCurrency } from '@/components/marketplace/currency';

type DashboardLogEntry = {
  timestamp: string;
  source: string;
  summary: string;
  tone: 'normal' | 'warning';
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, logout, checkAuth } = useAdmin();
  const { snapshot } = useCommerceSnapshot();

  const [stockHealth, setStockHealth] = useState<ProductStockHealthSummary>(() => getProductStockHealthSummary());
  const [criticalStocks, setCriticalStocks] = useState<ProductStock[]>(() => getCriticalStockProducts(6));
  const [currencyCount, setCurrencyCount] = useState<number>(() => getAdminCurrencyConfig().managed.length);
  const [languageCount, setLanguageCount] = useState<number>(() => getAdminLanguageConfig().enabledLanguages.length);
  const [orders, setOrders] = useState<StoredOrder[]>(() => getOrders());
  const [walletLedger, setWalletLedger] = useState<WalletLedgerEntry[]>(() => getWalletLedger());
  const [recentLogs, setRecentLogs] = useState<DashboardLogEntry[]>([]);
  const [policyVersions, setPolicyVersions] = useState(() => getPolicyVersions());

  useEffect(() => {
    if (!snapshot) return;
    setOrders(snapshot.orders);
    setWalletLedger(snapshot.walletLedger);
    setCurrencyCount(snapshot.currencyConfig?.managed.length ?? getAdminCurrencyConfig().managed.length);
    setLanguageCount(snapshot.languageConfig?.enabledLanguages.length ?? getAdminLanguageConfig().enabledLanguages.length);
  }, [snapshot]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/admin/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useCommerceBootstrap(() => {
    const syncDashboard = () => {
      setStockHealth(getProductStockHealthSummary());
      setCriticalStocks(getCriticalStockProducts(6));
      setCurrencyCount(getAdminCurrencyConfig().managed.length);
      setLanguageCount(getAdminLanguageConfig().enabledLanguages.length);
      setOrders(getOrders());
      setWalletLedger(getWalletLedger());
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
      totalTzs: orders.reduce((sum, order) => sum + convertCurrency(order.totalUsd, 'USD', 'TZS'), 0),
      totalPi: orders.reduce((sum, order) => sum + convertCurrency(order.totalUsd, 'USD', 'PI'), 0),
      orderCount: orders.length,
      byMethod: orders.reduce(
        (acc, order) => {
          const methodKey = order.paymentMethod.toLowerCase() as keyof typeof acc;
          if (acc[methodKey] !== undefined) {
            acc[methodKey] += 1;
          }
          return acc;
        },
        { usd: 0, tzs: 0, ntzs: 0, pi: 0 }
      ),
    };
  }, [orders]);

  const walletMetrics = useMemo(() => {
    const snapshot = getWalletSnapshot();
    const debitCount = walletLedger.filter((entry) => entry.type === 'debit').length;
    const refundCount = walletLedger.filter((entry) => entry.type === 'credit' && entry.reason.includes('refund')).length;
    const missingPaymentRefs = orders.filter((order) => !order.audit?.paymentTransactionId).length;

    return {
      snapshot,
      debitCount,
      refundCount,
      missingPaymentRefs,
      tracedOrders: orders.filter((order) => order.audit?.paymentTransactionId).length,
    };
  }, [walletLedger, orders]);

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
    {
      label: 'Wallet Trace',
      value: `${walletMetrics.tracedOrders}/${orders.length} orders linked`,
      tone: walletMetrics.missingPaymentRefs > 0 ? 'amber' : 'emerald',
    },
  ] as const;

  const menuItems = [
    { title: 'Products', description: 'Manage marketplace products', icon: '📦', href: '/admin/products', color: 'from-purple-500 to-pink-500' },
    { title: 'Currencies', description: 'Manage currencies & rates', icon: '💱', href: '/admin/currencies', color: 'from-green-500 to-emerald-500' },
    { title: 'Languages', description: 'Manage translations', icon: '🌍', href: '/admin/languages', color: 'from-blue-500 to-cyan-500' },
    { title: 'Analytics', description: 'View system analytics', icon: '📊', href: '/admin/analytics', color: 'from-orange-500 to-red-500' },
    { title: 'Users', description: 'Manage user accounts', icon: '👥', href: '/admin/users', color: 'from-indigo-500 to-purple-500' },
    { title: 'Orders', description: 'Review customer orders', icon: '🧾', href: '/admin/orders', color: 'from-amber-500 to-orange-500' },
    { title: 'Wallet Ledger', description: 'Trace debits, refunds, and balances', icon: '💼', href: '/admin/wallet', color: 'from-cyan-500 to-teal-500' },
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
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-xs font-bold">Inapakia Admin Command Center...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Admin Top Header */}
      <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center font-black text-slate-950 text-lg shadow-lg shadow-amber-500/20">
              👑
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-wide">PHCL Admin Console</h1>
              <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                System Administrator Active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={checkAuth}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
            >
              🔄 Refresh Session
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-extrabold text-xs rounded-xl border border-rose-500/30 transition"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Banner Section */}
        <div>
          <h2 className="text-3xl font-black text-white">Global Command Hub</h2>
          <p className="text-xs text-slate-400 mt-1">Sajili ya Usimamizi Mkuu wa Miamala, Soko, Sarafu, na Bidhaa za PHCL Super Platform</p>
        </div>

        {/* Quick Top Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-1">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Products</span>
            <div className="text-3xl font-black text-purple-400">{stockHealth.totalProducts}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-1">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Currencies</span>
            <div className="text-3xl font-black text-emerald-400">{currencyCount}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-1">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Enabled Languages</span>
            <div className="text-3xl font-black text-blue-400">{languageCount}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-1">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Platform Status</span>
            <div className="text-3xl font-black text-amber-400">24/7 Live</div>
          </div>
        </div>

        {/* Financial Overview Grid */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <span className="text-amber-500 font-bold text-xs tracking-wider uppercase">Financial Analytics</span>
              <h3 className="text-xl font-extrabold text-white">💰 Muhtasari wa Mapato na Miamala</h3>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/orders" className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-extrabold text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition">
                📦 View Orders
              </Link>
              <Link href="/admin/wallet" className="rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 text-xs font-extrabold text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 transition">
                💼 Wallet Ledger
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Revenue by Currency</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center rounded-xl bg-slate-900 p-3 border border-slate-800">
                  <span className="text-slate-400 font-bold">USD Total</span>
                  <span className="text-blue-400 font-extrabold">{formatCurrency(revenueMetrics.totalUsd, 'USD')}</span>
                </div>
                <div className="flex justify-between items-center rounded-xl bg-slate-900 p-3 border border-slate-800">
                  <span className="text-slate-400 font-bold">TZS Total</span>
                  <span className="text-amber-400 font-extrabold">{formatCurrency(revenueMetrics.totalTzs, 'TZS')}</span>
                </div>
                <div className="flex justify-between items-center rounded-xl bg-slate-900 p-3 border border-slate-800">
                  <span className="text-slate-400 font-bold">PI Total</span>
                  <span className="text-amber-300 font-extrabold">{formatCurrency(revenueMetrics.totalPi, 'PI')}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Order Volume</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center rounded-xl bg-slate-900 p-3 border border-slate-800">
                  <span className="text-slate-400 font-bold">Total Orders</span>
                  <span className="text-purple-400 font-extrabold text-base">{revenueMetrics.orderCount}</span>
                </div>
                <div className="rounded-xl bg-slate-900 p-3 border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-bold block">By Payment Method:</span>
                  <div className="text-[11px] text-slate-300 font-mono font-bold flex justify-between pt-1">
                    <span>USD: {revenueMetrics.byMethod.usd}</span>
                    <span>TZS: {revenueMetrics.byMethod.tzs}</span>
                    <span>PI: {revenueMetrics.byMethod.pi}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Wallet Operations</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center rounded-xl bg-slate-900 p-3 border border-slate-800">
                  <span className="text-slate-400 font-bold">Checkout Debits</span>
                  <span className="text-cyan-400 font-extrabold">{walletMetrics.debitCount}</span>
                </div>
                <div className="flex justify-between items-center rounded-xl bg-slate-900 p-3 border border-slate-800">
                  <span className="text-slate-400 font-bold">Refund Credits</span>
                  <span className="text-rose-400 font-extrabold">{walletMetrics.refundCount}</span>
                </div>
                <div className="flex justify-between items-center rounded-xl bg-slate-900 p-3 border border-slate-800">
                  <span className="text-slate-400 font-bold">Base USD Balance</span>
                  <span className="text-amber-400 font-extrabold">{formatCurrency(walletMetrics.snapshot.balances.usd, 'USD')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Readiness */}
        <div className="rounded-3xl border border-cyan-500/20 bg-cyan-950/20 p-6 space-y-4">
          <h3 className="text-base font-extrabold text-slate-100 uppercase tracking-wider">⚡ Operational Readiness Monitor</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {operationalReadiness.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</p>
                <p className={`text-xs font-extrabold ${
                  item.tone === 'emerald' ? 'text-emerald-400' : item.tone === 'amber' ? 'text-amber-400' : 'text-cyan-400'
                }`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Stock Health & Critical Items */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-white">📦 Stock Health Command Center</h3>
            <Link href="/admin/products" className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-1.5 text-xs font-extrabold transition">
              Manage Products Stock
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Critical Products Alert</p>
            {criticalStocks.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No critical stock alerts right now.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {criticalStocks.map((product) => {
                  const status = getStockStatus(product.productId);
                  return (
                    <div key={product.productId} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-3">
                      <div>
                        <p className="text-xs font-bold text-slate-100">{product.productName}</p>
                        <p className="text-[10px] text-slate-500 font-mono">ID: {product.productId}</p>
                      </div>
                      <span className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase ${
                        status.color === 'green'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : status.color === 'amber'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {status.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* System Administration Shortcuts Navigation */}
        <div className="space-y-4">
          <h3 className="text-base font-extrabold text-slate-100">🛠️ Zana za Usimamizi wa Mfumo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href} className="group">
                <div className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-3xl p-6 h-full transition duration-300 shadow-lg flex flex-col justify-between">
                  <div>
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${item.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition transform`}>
                      {item.icon}
                    </div>
                    <h4 className="text-lg font-black text-white mb-1 group-hover:text-amber-400 transition">{item.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                  </div>
                  <span className="text-[10px] font-extrabold text-amber-500 mt-4 flex items-center gap-1 group-hover:translate-x-1 transition transform">
                    Fungua Module &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity Logs */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-base font-extrabold text-white">📜 Unified System Activity Log</h3>
          {recentLogs.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Hakuna taarifa za karibuni za mfumo.</p>
          ) : (
            <div className="space-y-2.5">
              {recentLogs.map((entry, index) => (
                <div key={`${entry.source}-${entry.timestamp}-${index}`} className="rounded-2xl border border-slate-800/80 bg-slate-950 p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-xl px-2.5 py-1 text-[10px] font-black uppercase ${
                      entry.tone === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {entry.source}
                    </span>
                    <p className="text-xs font-medium text-slate-200">{entry.summary}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{new Date(entry.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}