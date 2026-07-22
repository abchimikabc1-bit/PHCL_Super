'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/lib/admin-context';
import { StoredOrder, getOrders } from '@/lib/order-storage';
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, CreditCard, RefreshCw, Search, Shield, XCircle } from 'lucide-react';

type TransactionStatus = 'completed' | 'pending' | 'failed' | 'refunded';

interface AdminTransactionView {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  amountUsd: number;
  paymentMethod: string;
  status: TransactionStatus;
  createdAt: string;
}

const TX_STATUS_KEY = 'phcl_admin_tx_statuses';

const getTxStatuses = (): Record<string, TransactionStatus> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(TX_STATUS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? (parsed as Record<string, TransactionStatus>) : {};
  } catch {
    return {};
  }
};

const saveTxStatuses = (statuses: Record<string, TransactionStatus>) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TX_STATUS_KEY, JSON.stringify(statuses));
};

const deriveTransactions = (orders: StoredOrder[]): AdminTransactionView[] => {
  return orders.map((order) => ({
    id: `TX-${order.id.slice(-8).toUpperCase()}`,
    orderId: order.id,
    customerName: order.customer?.fullName || 'Guest Customer',
    phone: order.customer?.phone || 'N/A',
    amountUsd: order.totalUsd || 0,
    paymentMethod: order.paymentMethod || 'Crypto / USDT',
    status: (order.status as TransactionStatus) || 'completed',
    createdAt: order.createdAt || new Date().toISOString(),
  })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export default function AdminTransactionsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, refreshSession, sessionDebug } = useAdmin();
  const [loadingGuardElapsed, setLoadingGuardElapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<AdminTransactionView[]>([]);
  const [statuses, setStatuses] = useState<Record<string, TransactionStatus>>({});

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
      return;
    }

    if (isAuthenticated) {
      setTransactions(deriveTransactions(getOrders()));
      setStatuses(getTxStatuses());
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadingGuardElapsed(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  const loadingActive = isLoading && !loadingGuardElapsed;

  const filteredTransactions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (!term) return true;
      return (
        tx.id.toLowerCase().includes(term) ||
        tx.customerName.toLowerCase().includes(term) ||
        tx.phone.toLowerCase().includes(term) ||
        tx.paymentMethod.toLowerCase().includes(term)
      );
    });
  }, [transactions, searchTerm]);

  const updateStatus = (id: string, newStatus: TransactionStatus) => {
    const updated = { ...statuses, [id]: newStatus };
    setStatuses(updated);
    saveTxStatuses(updated);
    toast.success(`Transaction ${id} status updated to ${newStatus}`);
  };

  if (loadingActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-200 font-medium">Loading transactions...</p>
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
              Transaction & Wallet Audit
            </h1>
            <p className="text-sm text-slate-400 mt-1">Monitor crypto payments and store transaction logs</p>
          </div>
          <Link href="/admin/dashboard" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Tx ID, Customer Name, Phone or Method..."
            className="w-full rounded-lg border border-white/20 bg-slate-900/70 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 overflow-x-auto backdrop-blur-md">
          <table className="w-full text-sm text-slate-300">
            <thead>
              <tr className="border-b border-white/10 text-xs font-semibold text-slate-400">
                <th className="px-4 py-3 text-left">Tx ID</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const currentStatus = statuses[tx.id] || tx.status;
                  return (
                    <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-purple-300">{tx.id}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{tx.customerName}</p>
                        <p className="text-xs text-slate-400">{tx.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{tx.paymentMethod}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-400">${tx.amountUsd.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold ${
                          currentStatus === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                          currentStatus === 'pending' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-rose-500/20 text-rose-300'
                        }`}>
                          {currentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}