"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { convertAmount, formatCurrencyAmount } from '@/components/marketplace/currency-utils';
import { useCommerceSnapshot } from '@/hooks/use-commerce-snapshot';
import { useCommerceBootstrap } from '@/hooks/use-commerce-bootstrap';
import { useDisplayCurrency } from '@/hooks/use-display-currency';
import { ORDERS_UPDATED_EVENT, REORDER_SOURCE_KEY, StoredOrder, getOrders, updateOrderById } from '@/lib/order-storage';
import { getCartItems, setCartItems } from '@/lib/cart-storage';
import { applyProductStockPurchase, revertProductStockPurchase } from '@/lib/admin-product-stock';
import { creditWalletBalance, debitWalletBalance } from '@/lib/wallet-storage';

export default function OrdersPage() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const { snapshot } = useCommerceSnapshot();
  const { displayCurrency, setCurrency, enabledDisplayCurrencies } = useDisplayCurrency('usd');

  useEffect(() => {
    if (!snapshot) return;
    setOrders(snapshot.orders);
  }, [snapshot]);

  useCommerceBootstrap(() => {
    const syncOrders = () => setOrders(getOrders());
    syncOrders();
    window.addEventListener(ORDERS_UPDATED_EVENT, syncOrders);
    window.addEventListener('storage', syncOrders);
    window.addEventListener('focus', syncOrders);

    return () => {
      window.removeEventListener(ORDERS_UPDATED_EVENT, syncOrders);
      window.removeEventListener('storage', syncOrders);
      window.removeEventListener('focus', syncOrders);
    };
  }, []);

  const totalOrders = orders.length;
  const totalValueDisplay = useMemo(() => {
    const totalUsd = orders.reduce((sum, order) => sum + order.totalUsd, 0);
    const converted = convertAmount(totalUsd, 'usd', displayCurrency);
    return formatCurrencyAmount(displayCurrency, converted);
  }, [orders, displayCurrency]);

  const reorderItems = (order: StoredOrder) => {
    if (!order.items || order.items.length === 0) {
      toast.error('This order does not have item details to reorder');
      return;
    }

    const current = getCartItems();
    const merged = [...current];

    order.items.forEach((item) => {
      const existing = merged.find((entry) => entry.id === item.id);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        merged.push({ ...item });
      }
    });

    setCartItems(merged);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(REORDER_SOURCE_KEY, order.id);
    }
    toast.success('Order items added to cart');
  };

  const resolveMobileNetworkLabel = (network: string) => {
    if (network === 'mpesa') return 'M-Pesa';
    if (network === 'tigopesa') return 'Tigo Pesa';
    if (network === 'airtelmoney') return 'Airtel Money';
    if (network === 'halopesa') return 'HaloPesa';
    return network;
  };

  const cancelOrder = (order: StoredOrder) => {
    if (cancellingOrderId) {
      toast.error('Another cancellation is already in progress');
      return;
    }

    if (order.audit?.cancellation?.cancelledAt) {
      toast.error('This order is already cancelled');
      return;
    }

    if (!order.items || order.items.length === 0) {
      toast.error('Cannot cancel this order because item details are missing');
      return;
    }

    const confirmed = typeof window !== 'undefined'
      ? window.confirm(`Cancel order ${order.id}? This will refund your wallet and restore stock.`)
      : false;

    if (!confirmed) {
      return;
    }

    setCancellingOrderId(order.id);

    try {
      const cancelReasonRaw = typeof window !== 'undefined'
        ? window.prompt('Optional: Add cancellation reason')
        : '';
      const cancelReason = typeof cancelReasonRaw === 'string' ? cancelReasonRaw.trim().slice(0, 180) : '';

      const refundCurrency = order.paymentMethod;
      const refundAmount = convertAmount(order.totalUsd, 'usd', refundCurrency);

      const stockRestore = revertProductStockPurchase(
        order.items.map((item) => ({ productId: item.id, quantity: item.quantity })),
        `refund:${order.id}`
      );

      if (!stockRestore.success) {
        toast.error(stockRestore.reason || 'Could not restore stock for cancellation');
        return;
      }

      const walletRefund = creditWalletBalance(refundCurrency, refundAmount, 'order_refund', order.id);
      if (!walletRefund.success) {
        toast.error('Could not refund wallet balance');
        return;
      }

      const updated = updateOrderById(order.id, (current) => ({
        ...current,
        audit: {
          schemaVersion: current.audit?.schemaVersion ?? 4,
          sourceRoute: current.audit?.sourceRoute ?? '/checkout',
          channel: 'web',
          recordedAt: current.audit?.recordedAt ?? current.createdAt,
          reorderSourceOrderId: current.audit?.reorderSourceOrderId,
          mobilePayment: current.audit?.mobilePayment,
          consent: current.audit?.consent,
          cancellation: {
            cancelledAt: new Date().toISOString(),
            reason: cancelReason || undefined,
            refunded: true,
            refundedAt: new Date().toISOString(),
            refundAmount,
            refundCurrency,
            refundTransactionId: walletRefund.transactionId,
          },
        },
      }));

      if (!updated) {
        debitWalletBalance(refundCurrency, refundAmount, 'order_refund_rollback', order.id);
        applyProductStockPurchase(
          order.items.map((item) => ({ productId: item.id, quantity: item.quantity })),
          `refund_rollback:${order.id}`
        );
        toast.error('Could not mark order as cancelled after refund');
        return;
      }

      toast.success(`Order ${order.id} cancelled and refunded`);
    } finally {
      setCancellingOrderId(null);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_25%),radial-gradient(circle_at_bottom_center,rgba(245,158,11,0.14),transparent_24%)]" />

      <section className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black sm:text-4xl">Order History</h1>
            <p className="mt-2 text-sm text-amber-50/85 sm:text-base">Review your recent confirmed orders.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/marketplace" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100">
              Marketplace
            </Link>
            <Link href="/cart" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100">
              Cart
            </Link>
            <Link href="/checkout" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900">
              Checkout
            </Link>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/20 bg-white/10 p-4 text-sm global-glass">
          <p className="text-amber-50/90">Orders: <span className="font-semibold text-white">{totalOrders}</span></p>
          <p className="text-amber-50/90">Total value: <span className="font-semibold text-white">{totalValueDisplay}</span></p>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-amber-50/90">Display currency:</span>
          {enabledDisplayCurrencies.includes('usd') && (
            <button type="button" onClick={() => setCurrency('usd')} style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className={`rounded-lg px-3 py-1 font-semibold ${displayCurrency === 'usd' ? 'bg-amber-300 text-slate-900' : 'bg-slate-800/70 text-amber-100'}`}>
              USD
            </button>
          )}
          {enabledDisplayCurrencies.includes('tzs') && (
            <button type="button" onClick={() => setCurrency('tzs')} style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className={`rounded-lg px-3 py-1 font-semibold ${displayCurrency === 'tzs' ? 'bg-amber-100 text-slate-900' : 'bg-slate-800/70 text-amber-100'}`}>
              TZS
            </button>
          )}
            {enabledDisplayCurrencies.includes('ntzs') && (
              <button type="button" onClick={() => setCurrency('ntzs')} style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className={`rounded-lg px-3 py-1 font-semibold ${displayCurrency === 'ntzs' ? 'bg-cyan-200 text-slate-900' : 'bg-slate-800/70 text-amber-100'}`}>
                nTZS
              </button>
            )}
          {enabledDisplayCurrencies.includes('pi') && (
            <button type="button" onClick={() => setCurrency('pi')} style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className={`rounded-lg px-3 py-1 font-semibold ${displayCurrency === 'pi' ? 'bg-yellow-300 text-slate-900' : 'bg-slate-800/70 text-amber-100'}`}>
              PI
            </button>
          )}
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-white/20 bg-white/10 p-8 text-center global-glass">
            <p className="text-lg font-semibold text-amber-50">No orders yet.</p>
            <p className="mt-2 text-sm text-amber-50/85">Complete a purchase to see history here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const converted = convertAmount(order.totalUsd, 'usd', displayCurrency);
              const isCancelled = Boolean(order.audit?.cancellation?.cancelledAt);
              const isCancelling = cancellingOrderId === order.id;
              return (
                <article key={order.id} className="rounded-2xl border border-white/20 bg-white/10 p-4 global-glass">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{order.id}</p>
                      <p className="text-xs text-amber-50/85">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isCancelled ? 'bg-rose-500/20 text-rose-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
                      {isCancelled ? 'Cancelled' : 'Confirmed'}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-amber-50/90 sm:grid-cols-3">
                    <p>Items: <span className="font-semibold text-white">{order.itemCount}</span></p>
                    <p>Paid with: <span className="font-semibold text-white">{order.paymentMethod.toUpperCase()}</span></p>
                    <p>Total: <span className="font-semibold text-white">{formatCurrencyAmount(displayCurrency, converted)}</span></p>
                  </div>
                  {(order.paymentMethod === 'tzs' || order.paymentMethod === 'ntzs') && (
                    <div className="mt-2 rounded-lg border border-cyan-300/20 bg-cyan-500/10 p-2 text-xs text-cyan-100">
                      <p>
                        Mobile Network:{' '}
                        <span className="font-semibold">
                          {order.audit?.mobilePayment
                            ? resolveMobileNetworkLabel(order.audit.mobilePayment.network)
                            : 'Not provided'}
                        </span>
                      </p>
                      <p>
                        Payment Phone:{' '}
                        <span className="font-semibold">{order.audit?.mobilePayment?.phone || 'Not provided'}</span>
                      </p>
                    </div>
                  )}
                  {order.customer && (
                    <div className="mt-3 rounded-lg border border-white/15 bg-slate-900/50 p-3 text-xs text-amber-50/85">
                      <p className="font-semibold text-amber-100">Shipping</p>
                      <p>{order.customer.fullName} • {order.customer.phone}</p>
                      <p>{order.customer.addressLine1}, {order.customer.city}, {order.customer.country}</p>
                    </div>
                  )}
                  {isCancelled && (
                    <div className="mt-3 rounded-lg border border-rose-300/30 bg-rose-500/10 p-3 text-xs text-rose-100">
                      <p>Cancelled at: {order.audit?.cancellation?.cancelledAt ? new Date(order.audit.cancellation.cancelledAt).toLocaleString() : 'N/A'}</p>
                      <p>Refund: {order.audit?.cancellation?.refundCurrency && typeof order.audit?.cancellation?.refundAmount === 'number' ? formatCurrencyAmount(order.audit.cancellation.refundCurrency, order.audit.cancellation.refundAmount) : 'N/A'}</p>
                      <p>Wallet Txn: {order.audit?.cancellation?.refundTransactionId || 'N/A'}</p>
                      {order.audit?.cancellation?.reason && <p>Reason: {order.audit.cancellation.reason}</p>}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => reorderItems(order)}
                      disabled={!order.items || order.items.length === 0}
                      style={{ minHeight: '44px', paddingTop: '8px', paddingBottom: '8px' }}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                        order.items && order.items.length > 0
                          ? 'bg-amber-300 text-slate-900'
                          : 'bg-slate-700 text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      Reorder Items
                    </button>
                    <Link href="/cart" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 12px' }} className="rounded-lg bg-slate-800/80 px-3 py-2 text-xs font-semibold text-amber-100">
                      View Cart
                    </Link>
                    <button
                      type="button"
                      onClick={() => cancelOrder(order)}
                      disabled={isCancelled || isCancelling || cancellingOrderId !== null}
                      style={{ minHeight: '44px', paddingTop: '8px', paddingBottom: '8px' }}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold ${isCancelled || cancellingOrderId !== null ? 'bg-slate-700 text-slate-300 cursor-not-allowed' : 'bg-rose-500/85 text-white hover:bg-rose-600'}`}
                    >
                      {isCancelling ? 'Cancelling...' : isCancelled ? 'Cancelled' : 'Cancel & Refund'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
