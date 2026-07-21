'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatCurrencyAmount } from '@/components/marketplace/currency-utils';
import { useAdmin } from '@/lib/admin-context';
import { useCommerceSnapshot } from '@/hooks/use-commerce-snapshot';
import { refreshCommerceClientCache } from '@/lib/commerce-client-cache';
import { getOrders, type StoredOrder } from '@/lib/order-storage';
import {
  WALLET_UPDATED_EVENT,
  getWalletLedger,
  getWalletSnapshot,
  type WalletLedgerEntry,
  type WalletSnapshot,
} from '@/lib/wallet-storage';

const EMPTY_SNAPSHOT: WalletSnapshot = {
  balances: { usd: 0, tzs: 0, ntzs: 0, pi: 0 },
  updatedAt: '',
};

export default function AdminWalletPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdmin();
  const { snapshot: commerceSnapshot } = useCommerceSnapshot();
  const [ledger, setLedger] = useState<WalletLedgerEntry[]>([]);
  const [snapshot, setSnapshot] = useState<WalletSnapshot>(EMPTY_SNAPSHOT);
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'debit' | 'credit'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'usd' | 'tzs' | 'ntzs' | 'pi'>('all');
  const [reasonFilter, setReasonFilter] = useState<'all' | 'checkout' | 'refund' | 'rollback' | 'other'>('all');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/admin/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!commerceSnapshot) return;
    setLedger(commerceSnapshot.walletLedger);
    setSnapshot(commerceSnapshot.walletSnapshot ?? EMPTY_SNAPSHOT);
    setOrders(commerceSnapshot.orders);
  }, [commerceSnapshot]);

  useEffect(() => {
    const syncWallet = () => {
      setLedger(getWalletLedger());
      setSnapshot(getWalletSnapshot());
      setOrders(getOrders());
    };

    void refreshCommerceClientCache().finally(syncWallet);
    window.addEventListener(WALLET_UPDATED_EVENT, syncWallet);
    window.addEventListener('storage', syncWallet);
    return () => {
      window.removeEventListener(WALLET_UPDATED_EVENT, syncWallet);
      window.removeEventListener('storage', syncWallet);
    };
  }, []);

  const metrics = useMemo(() => {
    const debitCount = ledger.filter((entry) => entry.type === 'debit').length;
    const creditCount = ledger.filter((entry) => entry.type === 'credit').length;
    const debitVolume = {
      usd: ledger.filter((entry) => entry.type === 'debit' && entry.currency === 'usd').reduce((sum, entry) => sum + entry.amount, 0),
      tzs: ledger.filter((entry) => entry.type === 'debit' && entry.currency === 'tzs').reduce((sum, entry) => sum + entry.amount, 0),
      ntzs: ledger.filter((entry) => entry.type === 'debit' && entry.currency === 'ntzs').reduce((sum, entry) => sum + entry.amount, 0),
      pi: ledger.filter((entry) => entry.type === 'debit' && entry.currency === 'pi').reduce((sum, entry) => sum + entry.amount, 0),
    };
    const creditVolume = {
      usd: ledger.filter((entry) => entry.type === 'credit' && entry.currency === 'usd').reduce((sum, entry) => sum + entry.amount, 0),
      tzs: ledger.filter((entry) => entry.type === 'credit' && entry.currency === 'tzs').reduce((sum, entry) => sum + entry.amount, 0),
      ntzs: ledger.filter((entry) => entry.type === 'credit' && entry.currency === 'ntzs').reduce((sum, entry) => sum + entry.amount, 0),
      pi: ledger.filter((entry) => entry.type === 'credit' && entry.currency === 'pi').reduce((sum, entry) => sum + entry.amount, 0),
    };
    const tracedOrders = orders.filter((order) => order.audit?.paymentTransactionId).length;

    return { debitCount, creditCount, debitVolume, creditVolume, tracedOrders };
  }, [ledger, orders]);

  const orderByPaymentTxn = useMemo(() => {
    const map = new Map<string, StoredOrder>();
    orders.forEach((order) => {
      if (order.audit?.paymentTransactionId) {
        map.set(order.audit.paymentTransactionId, order);
      }
      if (order.audit?.cancellation?.refundTransactionId) {
        map.set(order.audit.cancellation.refundTransactionId, order);
      }
    });
    return map;
  }, [orders]);

  const filteredLedger = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return ledger.filter((entry) => {
      const matchesType = typeFilter === 'all' || entry.type === typeFilter;
      const matchesCurrency = currencyFilter === 'all' || entry.currency === currencyFilter;
      const entryReason = entry.reason.toLowerCase();
      const matchesReason =
        reasonFilter === 'all' ||
        (reasonFilter === 'checkout' && entryReason.includes('checkout')) ||
        (reasonFilter === 'refund' && entryReason.includes('refund')) ||
        (reasonFilter === 'rollback' && entryReason.includes('rollback')) ||
        (reasonFilter === 'other' && !entryReason.includes('checkout') && !entryReason.includes('refund') && !entryReason.includes('rollback'));

      const linkedOrder = orderByPaymentTxn.get(entry.id) ?? orders.find((order) => order.id === entry.orderId);
      const matchesSearch =
        query.length === 0 ||
        entry.id.toLowerCase().includes(query) ||
        entry.reason.toLowerCase().includes(query) ||
        entry.currency.toLowerCase().includes(query) ||
        (entry.orderId || '').toLowerCase().includes(query) ||
        (linkedOrder?.id || '').toLowerCase().includes(query);

      return matchesType && matchesCurrency && matchesReason && matchesSearch;
    });
  }, [ledger, searchTerm, typeFilter, currencyFilter, reasonFilter, orderByPaymentTxn, orders]);

  const exportFilteredLedger = () => {
    const escapeCsv = (value: string | number | null | undefined) => {
      const rawText = String(value ?? '');
      const neutralized = /^[=+\-@]/.test(rawText) ? `'${rawText}` : rawText;
      if (neutralized.includes(',') || neutralized.includes('"') || neutralized.includes('\n')) {
        return `"${neutralized.replace(/"/g, '""')}"`;
      }
      return neutralized;
    };

    const header = ['txn_id', 'type', 'currency', 'amount', 'balance_after', 'reason', 'order_id', 'linked_order_id', 'created_at'];
    const rows = filteredLedger.map((entry) => {
      const linkedOrder = orderByPaymentTxn.get(entry.id) ?? orders.find((order) => order.id === entry.orderId);
      return [
        escapeCsv(entry.id),
        escapeCsv(entry.type),
        escapeCsv(entry.currency),
        escapeCsv(entry.amount),
        escapeCsv(entry.balanceAfter),
        escapeCsv(entry.reason),
        escapeCsv(entry.orderId),
        escapeCsv(linkedOrder?.id),
        escapeCsv(entry.createdAt),
      ];
    });

    const csv = [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `wallet-ledger-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <p className="text-slate-300">Loading wallet ledger...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Wallet Ledger</h1>
            <p className="text-sm text-slate-400 mt-1">Track checkout debits, refunds, and wallet balances.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/dashboard" className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600">Dashboard</Link>
            <Link href="/admin/orders" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Orders</Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap gap-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search txn ID, reason, or order"
                className="min-w-[220px] flex-1 rounded-lg border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-400"
              />
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as 'all' | 'debit' | 'credit')}
                className="rounded-lg border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-white"
              >
                <option value="all">All Types</option>
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
              <select
                value={currencyFilter}
                onChange={(event) => setCurrencyFilter(event.target.value as 'all' | 'usd' | 'tzs' | 'ntzs' | 'pi')}
                className="rounded-lg border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-white"
              >
                <option value="all">All Currencies</option>
                <option value="usd">USD</option>
                <option value="tzs">TZS</option>
                <option value="ntzs">nTZS</option>
                <option value="pi">PI</option>
              </select>
              <select
                value={reasonFilter}
                onChange={(event) => setReasonFilter(event.target.value as 'all' | 'checkout' | 'refund' | 'rollback' | 'other')}
                className="rounded-lg border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-white"
              >
                <option value="all">All Reasons</option>
                <option value="checkout">Checkout</option>
                <option value="refund">Refund</option>
                <option value="rollback">Rollback</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button
              type="button"
              onClick={exportFilteredLedger}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
            >
              Export CSV
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-400">Showing {filteredLedger.length} of {ledger.length} ledger entries.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-8">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Current USD</p>
            <p className="mt-2 text-lg font-semibold text-blue-300">{formatCurrencyAmount('usd', snapshot.balances.usd)}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Current TZS / nTZS</p>
            <p className="mt-2 text-sm font-semibold text-amber-300">{formatCurrencyAmount('tzs', snapshot.balances.tzs)} / {formatCurrencyAmount('ntzs', snapshot.balances.ntzs)}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Current PI</p>
            <p className="mt-2 text-lg font-semibold text-violet-300">{formatCurrencyAmount('pi', snapshot.balances.pi)}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Traced Orders</p>
            <p className="mt-2 text-lg font-semibold text-emerald-300">{metrics.tracedOrders}/{orders.length}</p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h2 className="text-sm font-semibold text-white mb-3">Debit Volume</h2>
            <div className="space-y-2 text-sm">
              <p className="text-slate-200">Transactions: {metrics.debitCount}</p>
              <p className="text-blue-300">USD: {formatCurrencyAmount('usd', metrics.debitVolume.usd)}</p>
              <p className="text-amber-300">TZS: {formatCurrencyAmount('tzs', metrics.debitVolume.tzs)}</p>
              <p className="text-cyan-300">nTZS: {formatCurrencyAmount('ntzs', metrics.debitVolume.ntzs)}</p>
              <p className="text-violet-300">PI: {formatCurrencyAmount('pi', metrics.debitVolume.pi)}</p>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h2 className="text-sm font-semibold text-white mb-3">Credit Volume</h2>
            <div className="space-y-2 text-sm">
              <p className="text-slate-200">Transactions: {metrics.creditCount}</p>
              <p className="text-blue-300">USD: {formatCurrencyAmount('usd', metrics.creditVolume.usd)}</p>
              <p className="text-amber-300">TZS: {formatCurrencyAmount('tzs', metrics.creditVolume.tzs)}</p>
              <p className="text-cyan-300">nTZS: {formatCurrencyAmount('ntzs', metrics.creditVolume.ntzs)}</p>
              <p className="text-violet-300">PI: {formatCurrencyAmount('pi', metrics.creditVolume.pi)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-white mb-4">Ledger Entries</h2>
          {filteredLedger.length === 0 ? (
            <p className="text-sm text-slate-400">No wallet transactions recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-slate-300">
                <thead className="border-b border-white/10 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Txn ID</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Currency</th>
                    <th className="px-3 py-2 text-left">Amount</th>
                    <th className="px-3 py-2 text-left">Balance After</th>
                    <th className="px-3 py-2 text-left">Reason</th>
                    <th className="px-3 py-2 text-left">Order</th>
                    <th className="px-3 py-2 text-left">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.map((entry) => {
                    const linkedOrder = orderByPaymentTxn.get(entry.id) ?? orders.find((order) => order.id === entry.orderId);
                    return (
                      <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-3 py-2 font-mono text-[11px] text-cyan-300">{entry.id}</td>
                        <td className={`px-3 py-2 font-semibold ${entry.type === 'debit' ? 'text-rose-300' : 'text-emerald-300'}`}>{entry.type}</td>
                        <td className="px-3 py-2 uppercase">{entry.currency}</td>
                        <td className="px-3 py-2">{formatCurrencyAmount(entry.currency, entry.amount)}</td>
                        <td className="px-3 py-2">{formatCurrencyAmount(entry.currency, entry.balanceAfter)}</td>
                        <td className="px-3 py-2">{entry.reason}</td>
                        <td className="px-3 py-2">
                          {linkedOrder ? (
                            <Link href="/admin/orders" className="text-amber-300 hover:text-amber-200">{linkedOrder.id}</Link>
                          ) : (
                            <span className="text-slate-500">{entry.orderId || 'N/A'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">{new Date(entry.createdAt).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}