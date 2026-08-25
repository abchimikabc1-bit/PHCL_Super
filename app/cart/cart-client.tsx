'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { convertAmount, formatCurrencyAmount } from '@/components/currency';
import { ShoppingCart } from '@/components/shopping-cart';
import { useCommerceSnapshot } from '@/hooks/use-commerce-snapshot';
import { useCommerceBootstrap } from '@/hooks/use-commerce-bootstrap';
import { useDisplayCurrency } from '@/hooks/use-display-currency';
import { getAdminSettings } from '@/lib/admin-settings';
import { getCartTotal } from '@/lib/cart-utils';
import { CART_UPDATED_EVENT, CartStorageItem, getCartItems, setCartItems } from '@/lib/cart-storage';
import { reconcileCartItemsWithStock } from '@/lib/cart-stock-reconcile'; // Uagizaji uliosahihishwa
import { useLanguage } from '@/hooks/use-language';

export default function CartClient() {
  const router = useRouter();
  const { language } = useLanguage();
  const isSw = language === 'sw';
  const [items, setItems] = useState<CartStorageItem[]>([]);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const { snapshot } = useCommerceSnapshot();
  
  const hasItems = useMemo(() => items.length > 0, [items]);
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const subtotalUsd = useMemo(() => getCartTotal(items), [items]);
  const estimatedTaxUsd = useMemo(() => subtotalUsd * 0.08, [subtotalUsd]);
  const estimatedGrandTotalUsd = useMemo(() => subtotalUsd + estimatedTaxUsd, [subtotalUsd, estimatedTaxUsd]);
  const { displayCurrency, setCurrency, enabledDisplayCurrencies } = useDisplayCurrency('usd');

  const copy = isSw
    ? {
        title: 'Kikapu cha Manunuzi (Cart)',
        subtitle: 'Kagua bidhaa zako, fanya mabadiliko ya idadi, na uendelee kwenye malipo.',
        backToCatalog: 'Rudi Marketplace',
        checkoutPaused: 'Malipo Yasitishwa',
        goToCheckout: 'Nenda Kwenye Malipo',
        orders: 'Orodha ya Oda',
        clearCart: 'Safisha Kikapu',
        maintenance: 'Mfumo upo kwenye matengenezo. Malipo yamesitishwa kwa sasa na usimamizi.',
        pieces: 'Vipande vya Kikapu',
        subtotal: 'Jumla ya Bidhaa',
        estimatedTotal: 'Makadirio ya Jumla',
        emptyTitle: 'Kikapu chako kipo tupu kwa sasa.',
        emptyBody: 'Ongeza bidhaa kutoka kwenye soko letu kwanza, kisha urudi hapa kukamilisha.',
        browse: 'Fungua Soko la Bidhaa',
      }
    : {
        title: 'Shopping Cart',
        subtitle: 'Review items, adjust quantities, and continue to checkout.',
        backToCatalog: 'Back to Marketplace',
        checkoutPaused: 'Checkout Paused',
        goToCheckout: 'Go to Checkout',
        orders: 'Orders',
        clearCart: 'Clear Cart',
        maintenance: 'Maintenance mode is active. You can review items, but checkout is temporarily paused.',
        pieces: 'Cart pieces',
        subtotal: 'Subtotal',
        estimatedTotal: 'Estimated total',
        emptyTitle: 'Your cart is currently empty.',
        emptyBody: 'Add products from the marketplace first, then return here to complete checkout.',
        browse: 'Browse Marketplace',
      };

  useEffect(() => {
    if (!snapshot) return;
    const reconciled = reconcileCartItemsWithStock(snapshot.cartItems);
    setItems(reconciled.items);
  }, [snapshot]);

  useCommerceBootstrap(() => {
    const syncCart = () => {
      const current = getCartItems();
      const reconciled = reconcileCartItemsWithStock(current);
      if (reconciled.changes.length > 0) {
        setCartItems(reconciled.items);
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
      const settings = snapshot?.adminSettings ?? getAdminSettings();
      setMaintenanceMode(settings.maintenanceMode);
    };
    syncSettings();
    window.addEventListener('storage', syncSettings);
    return () => window.removeEventListener('storage', syncSettings);
  }, [snapshot]);

  const handleCartChange = (nextItems: CartStorageItem[]) => {
    const reconciled = reconcileCartItemsWithStock(nextItems);
    setItems(reconciled.items);
    setCartItems(reconciled.items);
  };

  const clearCart = () => {
    setItems([]);
    setCartItems([]);
    toast.success(isSw ? 'Kikapu kimesafishwa!' : 'Cart cleared');
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-9No response
// === ENDELEA NAKILI KUANZIA MSTARI ULIPOKATIKA HAPA ===
bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_26%),radial-gradient(circle_at_bottom_center,rgba(245,158,11,0.12),transparent_25%)]" />

      <section className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black sm:text-4xl">{isSw ? 'Kikapu cha Manunuzi' : 'Shopping Cart'}</h1>
            <p className="mt-2 text-sm text-amber-50/85 sm:text-base">
              {isSw ? 'Kagua bidhaa zako, fanya marekebisho, na uendelee kwenye malipo.' : 'Review items, apply promo discounts, and continue to checkout.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/marketplace" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100">
              {isSw ? 'Rudi Sokoni' : 'Back to Marketplace'}
            </Link>
            {maintenanceMode ? (
              <button
                type="button"
                style={{ minHeight: '44px', paddingTop: '8px', paddingBottom: '8px' }}
                className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 cursor-not-allowed"
              >
                {isSw ? 'Malipo Yamesitishwa' : 'Checkout Paused'}
              </button>
            ) : (
              <Link href="/checkout" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900">
                {isSw ? 'Nenda Kwenye Malipo' : 'Go to Checkout'}
              </Link>
            )}
            <Link href="/orders" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100">
              {isSw ? 'Orodha ya Oda' : 'Orders'}
            </Link>
            <button
              type="button"
              onClick={clearCart}
              style={{ minHeight: '44px', paddingTop: '12px', paddingBottom: '12px' }}
              className="rounded-xl bg-red-500/85 px-4 py-2 text-sm font-semibold text-white"
            >
              {isSw ? 'Safisha Kikapu' : 'Clear Cart'}
            </button>
          </div>
        </div>

        {maintenanceMode && (
          <div className="mb-4 rounded-lg border border-amber-300/40 bg-amber-500/10 p-3 text-sm text-amber-100">
            {isSw ? 'Hali ya matengenezo imewashwa. Unaweza kukagua kikapu chako, lakini malipo yamesitishwa kwa sasa.' : 'Maintenance mode is active. You can review cart items, but checkout is temporarily paused.'}
          </div>
        )}

        {hasItems && (
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-amber-200/15 bg-slate-900/45 p-4 global-glass">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-50/70">{isSw ? 'Idadi ya Bidhaa' : 'Cart pieces'}</p>
              <p className="mt-2 text-2xl font-black text-white">{itemCount}</p>
              <p className="mt-1 text-xs text-amber-50/70">{isSw ? `${items.length} aina tofauti za bidhaa` : `${items.length} unique product line(s)`}</p>
            </div>
            <div className="rounded-2xl border border-amber-200/15 bg-slate-900/45 p-4 global-glass">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-50/70">{isSw ? 'Jumla ya Bei' : 'Subtotal'}</p>
              <p className="mt-2 text-2xl font-black text-white">
                {formatCurrencyAmount(displayCurrency, convertAmount(subtotalUsd, 'usd', displayCurrency))}
              </p>
              <p className="mt-1 text-xs text-amber-50/70">{isSw ? 'kabla ya kodi na punguzo' : 'before discounts and tax'}</p>
            </div>
            <div className="rounded-2xl border border-amber-200/15 bg-slate-900/45 p-4 global-glass">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-50/70">{isSw ? 'Makadirio ya Jumla' : 'Estimated total'}</p>
              <p className="mt-2 text-2xl font-black text-white">
                {formatCurrencyAmount(displayCurrency, convertAmount(estimatedGrandTotalUsd, 'usd', displayCurrency))}
              </p>
              <p className="mt-1 text-xs text-amber-50/70">
                {isSw ? `pamoja na kodi ya ${formatCurrencyAmount(displayCurrency, convertAmount(estimatedTaxUsd, 'usd', displayCurrency))}` : `includes estimated tax of ${formatCurrencyAmount(displayCurrency, convertAmount(estimatedTaxUsd, 'usd', displayCurrency))}`}
              </p>
            </div>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-amber-50/90">{isSw ? 'Sarafu ya kuonyesha:' : 'Display currency:'}</span>
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
            language={isSw ? 'sw' : 'en'}
            onCartChange={handleCartChange}
            onProceedToCheckout={() => router.push('/checkout')}
          />
        ) : (
          <div className="rounded-2xl border border-white/20 bg-white/10 p-8 text-center global-glass">
            <p className="text-lg font-semibold text-amber-50">{isSw ? 'Kikapu chako kipo tupu kwa sasa.' : 'Your cart is currently empty.'}</p>
            <p className="mt-2 text-sm text-amber-50/85">{isSw ? 'Ongeza bidhaa kutoka kwenye soko letu kwanza, kisha urudi hapa kuendelea na malipo.' : 'Add products from product detail pages, then return here to continue checkout.'}</p>
            <Link href="/marketplace" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="mt-4 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900">
              {isSw ? 'Fungua Soko' : 'Browse Marketplace'}
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
