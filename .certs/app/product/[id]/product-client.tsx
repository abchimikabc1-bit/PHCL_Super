"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useDisplayCurrency } from '@/hooks/use-display-currency';
import { addCartItem } from '@/lib/cart-storage';
import { getAdminSettings } from '@/lib/admin-settings';
import { canAddToCart, getStockStatus } from '@/lib/admin-product-stock';
import { getMarketplaceProductImage } from '@/lib/marketplace-products';
import { OptimizedImage } from '@/components/optimized-image';
import { PI_GCV_USD, USD_TO_TZS, convertAmount, formatCurrencyAmount } from '@/components/marketplace/currency-utils';

interface ProductClientProps {
  product: {
    id: number;
    name: string;
    description: string;
    priceUSD: number;
    category: string;
    image?: string;
    rating?: number;
    reviews?: number;
    seller?: string;
  };
}

export default function ProductClient({ product }: ProductClientProps) {
  const { displayCurrency, setCurrency, enabledDisplayCurrencies } = useDisplayCurrency('usd');
  const [addedToCart, setAddedToCart] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [stockStatus, setStockStatus] = useState<{
    label: string;
    color: string;
    enabled: boolean;
  }>({
    label: 'Checking availability...',
    color: 'gray',
    enabled: true,
  });

  useEffect(() => {
    const syncSettings = () => {
      const settings = getAdminSettings();
      setMaintenanceMode(settings.maintenanceMode);
    };

    syncSettings();
    window.addEventListener('storage', syncSettings);
    return () => window.removeEventListener('storage', syncSettings);
  }, []);

  useEffect(() => {
    const syncStockStatus = () => {
      setStockStatus(getStockStatus(String(product.id)));
    };

    syncStockStatus();
    window.addEventListener('storage', syncStockStatus);
    return () => window.removeEventListener('storage', syncStockStatus);
  }, [product.id]);

  const displayPrice = convertAmount(product.priceUSD, 'usd', displayCurrency);
  const usdPrice = product.priceUSD;
  const tzsPrice = usdPrice * USD_TO_TZS;
  const ntzsPrice = convertAmount(usdPrice, 'usd', 'ntzs');
  const piPrice = usdPrice / PI_GCV_USD;

  const handleAddToCart = () => {
    if (maintenanceMode) {
      toast.error('Storefront is in maintenance mode. Cart actions are temporarily paused.');
      return;
    }

    const stockCheck = canAddToCart(String(product.id), 1);
    if (!stockCheck.allowed) {
      toast.error(stockCheck.reason || 'Product is unavailable');
      return;
    }

    addCartItem({
      id: String(product.id),
      name: product.name,
      price: product.priceUSD,
      quantity: 1,
      image: getMarketplaceProductImage(product),
    });
    setAddedToCart(true);
    toast.success(`${product.name} added to cart`);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-900/60 via-emerald-700/50 to-lime-500/40 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.16),transparent_20%),radial-gradient(circle_at_bottom_center,rgba(134,239,172,0.18),transparent_26%)]" />
      <section className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-50">
              Premium Product View
            </div>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Product Details</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/marketplace" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="inline-flex min-h-11 items-center rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_14px_34px_rgba(251,191,36,0.24)] transition hover:-translate-y-0.5 hover:from-amber-200 hover:to-yellow-300">Back to Marketplace</Link>
            <Link href="/cart" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white">Cart</Link>
            <Link href="/checkout" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white">Checkout</Link>
            <Link href="/orders" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white">Orders</Link>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-white/20 bg-white/10 p-4 text-xs global-glass">
          <span className="text-amber-50/95">Display currency:</span>
          {enabledDisplayCurrencies.includes('usd') && (
            <button onClick={() => setCurrency('usd')} style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className={`inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-semibold transition ${displayCurrency === 'usd' ? 'bg-amber-300 text-slate-900 shadow-[0_0_18px_rgba(251,191,36,0.24)]' : 'bg-white/14 text-white hover:bg-white/20'}`}>USD</button>
          )}
          {enabledDisplayCurrencies.includes('tzs') && (
            <button onClick={() => setCurrency('tzs')} style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className={`inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-semibold transition ${displayCurrency === 'tzs' ? 'bg-amber-100 text-slate-900 shadow-[0_0_18px_rgba(255,255,255,0.18)]' : 'bg-white/14 text-white hover:bg-white/20'}`}>TZS</button>
          )}
            {enabledDisplayCurrencies.includes('ntzs') && (
            <button onClick={() => setCurrency('ntzs')} style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className={`inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-semibold transition ${displayCurrency === 'ntzs' ? 'bg-cyan-200 text-slate-900 shadow-[0_0_18px_rgba(103,232,249,0.24)]' : 'bg-white/14 text-white hover:bg-white/20'}`}>nTZS</button>
            )}
          {enabledDisplayCurrencies.includes('pi') && (
            <button onClick={() => setCurrency('pi')} style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className={`inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-semibold transition ${displayCurrency === 'pi' ? 'bg-yellow-300 text-slate-900 shadow-[0_0_18px_rgba(253,224,71,0.24)]' : 'bg-white/14 text-white hover:bg-white/20'}`}>PI</button>
          )}
          <span className="ml-2 rounded-full border border-amber-200/30 bg-amber-200/15 px-3 py-1 text-amber-50">
            GCV: 1 PI = ${PI_GCV_USD.toLocaleString('en-US')}
          </span>
        </div>

        <div className="rounded-3xl border border-white/20 bg-white/10 p-6 global-glass">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-4">
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/20 bg-white/10">
                <OptimizedImage
                  src={getMarketplaceProductImage(product)}
                  alt={product.name}
                  fill
                  category={product.category}
                  priority
                  className="object-cover"
                  containerClassName="h-full w-full"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-900/70 to-transparent p-3">
                  <p className="text-sm font-bold text-yellow-100">{product.category}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                <h2 className="text-2xl font-bold text-yellow-100 drop-shadow-[0_0_18px_rgba(253,224,71,0.24)]">{product.name}</h2>
                <p className="mt-2 text-white/95">{product.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-amber-200/30 bg-amber-200/15 px-3 py-1 text-amber-50">
                    Seller: {product.seller || 'PHCL Verified Merchant'}
                  </span>
                  <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-white">
                    Rating: {typeof product.rating === 'number' ? product.rating.toFixed(1) : '4.5'}
                    {typeof product.reviews === 'number' ? ` (${product.reviews} reviews)` : ''}
                  </span>
                </div>
              </div>
            </div>

            <div>
              {maintenanceMode && (
                <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 p-3 text-sm text-amber-100">
                  Maintenance mode is active. Add-to-cart is temporarily paused.
                </div>
              )}

              <div className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                stockStatus.color === 'green'
                  ? 'bg-green-500/20 text-green-300'
                  : stockStatus.color === 'amber'
                    ? 'bg-amber-500/20 text-amber-300'
                    : stockStatus.color === 'gray'
                      ? 'bg-slate-500/20 text-slate-200'
                      : 'bg-red-500/20 text-red-300'
              }`}>
                {stockStatus.label}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-amber-200/20 bg-amber-200/16 p-3 text-yellow-100 drop-shadow-[0_0_14px_rgba(253,224,71,0.2)]">USD: ${usdPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                <div className="rounded-xl border border-white/20 bg-white/14 p-3 text-yellow-100 drop-shadow-[0_0_14px_rgba(253,224,71,0.2)]">TZS: TSh {tzsPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                <div className="rounded-xl border border-cyan-200/20 bg-cyan-200/12 p-3 text-cyan-100 drop-shadow-[0_0_14px_rgba(103,232,249,0.2)]">nTZS: nTSh {ntzsPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                <div className="rounded-xl border border-lime-200/20 bg-lime-200/16 p-3 text-yellow-100 drop-shadow-[0_0_14px_rgba(253,224,71,0.2)]">PI: Π {piPrice.toFixed(8)}</div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/20 bg-white/12 p-4">
                <p className="text-sm text-yellow-100/90">Selected price</p>
                <p className="mt-1 text-2xl font-black text-yellow-100 drop-shadow-[0_0_18px_rgba(253,224,71,0.24)]">{formatCurrencyAmount(displayCurrency, displayPrice)}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={maintenanceMode || !stockStatus.enabled}
                  style={{ minHeight: '44px', paddingTop: '12px', paddingBottom: '12px' }}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    maintenanceMode || !stockStatus.enabled
                      ? 'cursor-not-allowed bg-white/15 text-white/60'
                      : 'bg-gradient-to-r from-amber-300 to-yellow-400 text-slate-900'
                  }`}
                >
                  {maintenanceMode
                    ? 'Temporarily Disabled'
                    : !stockStatus.enabled
                      ? 'Out of Stock'
                      : addedToCart
                        ? 'Added to Cart'
                        : 'Add to Cart'}
                </button>
                <Link href="/cart" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white">View Cart</Link>
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-white/85">Pi conversion rate: 1 PI = ${PI_GCV_USD.toLocaleString('en-US')} GCV</p>
        </div>
      </section>
    </main>
  );
}
