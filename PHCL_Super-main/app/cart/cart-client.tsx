"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ShoppingCart } from '@/components/shopping-cart';
import { useDisplayCurrency } from '@/hooks/use-display-currency';
import { getAdminSettings } from '@/lib/admin-settings';
import { reconcileCartItemsWithStock } from '@/lib/cart-stock-reconcile';
import { CART_UPDATED_EVENT, CartStorageItem, getCartItems, setCartItems } from '@/lib/cart-storage';

export default function CartClient() {
  const router = useRouter();
  const [items, setItems] = useState<CartStorageItem[]>([]);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const hasItems = useMemo(() => items.length > 0, [items]);
  const { displayCurrency, setCurrency, enabledDisplayCurrencies } = useDisplayCurrency('usd');

  useEffect(() => {
    const syncCart = () => {
      const current = getCartItems();
      const reconciled = reconcileCartItemsWithStock(current);

      if (reconciled.changes.length > 0) {
        setCartItems(reconciled.items);
        const removedCount = reconciled.changes.filter((change) => change.type === 'removed_unavailable').length;
        const reducedCount = reconciled.changes.filter((change) => change.type === 'reduced_quantity').length;

        if (removedCount > 0) {
          toast.warning(`${removedCount} item(s) removed from cart due to stock changes`);
        }
        if (reducedCount > 0) {
          toast.warning(`${reducedCount} item(s) quantity adjusted to available stock`);
        }
      }

      setItems(reconciled.items);
    };

    syncCart();
    window.addEventListener(CART_UPDATED_EVENT, syncCart);
    window.addEventListener('storage', syncCart);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncCart);
      window.removeEventListener('storage', syncCart);
    };
  }, []);

  useEffect(() => {
    const syncSettings = () => {
      const settings = getAdminSettings();
      setMaintenanceMode(settings.maintenanceMode);
    };

    syncSettings();
    window.addEventListener('storage', syncSettings);
    return () => window.removeEventListener('storage', syncSettings);
  }, []);

  const handleCartChange = (nextItems: CartStorageItem[]) => {
    const reconciled = reconcileCartItemsWithStock(nextItems);

    if (reconciled.changes.length > 0) {
      const removedCount = reconciled.changes.filter((change) => change.type === 'removed_unavailable').length;
      const reducedCount = reconciled.changes.filter((change) => change.type === 'reduced_quantity').length;

      if (removedCount > 0) {
        toast.warning(`${removedCount} item(s) removed from cart due to stock changes`);
      }
      if (reducedCount > 0) {
        toast.warning(`${reducedCount} item(s) quantity adjusted to available stock`);
      }
    }

    setItems(reconciled.items);
    setCartItems(reconciled.items);
  };

  const clearCart = () => {
    setItems([]);
    setCartItems([]);
    toast.success('Cart cleared');
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_26%),radial-gradient(circle_at_bottom_center,rgba(245,158,11,0.12),transparent_25%)]" />

      <section className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black sm:text-4xl">Shopping Cart</h1>
            <p className="mt-2 text-sm text-amber-50/85 sm:text-base">
              Review items, apply promo discounts, and continue to checkout.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/marketplace" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100">
              Back to Marketplace
            </Link>
            {maintenanceMode ? (
              <button
                type="button"
                style={{ minHeight: '44px', paddingTop: '8px', paddingBottom: '8px' }}
                className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 cursor-not-allowed"
              >
                Checkout Paused
              </button>
            ) : (
              <Link href="/checkout" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900">
                Go to Checkout
              </Link>
            )}
            <Link href="/orders" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100">
              Orders
            </Link>
            <button
              type="button"
              onClick={clearCart}
              style={{ minHeight: '44px', paddingTop: '12px', paddingBottom: '12px' }}
              className="rounded-xl bg-red-500/85 px-4 py-2 text-sm font-semibold text-white"
            >
              Clear Cart
            </button>
          </div>
        </div>

        {maintenanceMode && (
          <div className="mb-4 rounded-lg border border-amber-300/40 bg-amber-500/10 p-3 text-sm text-amber-100">
            Maintenance mode is active. You can review cart items, but checkout is temporarily paused.
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-amber-50/90">Display currency:</span>
          {enabledDisplayCurrencies.includes('usd') && (
            <button
              type="button"
              onClick={() => setCurrency('usd')}
              style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }}
              className={`rounded-lg px-3 py-1 font-semibold ${displayCurrency === 'usd' ? 'bg-amber-300 text-slate-900' : 'bg-slate-800/70 text-amber-100'}`}
            >
              USD
            </button>
          )}
            {enabledDisplayCurrencies.includes('ntzs') && (
              <button
                type="button"
                onClick={() => setCurrency('ntzs')}
                style={{ minHeight: '44px' }}
                className={`rounded-lg px-3 py-1 font-semibold ${displayCurrency === 'ntzs' ? 'bg-cyan-200 text-slate-900' : 'bg-slate-800/70 text-amber-100'}`}
              >
                nTZS
              </button>
            )}
          {enabledDisplayCurrencies.includes('tzs') && (
            <button
              type="button"
              onClick={() => setCurrency('tzs')}
              style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }}
              className={`rounded-lg px-3 py-1 font-semibold ${displayCurrency === 'tzs' ? 'bg-amber-100 text-slate-900' : 'bg-slate-800/70 text-amber-100'}`}
            >
              TZS
            </button>
          )}
          {enabledDisplayCurrencies.includes('pi') && (
            <button
              type="button"
              onClick={() => setCurrency('pi')}
              style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }}
              className={`rounded-lg px-3 py-1 font-semibold ${displayCurrency === 'pi' ? 'bg-yellow-300 text-slate-900' : 'bg-slate-800/70 text-amber-100'}`}
            >
              PI
            </button>
          )}
        </div>

        {hasItems ? (
          <ShoppingCart
            items={items}
            displayCurrency={displayCurrency}
            language="en"
            onCartChange={handleCartChange}
            onProceedToCheckout={() => router.push('/checkout')}
          />
        ) : (
          <div className="rounded-2xl border border-white/20 bg-white/10 p-8 text-center global-glass">
            <p className="text-lg font-semibold text-amber-50">Your cart is currently empty.</p>
            <p className="mt-2 text-sm text-amber-50/85">Add products from product detail pages, then return here to continue checkout.</p>
            <Link href="/marketplace" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="mt-4 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900">
              Browse Marketplace
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
