'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getUserProfile, UserProfile } from '@/lib/user-profile';
import { getMarketplaceProductImage, MARKETPLACE_PRODUCTS } from '@/lib/marketplace-products';
import { toast } from 'sonner';
import { CART_UPDATED_EVENT, addCartItem, getCartItemCount, getCartItems, getCartTotal } from '@/lib/cart-storage';
import { convertAmount, formatCurrencyAmount, PI_GCV_USD } from '@/components/currency';
import { useDisplayCurrency } from '@/hooks/use-display-currency';
import { getAdminSettings } from '@/lib/admin-settings';
import { canAddToCart, getStockStatus } from '@/lib/admin-product-stock';
import { OptimizedImage } from '@/components/optimized-image';

export default function MarketplacePage() {
  const { displayCurrency, setCurrency, enabledDisplayCurrencies } = useDisplayCurrency('usd');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // KUSIKILIZA AUTH NA KUPAKIA SALIO LA FIRESTORE (LIVE)
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const uProfile = await getUserProfile(user.uid);
        setProfile(uProfile);
      } else {
        setProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // KUSIKILIZA KIKAPU (CART)
  useEffect(() => {
    const syncCart = () => setCartCount(getCartItemCount(getCartItems()));
    syncCart();
    window.addEventListener(CART_UPDATED_EVENT, syncCart);
    return () => window.removeEventListener(CART_UPDATED_EVENT, syncCart);
  }, []);

  const categories = ['All', ...new Set(MARKETPLACE_PRODUCTS.map(p => p.category))];
  
  const filteredProducts = useMemo(() => {
    return MARKETPLACE_PRODUCTS.filter(p => {
      const matchesCat = activeCategory === 'All' || p.category === activeCategory;
      const matchesSearch = searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    }).map(p => ({ item: p, status: getStockStatus(String(p.id)) }));
  }, [activeCategory, searchQuery]);

  const handleAddToCart = (item: any) => {
    if (maintenanceMode) return toast.error('Maintenance mode is active.');
    const check = canAddToCart(String(item.id), 1);
    if (!check.allowed) return toast.error(check.reason || 'Unavailable');
    const next = addCartItem({ id: String(item.id), name: item.name, price: item.priceUSD, quantity: 1, image: getMarketplaceProductImage(item) });
    setCartCount(getCartItemCount(next));
    toast.success(`${item.name} added to cart!`);
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] text-white p-6 pb-24">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">PHCL Marketplace</h1>
            <p className="text-xs text-amber-50/80">Premium multi-currency commerce platform</p>
          </div>
          <div className="flex gap-2">
            <Link href="/" className="rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2 text-xs font-bold text-slate-900">Nyumbani</Link>
            <Link href="/cart" className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-amber-100">Kikapu ({cartCount})</Link>
          </div>
        </div>

        {/* PROFILE BALANCES HEADER */}
        {profile && (
          <div className="rounded-2xl border border-amber-500/20 bg-slate-950/60 p-4 shadow-lg flex items-center justify-between gap-4 flex-wrap text-xs">
            <div>
              <p className="font-bold text-amber-200">Karibu, {profile.fullName}</p>
              <p className="text-[10px] text-gray-400">Akaunti: {profile.tier === 'regular' ? 'Tier 1' : profile.tier === 'small_business' ? 'Tier 2' : 'Tier 3'}</p>
            </div>
            <div className="flex gap-3 font-semibold text-amber-100">
              <span>USD: ${profile.balances?.usd || 0}</span>
              <span>TZS: {profile.balances?.tzs || 0} TZS</span>
              <span>Pi: {profile.balances?.pi || 0} PI</span>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 space-y-4">
          <input type="text" placeholder="Tafuta bidhaa..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-lg bg-slate-800 p-3 h-11 text-sm text-white focus:outline-none focus:border-amber-300" />
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <button key={c} onClick={() => setActiveCategory(c)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${activeCategory === c ? 'bg-amber-300 text-slate-900' : 'bg-slate-800 text-amber-100'}`}>{c}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map(({ item, status }) => (
            <div key={item.id} className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 space-y-4 flex flex-col justify-between">
              <div className="relative aspect-video bg-slate-800 rounded-lg overflow-hidden">
                <OptimizedImage src={getMarketplaceProductImage(item)} alt={item.name} fill className="object-cover" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-yellow-100">{item.name}</h3>
                <p className="text-xs text-gray-400 line-clamp-2">{item.description}</p>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-3 border border-amber-200/10 text-xs">
                <p className="text-gray-400">Price</p>
                <p className="text-sm font-bold text-yellow-200">{formatCurrencyAmount(displayCurrency, convertAmount(item.priceUSD, 'usd', displayCurrency))}</p>
              </div>
              <button onClick={() => handleAddToCart(item)} disabled={!status.enabled} className="w-full rounded-xl bg-amber-300 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-50">
                {!status.enabled ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
