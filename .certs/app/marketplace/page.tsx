"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getMarketplaceProductImage, MARKETPLACE_PRODUCTS } from '@/lib/marketplace-products';
import { toast } from 'sonner';
import { CART_UPDATED_EVENT, CartStorageItem, addCartItem, getCartItemCount, getCartItems, getCartTotal } from '@/lib/cart-storage';
import { convertAmount, formatCurrencyAmount, PI_GCV_USD } from '@/components/marketplace/currency-utils';
import { useDisplayCurrency } from '@/hooks/use-display-currency';
import { getAdminSettings } from '@/lib/admin-settings';
import { canAddToCart, getStockStatus } from '@/lib/admin-product-stock';
import { OptimizedImage } from '@/components/optimized-image';
import { shouldPriorityLoad, IMAGE_SIZES } from '@/lib/image-optimizer';

export default function MarketplacePage() {
  const { displayCurrency, setCurrency, enabledDisplayCurrencies } = useDisplayCurrency('usd');
  const [addedItemId, setAddedItemId] = useState<number | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState<CartStorageItem[]>([]);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [cardsPerPage, setCardsPerPage] = useState(6);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(999999);
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const categories = ['All', ...new Set(MARKETPLACE_PRODUCTS.map((item) => item.category))];
  const filteredProducts =
    activeCategory === 'All'
      ? MARKETPLACE_PRODUCTS
      : MARKETPLACE_PRODUCTS.filter((item) => item.category === activeCategory);
  
  const searchFilteredProducts = filteredProducts.filter((item) => {
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPrice = item.priceUSD >= minPrice && item.priceUSD <= maxPrice;
    const matchesRating = item.rating >= minRating;
    
    return matchesSearch && matchesPrice && matchesRating;
  });

  const totalPages = Math.max(1, Math.ceil(searchFilteredProducts.length / cardsPerPage));
  const visibleProducts = searchFilteredProducts.slice(page * cardsPerPage, (page + 1) * cardsPerPage);
  
  const allPrices = MARKETPLACE_PRODUCTS.map(p => p.priceUSD);
  const maxAvailablePrice = Math.max(...allPrices);

  useEffect(() => {
    const syncCartCount = () => {
      const items = getCartItems();
      setCartItems(items);
      setCartCount(getCartItemCount(items));
    };

    syncCartCount();
    window.addEventListener(CART_UPDATED_EVENT, syncCartCount);
    window.addEventListener('storage', syncCartCount);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncCartCount);
      window.removeEventListener('storage', syncCartCount);
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

  useEffect(() => {
    const syncCardsPerPage = () => {
      if (window.innerWidth >= 1280) {
        setCardsPerPage(4);
        setIsMobile(false);
        return;
      }

      if (window.innerWidth >= 768) {
        setCardsPerPage(2);
        setIsMobile(false);
        return;
      }

      setCardsPerPage(1);
      setIsMobile(true);
    };

    syncCardsPerPage();
    window.addEventListener('resize', syncCardsPerPage);
    return () => window.removeEventListener('resize', syncCardsPerPage);
  }, []);

  useEffect(() => {
    setPage(0);
  }, [activeCategory, cardsPerPage, searchQuery, minPrice, maxPrice, minRating]);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  const handleAddToCart = (item: (typeof MARKETPLACE_PRODUCTS)[number]) => {
    if (maintenanceMode) {
      toast.error('Storefront is in maintenance mode. Cart actions are temporarily paused.');
      return;
    }

    // Check product stock
    const stockCheck = canAddToCart(String(item.id), 1);
    if (!stockCheck.allowed) {
      toast.error(stockCheck.reason || 'Product is unavailable');
      return;
    }

    const next = addCartItem({
      id: String(item.id),
      name: item.name,
      price: item.priceUSD,
      quantity: 1,
      image: getMarketplaceProductImage(item),
    });
    setAddedItemId(item.id);
    setCartCount(getCartItemCount(next));
    toast.success(`${item.name} added to cart`);
  };

  // Render star rating component
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rating ? 'text-yellow-400' : 'text-slate-600'}>
            ⭐
          </span>
        ))}
        <span className="text-xs text-amber-100/80 ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_22%),radial-gradient(circle_at_bottom_center,rgba(245,158,11,0.12),transparent_25%)]" />
      <section className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-amber-300/30 bg-amber-200/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100">
              Global Commerce
            </div>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">PHCL Marketplace</h1>
            <p className="mt-2 max-w-2xl text-sm text-amber-50/85 sm:text-base">
              Discover premium listings, compare prices across accepted currencies, and move from browsing to checkout faster.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="inline-flex min-h-11 items-center rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_16px_36px_rgba(251,191,36,0.24)] transition hover:-translate-y-0.5 hover:from-amber-200 hover:to-yellow-300">
              Back Home
            </Link>
            <Link href="/cart" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100">
              Cart ({cartCount})
            </Link>
            <Link href="/checkout" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100">
              Checkout
            </Link>
            <Link href="/orders" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100">
              Orders
            </Link>
          </div>
        </div>

        {cartCount > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-200/20 bg-slate-900/45 p-4 global-glass">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-amber-100">Mini Cart: {cartCount} item(s)</p>
              <p className="text-sm text-yellow-200">
                Subtotal: {formatCurrencyAmount(displayCurrency, convertAmount(getCartTotal(cartItems), 'usd', displayCurrency))}
              </p>
            </div>
            <div className="mt-3 space-y-2 text-xs text-amber-50/85">
              {cartItems.slice(0, 3).map((entry) => (
                <p key={entry.id}>{entry.name} x{entry.quantity}</p>
              ))}
              {cartItems.length > 3 && <p>+ {cartItems.length - 3} more item(s)</p>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/cart" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100">Open Cart</Link>
              <Link href="/checkout" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900">Checkout Now</Link>
            </div>
          </div>
        )}

        {maintenanceMode && (
          <div className="mb-6 rounded-xl border border-amber-300/40 bg-amber-500/10 p-3 text-sm text-amber-100">
            Maintenance mode is active. Browsing remains available, but add-to-cart and checkout actions are paused.
          </div>
        )}

        <div className="mb-8 rounded-2xl border border-amber-200/15 bg-slate-900/45 p-4 sm:p-5 global-glass">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Display currency</p>
              <p className="text-xs text-amber-50/80">Switch between USD, TZS, nTZS, and PI without leaving the catalog.</p>
            </div>
            <span className="rounded-full border border-amber-300/30 bg-amber-500/20 px-3 py-1 text-xs text-amber-50 ink-soft">
              GCV: 1 PI = ${PI_GCV_USD.toLocaleString('en-US')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-amber-50/90">Display currency:</span>
            {enabledDisplayCurrencies.includes('usd') && (
              <button
                type="button"
                onClick={() => setCurrency('usd')}
                style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }}
                className={`inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-semibold transition ${displayCurrency === 'usd' ? 'bg-amber-300 text-slate-900 shadow-[0_0_18px_rgba(251,191,36,0.25)]' : 'bg-slate-800/70 text-amber-100 hover:bg-slate-700'}`}
              >
                USD
              </button>
            )}
            {enabledDisplayCurrencies.includes('tzs') && (
              <button
                type="button"
                onClick={() => setCurrency('tzs')}
                style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }}
                className={`inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-semibold transition ${displayCurrency === 'tzs' ? 'bg-amber-100 text-slate-900 shadow-[0_0_18px_rgba(255,255,255,0.18)]' : 'bg-slate-800/70 text-amber-50 hover:bg-slate-700'}`}
              >
                TZS
              </button>
            )}
            {enabledDisplayCurrencies.includes('ntzs') && (
              <button
                type="button"
                onClick={() => setCurrency('ntzs')}
                style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }}
                className={`inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-semibold transition ${displayCurrency === 'ntzs' ? 'bg-cyan-200 text-slate-900 shadow-[0_0_18px_rgba(103,232,249,0.24)]' : 'bg-slate-800/70 text-amber-50 hover:bg-slate-700'}`}
              >
                nTZS
              </button>
            )}
            {enabledDisplayCurrencies.includes('pi') && (
              <button
                type="button"
                onClick={() => setCurrency('pi')}
                style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }}
                className={`inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-semibold transition ${displayCurrency === 'pi' ? 'bg-yellow-300 text-slate-900 shadow-[0_0_18px_rgba(253,224,71,0.24)]' : 'bg-slate-800/70 text-amber-100 hover:bg-slate-700'}`}
              >
                PI
              </button>
            )}
          </div>
        </div>

        {/* Search & Advanced Filters */}
        <div className="mb-6 rounded-2xl border border-amber-200/15 bg-slate-900/45 p-4 sm:p-5 global-glass">
          <div className="mb-4">
            <label className="text-sm font-semibold text-white">Search Marketplace</label>
            <input
              type="text"
              placeholder="Search by product name, category, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ minHeight: '44px' }}
              className="mt-2 w-full rounded-lg border border-amber-200/20 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder-amber-50/60 transition focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/30"
            />
          </div>

          {isMobile && (
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              style={{ minHeight: '44px' }}
              className="mb-4 w-full rounded-lg bg-amber-300/20 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/30"
            >
              {showFilters ? '▼ Hide Filters' : '▶ Show Filters'}
            </button>
          )}

          <div className={`grid grid-cols-1 gap-4 sm:grid-cols-3 ${isMobile && !showFilters ? 'hidden' : ''}`}>
            <div>
              <label className="text-xs font-semibold text-amber-100">Price Range (USD)</label>
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice === 0 ? '' : minPrice}
                  onChange={(e) => setMinPrice(e.target.value === '' ? 0 : parseInt(e.target.value))}
                  style={{ minHeight: '44px' }}
                  className="w-full rounded-lg border border-amber-200/20 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-amber-50/60 focus:border-amber-300 focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice === 999999 ? '' : maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value === '' ? 999999 : parseInt(e.target.value))}
                  style={{ minHeight: '44px' }}
                  className="w-full rounded-lg border border-amber-200/20 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-amber-50/60 focus:border-amber-300 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-amber-100">Minimum Rating</label>
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(parseFloat(e.target.value))}
                  style={{ minHeight: '44px' }}
                  className="w-full rounded-lg border border-amber-200/20 bg-slate-800/80 px-3 py-2 text-xs text-white focus:border-amber-300 focus:outline-none"
                >
                  <option value="0">All Ratings</option>
                  <option value="3">⭐ 3.0+</option>
                  <option value="3.5">⭐ 3.5+</option>
                  <option value="4">⭐ 4.0+</option>
                  <option value="4.5">⭐ 4.5+</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-amber-100">Results Found</label>
              <div className="mt-2 flex items-center rounded-lg border border-amber-200/20 bg-amber-500/10 px-3 py-2" style={{ minHeight: '44px' }}>
                <p className="text-sm font-bold text-amber-100">{searchFilteredProducts.length}</p>
                <p className="ml-2 text-xs text-amber-50/80">of {MARKETPLACE_PRODUCTS.length} products</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-amber-200/15 bg-slate-900/45 p-4 sm:p-5 global-glass">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Catalog Deck</p>
              <p className="text-xs text-amber-50/80">Showing {visibleProducts.length} of {searchFilteredProducts.length} products</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={page === 0}
                className="rounded-lg bg-slate-800/80 px-3 py-2 text-sm font-semibold text-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                Slide {page + 1} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg bg-slate-800/80 px-3 py-2 text-sm font-semibold text-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          <div className={`mt-4 flex flex-wrap gap-2 ${isMobile ? 'justify-center' : ''}`}>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                style={{ minHeight: '44px' }}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                  activeCategory === category
                    ? 'bg-amber-300 text-slate-900'
                    : 'bg-slate-800/80 text-amber-100 hover:bg-slate-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {searchFilteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-amber-200/20 bg-slate-900/45 p-12 text-center global-glass">
            <p className="text-lg font-semibold text-amber-100">No products found</p>
            <p className="mt-2 text-sm text-amber-50/70">Try adjusting your search filters or category selection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((item) => {
              const status = getStockStatus(String(item.id));
              return (
                <div
                  key={item.id}
                  className="group relative overflow-hidden rounded-2xl border border-amber-200/15 bg-gradient-to-b from-slate-900/60 to-slate-900/45 transition duration-300 hover:-translate-y-1.5 hover:border-amber-300/40 hover:bg-slate-900/70 hover:shadow-[0_20px_50px_rgba(251,191,36,0.18)] global-glass"
                >
                  {/* Stock Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${
                      status.color === 'green' ? 'bg-green-500/30 text-green-200 border border-green-400/50' : 
                      status.color === 'amber' ? 'bg-amber-500/30 text-amber-200 border border-amber-400/50' : 
                      'bg-red-500/30 text-red-200 border border-red-400/50'
                    }`}>
                      <span>{status.color === 'green' ? '✓' : status.color === 'amber' ? '!' : '✕'}</span>
                      {status.label}
                    </div>
                  </div>

                  <Link href={`/product/${item.id}`} className="block">
                    <div className="relative aspect-video overflow-hidden bg-slate-800">
                      <OptimizedImage
                        src={getMarketplaceProductImage(item)}
                        alt={item.name}
                        fill
                        category={item.category}
                        priority={shouldPriorityLoad(visibleProducts.indexOf(item), cardsPerPage)}
                        sizes={IMAGE_SIZES.PRODUCT_GRID}
                        className="object-cover transition duration-300 group-hover:scale-105"
                        containerClassName="w-full h-full"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent p-3">
                        <p className="line-clamp-1 text-sm font-bold text-yellow-100">{item.name}</p>
                        <p className="mt-0.5 text-xs text-amber-200/90">{item.category}</p>
                      </div>
                    </div>
                  </Link>

                  <div className="p-4">
                    {/* Stars & Description */}
                    <div className="mb-3">
                      {renderStars(item.rating)}
                      <p className="mt-2 line-clamp-2 text-xs text-amber-50/70">{item.description}</p>
                    </div>

                    {/* Pricing */}
                    <div className="mb-3 rounded-lg border border-amber-200/20 bg-amber-500/10 p-3">
                      <p className="text-xs text-amber-100/80">Current Price</p>
                      <p className="mt-1 text-base font-bold text-yellow-200">
                        {formatCurrencyAmount(displayCurrency, convertAmount(item.priceUSD, 'usd', displayCurrency))}
                      </p>
                      <p className="mt-1 text-xs text-amber-100/60">≈ ${item.priceUSD.toLocaleString('en-US')} USD</p>
                    </div>

                    {/* Seller Info */}
                    <div className="mb-4 rounded-lg border border-slate-700/50 bg-slate-800/40 p-2.5">
                      <p className="text-xs font-semibold text-amber-100">{item.seller}</p>
                      <p className="mt-1 text-xs text-slate-400">Seller Rating: {item.rating.toFixed(1)} ⭐</p>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      type="button"
                      onClick={() => handleAddToCart(item)}
                      disabled={maintenanceMode || !status.enabled}
                      style={{ minHeight: '44px' }}
                      className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                        maintenanceMode || !status.enabled
                          ? 'bg-slate-700 text-slate-300 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-amber-300 to-yellow-400 text-slate-900 hover:from-amber-200 hover:to-yellow-300 active:scale-95'
                      }`}
                    >
                      {maintenanceMode ? 'Temporarily Disabled' : !status.enabled ? 'Out of Stock' : addedItemId === item.id ? '✓ Added to Cart' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
