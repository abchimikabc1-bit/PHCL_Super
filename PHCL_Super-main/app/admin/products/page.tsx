'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/lib/admin-context';
import {
  getProductStockConfig,
  getProductStockAudit,
  getStockStatus,
  updateProductStock,
  type ProductStock,
  type ProductStockAuditEntry,
} from '@/lib/admin-product-stock';
import { AlertCircle, CheckCircle2, Package, TrendingDown } from 'lucide-react';

export default function ProductsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, refreshSession, sessionDebug, adminUser } = useAdmin();
  const [loadingGuardElapsed, setLoadingGuardElapsed] = useState(false);
  const [stocks, setStocks] = useState<Record<string, ProductStock>>({});
  const [auditEvents, setAuditEvents] = useState<ProductStockAuditEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStock, setEditingStock] = useState<number | null>(null);
  const [editingEnabled, setEditingEnabled] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'enabled' | 'disabled'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const actor =
    (typeof adminUser?.name === 'string' && adminUser.name.trim()) ||
    (typeof adminUser?.email === 'string' && adminUser.email.trim()) ||
    'PHCL Administrator';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
      return;
    }

    const config = getProductStockConfig();
    setStocks(config.products);
    setAuditEvents(getProductStockAudit());
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadingGuardElapsed(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loadingGuardElapsed && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [loadingGuardElapsed, isAuthenticated, router]);

  const loadingActive = isLoading && !loadingGuardElapsed;
  const sessionAgeMinutes = sessionDebug.sessionAgeMs !== null ? Math.floor(sessionDebug.sessionAgeMs / 60000) : null;
  const sessionExpiresMinutes = sessionDebug.expiresInMs !== null ? Math.floor(sessionDebug.expiresInMs / 60000) : null;

  const handleSaveStock = (productId: string, newStock: number, newEnabled: boolean) => {
    const current = stocks[productId];
    if (!current) {
      return;
    }

    updateProductStock(
      productId,
      {
        stock: newStock,
        enabledForSale: newEnabled,
      },
      actor
    );

    setStocks((prev) => ({
      ...prev,
      [productId]: {
        ...current,
        stock: newStock,
        enabledForSale: newEnabled,
      },
    }));
    setAuditEvents(getProductStockAudit());
    setEditingId(null);
    setEditingStock(null);
  };

  const allProducts = useMemo(() => Object.values(stocks), [stocks]);

  const stockSummary = useMemo(() => {
    const total = allProducts.length;
    const enabled = allProducts.filter((item) => item.enabledForSale).length;
    const critical = allProducts.filter((item) => !item.enabledForSale || item.stock === 0 || (item.stock > 0 && item.stock < 5)).length;
    return {
      total,
      enabled,
      disabled: total - enabled,
      critical,
    };
  }, [allProducts]);

  const runBulkAction = (action: 'enable' | 'disable' | 'restock10' | 'unlimited') => {
    if (selectedIds.length === 0) {
      return;
    }

    for (const productId of selectedIds) {
      const current = stocks[productId];
      if (!current) {
        continue;
      }

      if (action === 'enable') {
        updateProductStock(productId, { enabledForSale: true }, actor);
      }

      if (action === 'disable') {
        updateProductStock(productId, { enabledForSale: false }, actor);
      }

      if (action === 'restock10') {
        updateProductStock(productId, { stock: 10, enabledForSale: true }, actor);
      }

      if (action === 'unlimited') {
        updateProductStock(productId, { stock: -1, enabledForSale: true }, actor);
      }
    }

    const config = getProductStockConfig();
    setStocks(config.products);
    setAuditEvents(getProductStockAudit());
    setSelectedIds([]);
  };

  const filteredStocks = allProducts.filter((stock) => {
    const matchesSearch = stock.productName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) {
      return false;
    }

    if (statusFilter === 'critical') {
      return !stock.enabledForSale || stock.stock === 0 || (stock.stock > 0 && stock.stock < 5);
    }

    if (statusFilter === 'enabled') {
      return stock.enabledForSale;
    }

    if (statusFilter === 'disabled') {
      return !stock.enabledForSale;
    }

    return true;
  });

  const allVisibleSelected = filteredStocks.length > 0 && filteredStocks.every((item) => selectedIds.includes(item.productId));

  if (loadingActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-200">Loading products...</p>
        </div>
      </div>
    );
  }

  if (isLoading && loadingGuardElapsed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="w-full max-w-lg rounded-xl border border-amber-300/30 bg-amber-500/10 p-5 text-amber-100">
          <h1 className="text-lg font-semibold">Admin Session Recovery</h1>
          <p className="mt-2 text-sm text-amber-100/85">Products session hydrate is delayed. Trigger a manual recheck.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refreshSession}
              style={{ minHeight: '44px' }}
              className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Force Session Rehydrate
            </button>
            <Link
              href="/admin/login"
              style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center' }}
              className="rounded-lg bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Product Stock Management</h1>
            <p className="mt-1 text-sm text-slate-400">{Object.keys(stocks).length} products tracked</p>
          </div>
          <Link href="/admin/dashboard" className="rounded-lg bg-slate-700 px-4 py-2 font-medium text-white transition-all hover:bg-slate-600">
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
          <span>
            Session Debug: hasSession={sessionDebug.hasSession ? 'yes' : 'no'} | age={sessionAgeMinutes ?? 'n/a'}m | expiresIn={sessionExpiresMinutes ?? 'n/a'}m
          </span>
          <button
            type="button"
            onClick={refreshSession}
            className="ml-3 rounded bg-slate-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-600"
          >
            Rehydrate Now
          </button>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-md">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`rounded px-3 py-1 text-xs font-semibold ${statusFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
            >
              All ({stockSummary.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('critical')}
              className={`rounded px-3 py-1 text-xs font-semibold ${statusFilter === 'critical' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
            >
              Critical ({stockSummary.critical})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('enabled')}
              className={`rounded px-3 py-1 text-xs font-semibold ${statusFilter === 'enabled' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
            >
              Enabled ({stockSummary.enabled})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('disabled')}
              className={`rounded px-3 py-1 text-xs font-semibold ${statusFilter === 'disabled' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
            >
              Disabled ({stockSummary.disabled})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (allVisibleSelected) {
                  setSelectedIds((prev) => prev.filter((id) => !filteredStocks.some((item) => item.productId === id)));
                } else {
                  setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredStocks.map((item) => item.productId)])));
                }
              }}
              className="rounded bg-slate-700 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-600"
            >
              {allVisibleSelected ? 'Unselect Visible' : 'Select Visible'}
            </button>
            <button type="button" onClick={() => runBulkAction('enable')} className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
              Enable Selected
            </button>
            <button type="button" onClick={() => runBulkAction('disable')} className="rounded bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700">
              Disable Selected
            </button>
            <button type="button" onClick={() => runBulkAction('restock10')} className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700">
              Restock Selected to 10
            </button>
            <button type="button" onClick={() => runBulkAction('unlimited')} className="rounded bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-700">
              Set Selected Unlimited
            </button>
            <span className="ml-auto text-xs text-slate-300">Selected: {selectedIds.length}</span>
          </div>
        </div>

        <div className="mb-8 overflow-hidden rounded-lg border border-white/10 bg-white/5 backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Select</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Stock Level</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Enabled</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredStocks.map((product) => {
                  const isEditing = editingId === product.productId;
                  const status = getStockStatus(product.productId);

                  return (
                    <tr key={product.productId} className="transition-colors hover:bg-white/5">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(product.productId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => Array.from(new Set([...prev, product.productId])));
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => id !== product.productId));
                            }
                          }}
                          className="h-4 w-4 cursor-pointer rounded border border-white/20 bg-white/10"
                        />
                      </td>
                      <td className="px-6 py-4 text-white">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-slate-400" />
                          {product.productName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
                            status.color === 'green'
                              ? 'bg-green-500/20 text-green-300'
                              : status.color === 'amber'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {status.color === 'green' ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : status.color === 'amber' ? (
                            <AlertCircle className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editingStock ?? ''}
                            onChange={(e) => setEditingStock(Number.parseInt(e.target.value, 10) || -1)}
                            className="w-20 rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white"
                            placeholder="-1"
                          />
                        ) : (
                          <span className="text-slate-300">{product.stock === -1 ? '∞ (Unlimited)' : product.stock}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={editingEnabled}
                            onChange={(e) => setEditingEnabled(e.target.checked)}
                            className="h-4 w-4 cursor-pointer rounded border border-white/20 bg-white/10"
                          />
                        ) : (
                          <span className={product.enabledForSale ? 'font-medium text-green-300' : 'font-medium text-red-300'}>
                            {product.enabledForSale ? 'Yes' : 'No'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveStock(product.productId, editingStock ?? -1, editingEnabled)}
                              className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded bg-slate-700 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-slate-600"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingId(product.productId);
                                setEditingStock(product.stock);
                                setEditingEnabled(product.enabledForSale);
                              }}
                              className="rounded bg-purple-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-purple-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                handleSaveStock(
                                  product.productId,
                                  product.stock,
                                  !product.enabledForSale
                                )
                              }
                              className={`rounded px-3 py-1 text-xs font-medium text-white transition-colors ${product.enabledForSale ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                            >
                              {product.enabledForSale ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {auditEvents.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-md" data-testid="admin-product-stock-audit-panel">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
              <Package className="h-5 w-5" />
              Recent Stock Changes
            </h2>
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {auditEvents
                .slice()
                .reverse()
                .slice(0, 10)
                .map((event, idx) => (
                  <div key={idx} className="rounded border border-white/10 bg-white/5 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <p className="text-slate-300">
                        <span className="font-semibold text-amber-300">{event.actor}</span>{' '}
                        {event.action === 'updated_stock' ? 'updated stock' : event.action === 'enabled_product' ? 'enabled' : 'disabled'}{' '}
                        <span className="font-medium text-white">{event.productName || 'products'}</span>
                      </p>
                      <span className="text-slate-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                    </div>
                    {event.stockChangedFrom !== undefined && (
                      <p className="mt-1 text-slate-400">
                        Stock: <span className="text-white">{event.stockChangedFrom}</span> to <span className="text-white">{event.stockChangedTo}</span>
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
