
"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, orderBy, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, adjustUserBalance, UserProfile } from '@/lib/user-profile';
import { toast } from 'sonner';
import { convertAmount, formatCurrencyAmount } from '@/components/currency';
import { useDisplayCurrency } from '@/hooks/use-display-currency';
import { getCartItems, setCartItems } from '@/lib/cart-storage';
import { applyProductStockPurchase, revertProductStockPurchase } from '@/lib/admin-product-stock';

export default function OrdersPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { displayCurrency, setCurrency, enabledDisplayCurrencies } = useDisplayCurrency('usd');

  // 1. KUSIKILIZA ODA HALISI ZA FIRESTORE REAL-TIME (onSnapshot)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && db) {
        const q = query(collection(db, 'orders'), where('uid', '==', user.uid), orderBy('createdAt', 'desc'));
        const unsubOrders = onSnapshot(q, (snap) => {
          setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
        }, (err) => {
          console.error("Orders Error:", err);
          setLoading(false);
        });
        return () => unsubOrders();
      } else {
        setOrders([]);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, [currentUser]);

  const totalOrders = orders.length;
  const totalValueDisplay = useMemo(() => {
    const totalUsd = orders.reduce((sum, order) => sum + (order.totalUsd || 0), 0);
    const converted = convertAmount(totalUsd, 'usd', displayCurrency);
    return formatCurrencyAmount(displayCurrency, converted);
  }, [orders, displayCurrency]);

  const reorderItems = (order: any) => {
    if (!order.items || order.items.length === 0) {
      toast.error('Oda hii haina maelezo ya bidhaa.');
      return;
    }
    const current = getCartItems();
    const merged = [...current];
    order.items.forEach((item: any) => {
      const existing = merged.find((entry) => entry.id === item.id);
      if (existing) existing.quantity += item.quantity;
      else merged.push({ ...item });
    });
    setCartItems(merged);
    toast.success('Bidhaa zote zimeongezwa kwenye kikapu chako!');
  };

  const resolveMobileNetworkLabel = (network: string) => {
    if (network === 'mpesa') return 'M-Pesa';
    if (network === 'tigopesa') return 'Tigo Pesa';
    if (network === 'airtelmoney') return 'Airtel Money';
    if (network === 'halopesa') return 'HaloPesa';
    return network;
  };

  // 2. KUGHAIRI ODA NA KURUDISHA SALIO MOJA KWA MOJA KWENYE WALLET KISERVER
  const cancelOrder = async (order: any) => {
    if (cancellingOrderId || !currentUser || !db) return;
    if (order.status === 'CANCELLED') {
      toast.error('Oda hii tayari ilishaghairiwa!');
      return;
    }

    const confirmed = typeof window !== 'undefined'
      ? window.confirm(`Je, una uhakika unataka kughairi oda ${order.id}? Salio lako litarudishwa kibenki.`)
      : false;
    if (!confirmed) return;

    setCancellingOrderId(order.id);
    try {
      const refundCurrency = order.paymentMethod;
      const refundAmount = convertAmount(order.totalUsd, 'usd', refundCurrency);

      // Rejesha hisa za bidhaa (stock restore)
      const stockRestore = revertProductStockPurchase(
        order.items.map((item: any) => ({ productId: item.id, quantity: item.quantity })),
        `refund:${order.id}`
      );
      if (!stockRestore.success) {
        toast.error(stockRestore.reason || 'Imeshindikana kurejesha hisa za bidhaa.');
        return;
      }

      // A. RUDISHA SALIO KISERVER KWENYE WALLET YAKE
      await adjustUserBalance(currentUser.uid, refundCurrency, refundAmount);

      // B. REKODI MUAMALA WA REFUND KWENYE TRANSACTIONS
      const txRef = collection(db, 'transactions');
      await addDoc(txRef, {
        uid: currentUser.uid, type: 'credit', currency: refundCurrency, amount: refundAmount,
        description: `Kurejeshewa fedha (Refund) kwa Oda iliyoghairiwa ${order.id}`, createdAt: serverTimestamp()
      });

      // C. SASISHA HALI YA ODA KUWA CANCELLED KWENYE DATABASE
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        status: 'CANCELLED',
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        'audit.cancellation': {
          cancelledAt: new Date().toISOString(),
          refunded: true,
          refundAmount,
          refundCurrency,
        }
      });

      toast.success(`Oda ${order.id} imesaidia kughairiwa na kufanyiwa refund!`);
    } catch {
      toast.error('Kosa limetokea wakati wa kughairi oda.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Inapakia...</div>;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4 text-center p-6">
        <p className="text-gray-300">Tafadhali ingia ili kufungua Orodha ya Oda.</p>
        <Link href="/login" className="rounded-xl bg-amber-500 px-6 py-2.5 text-slate-950 font-bold text-sm">Kuingia (Login)</Link>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_25%)]" />

      <section className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black sm:text-4xl">Historia ya Oda (Orders)</h1>
            <p className="mt-2 text-sm text-slate-300">Kagua na ufuatilie oda zako zote zilizothibitishwa.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/marketplace" className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100 h-11 flex items-center justify-center">Marketplace</Link>
            <Link href="/cart" className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100 h-11 flex items-center justify-center">Cart</Link>
            <Link href="/checkout" className="rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 h-11 flex items-center justify-center">Checkout</Link>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/20 bg-white/10 p-4 text-sm global-glass">
          <p className="text-amber-50/90">Orders: <span className="font-semibold text-white">{totalOrders}</span></p>
          <p className="text-amber-50/90">Total value: <span className="font-semibold text-white">{totalValueDisplay}</span></p>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-amber-50/90">Display currency:</span>
          {enabledDisplayCurrencies.includes('usd') && (
            <button type="button" onClick={() => setCurrency('usd')} className={`rounded-lg px-3 py-1 font-semibold ${displayCurrency === 'usd' ? 'bg-amber-300 text-slate-900' : 'bg-slate-800/70 text-amber-100'}`}>USD</button>
          )}
          {enabledDisplayCurrencies.includes('tzs') && (
            <button type="button" onClick={() => setCurrency('tzs')} className={`rounded-lg px-3 py-1 font-semibold ${displayCurrency === 'tzs' ? 'bg-amber-100 text-slate-900' : 'bg-slate-800/70 text-amber-100'}`}>TZS</button>
          )}
          {enabledDisplayCurrencies.includes('ntzs') && (
            <button type="button" onClick={() => setCurrency('ntzs')} className={`rounded-lg px-3 py-1 font-semibold ${displayCurrency === 'ntzs' ? 'bg-cyan-200 text-slate-900' : 'bg-slate-800/70 text-amber-100'}`}>nTZS</button>
          )}
          {enabledDisplayCurrencies.includes('pi') && (
            <button type="button" onClick={() => setCurrency('pi')} className={`rounded-lg px-3 py-1 font-semibold ${displayCurrency === 'pi' ? 'bg-yellow-300 text-slate-900' : 'bg-slate-800/70 text-amber-100'}`}>PI</button>
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
              const isCancelled = order.status === 'CANCELLED';
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
                          
                          {/* Sifa za Oda */}
                          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-amber-50/90 sm:grid-cols-3">
                            <p>Vipande: <span className="font-semibold text-white">{order.itemCount}</span></p>
                            <p>Malipo: <span className="font-semibold text-white">{order.paymentMethod ? order.paymentMethod.toUpperCase() : 'N/A'}</span></p>
                            <p>Jumla: <span className="font-semibold text-white">{formatCurrencyAmount(displayCurrency, converted)}</span></p>
                          </div>

                          {/* Maelezo ya Usafirishaji */}
                          {order.customer && (
                            <div className="mt-3 rounded-lg border border-white/10 bg-slate-900/50 p-3 text-xs text-amber-50/85">
                              <p className="font-semibold text-amber-100">Shipping Details</p>
                              <p>{order.customer.fullName} • {order.customer.phone}</p>
                              <p>{order.customer.addressLine1}, {order.customer.city}, {order.customer.country}</p>
                            </div>
                          )}

                          {/* Vitendo vya Oda */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => reorderItems(order)}
                              disabled={isCancelled}
                              className="rounded-lg bg-amber-300 px-3 py-2 text-xs font-semibold text-slate-900 disabled:opacity-50 h-10"
                            >
                              Reorder Items
                            </button>
                            <Link href="/cart" className="rounded-lg bg-slate-800/80 px-3 py-2 text-xs font-semibold text-amber-100 h-10 flex items-center justify-center">
                              View Cart
                            </Link>
                            <button
                              type="button"
                              onClick={() => cancelOrder(order)}
                              disabled={isCancelled || cancellingOrderId !== null}
                              className="rounded-lg bg-rose-500/85 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-50 h-10"
                            >
                              {isCancelled ? 'Cancelled' : 'Cancel & Refund'}
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
