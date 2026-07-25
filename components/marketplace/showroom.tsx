'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MARKETPLACE_PRODUCTS, 
  MarketplaceProduct, 
  getMarketplaceProductImage 
} from '../../lib/marketplace-products'; // Njia sahihi iliyosafishwa hapa!

export default function Showroom() {
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  // Panga bidhaa kwa kategoria (Categories)
  const categories = Array.from(
    new Set(MARKETPLACE_PRODUCTS.map((product) => product.category))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-8">
      {/* Showroom Header */}
      <div className="max-w-7xl mx-auto mb-12 text-center space-y-3">
        <span className="inline-block bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
          Official Showroom
        </span>
        <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500">
          PHCL Super Marketplace
        </h1>
        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
          Peruzi bidhaa zote za kipekee kwenye Showroom yetu. Telezesha (slide) kushoto/kulia au bonyeza bidhaa kuangalia kwa karibu (Zoom In/Out).
        </p>
      </div>

      {/* Categories Sliders */}
      <div className="max-w-7xl mx-auto space-y-14">
        {categories.map((category) => {
          const categoryProducts = MARKETPLACE_PRODUCTS.filter(
            (p) => p.category === category
          );

          return (
            <CategoryRow
              key={category}
              category={category}
              products={categoryProducts}
              onSelectProduct={(product) => {
                setSelectedProduct(product);
                setIsZoomed(false);
              }}
            />
          );
        })}
      </div>

      {/* Modern Zoom Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setSelectedProduct(null);
              setIsZoomed(false);
            }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl relative"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setIsZoomed(false);
                }}
                className="absolute top-4 right-4 z-20 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center transition border border-slate-700"
              >
                ✕
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Image Section with Interactive Zoom */}
                <div className="relative bg-slate-950 flex items-center justify-center overflow-hidden min-h-[320px] select-none">
                  <motion.img
                    src={selectedProduct.image || getMarketplaceProductImage(selectedProduct)}
                    alt={selectedProduct.name}
                    animate={{ scale: isZoomed ? 1.85 : 1 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getMarketplaceProductImage(selectedProduct);
                    }}
                    className="w-full h-full object-cover cursor-zoom-in"
                    onClick={() => setIsZoomed(!isZoomed)}
                  />
                  
                  {/* Zoom Badge Indicator */}
                  <button
                    onClick={() => setIsZoomed(!isZoomed)}
                    className="absolute bottom-4 right-4 bg-slate-900/90 text-xs text-amber-400 px-3 py-1.5 rounded-full backdrop-blur-sm border border-amber-500/30 font-semibold hover:bg-amber-500 hover:text-slate-950 transition shadow-lg"
                  >
                    {isZoomed ? '🔍 Zoom Out (-)' : '🔍 Zoom In (+)'}
                  </button>
                </div>

                {/* Details Section */}
                <div className="p-6 sm:p-8 flex flex-col justify-between">
                  <div>
                    <span className="inline-block bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                      {selectedProduct.category}
                    </span>
                    <h2 className="text-2xl font-bold text-white mb-2 leading-tight">
                      {selectedProduct.name}
                    </h2>
                    <p className="text-amber-400 font-extrabold text-3xl mb-4">
                      ${selectedProduct.priceUSD.toLocaleString()}
                    </p>
                    <p className="text-slate-300 text-sm leading-relaxed mb-6">
                      {selectedProduct.description}
                    </p>
                  </div>

                  <div className="border-t border-slate-800 pt-4 space-y-2 text-xs text-slate-400">
                    <p>🏬 <strong className="text-slate-200">Muuzaji:</strong> {selectedProduct.seller}</p>
                    <p>⭐ <strong className="text-slate-200">Rating:</strong> {selectedProduct.rating} ({selectedProduct.reviews} reviews)</p>
                    <p>📦 <strong className="text-slate-200">Hali:</strong> {selectedProduct.inStock ? 'Zipo Stokini ✅' : 'Zimeisha ❌'}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Category Row Component (Horizontal Slider)
function CategoryRow({
  category,
  products,
  onSelectProduct,
}: {
  category: string;
  products: MarketplaceProduct[];
  onSelectProduct: (product: MarketplaceProduct) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
          <span className="w-2.5 h-6 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full inline-block"></span>
          {category}
        </h2>

        {/* Scroll Control Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2.5 rounded-full bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800 text-slate-300 hover:text-amber-400 transition"
            title="Slide Kushoto"
          >
            ◀
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2.5 rounded-full bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800 text-slate-300 hover:text-amber-400 transition"
            title="Slide Kulia"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Horizontal Slider */}
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto scrollbar-none scroll-smooth pb-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map((product) => (
          <motion.div
            key={product.id}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            onClick={() => onSelectProduct(product)}
            className="flex-none w-72 bg-slate-900 border border-slate-800/90 rounded-2xl overflow-hidden cursor-pointer hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/5 transition group snap-start flex flex-col justify-between"
          >
            <div>
              <div className="h-48 bg-slate-950 overflow-hidden relative">
                <img
                  src={product.image || getMarketplaceProductImage(product)}
                  alt={product.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getMarketplaceProductImage(product);
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute top-2.5 right-2.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-amber-400 border border-slate-800">
                  ${product.priceUSD.toLocaleString()}
                </div>
              </div>

              <div className="p-4 space-y-2">
                <h3 className="font-bold text-slate-100 line-clamp-1 group-hover:text-amber-400 transition">
                  {product.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {product.description}
                </p>
              </div>
            </div>

            <div className="p-4 pt-0">
              <div className="flex items-center justify-between pt-3 text-xs text-slate-500 border-t border-slate-800/80">
                <span>⭐ {product.rating}</span>
                <span className="text-amber-400 font-semibold group-hover:underline flex items-center gap-1">
                  Angalia / Zoom 🔍
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
