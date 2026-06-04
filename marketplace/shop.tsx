'use client';

import { useState } from 'react';
import { products } from './products-data';
import { getCurrencyColor } from './currency-utils';
import { ProductPhoneGallery } from '@/components/products/phone-gallery';
import { X } from 'lucide-react';

interface ShopProps {
  darkMode: boolean;
  onAddToCart: (product: any) => void;
}

export function Shop({ darkMode, onAddToCart }: ShopProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPhoneProduct, setSelectedPhoneProduct] = useState<any>(null);

  // Categorize products
  const vehicleCategories = ['car', 'truck', 'trailer', 'tipper', 'tractor', 'bus', 'motorcycle', 'equipment'];
  const materialCategories = ['material'];
  const applianceCategories = ['furniture', 'appliance', 'electronics'];
  const phoneCategories = ['phone', 'watch'];
  const cryptoCategories = ['crypto'];

  const getFilteredProducts = () => {
    if (selectedCategory === 'all') return products;
    if (selectedCategory === 'vehicles') return products.filter(p => vehicleCategories.includes(p.category));
    if (selectedCategory === 'materials') return products.filter(p => materialCategories.includes(p.category));
    if (selectedCategory === 'appliances') return products.filter(p => applianceCategories.includes(p.category));
    if (selectedCategory === 'phones') return products.filter(p => phoneCategories.includes(p.category));
    if (selectedCategory === 'crypto') return products.filter(p => cryptoCategories.includes(p.category));
    return products;
  };

  const filteredProducts = getFilteredProducts();
  const categories = [
    { id: 'all', label: 'All Products', icon: '🏪', color: 'from-blue-600 to-blue-700' },
    { id: 'vehicles', label: 'Motor Vehicles', icon: '🚗', color: 'from-orange-500 to-red-600' },
    { id: 'phones', label: 'Phones & Watches', icon: '📱', color: 'from-cyan-500 to-blue-600' },
    { id: 'materials', label: 'Construction', icon: '🏗️', color: 'from-amber-500 to-yellow-600' },
    { id: 'appliances', label: 'Appliances', icon: '🛋️', color: 'from-emerald-500 to-green-600' },
    { id: 'crypto', label: 'Crypto Products', icon: '₿', color: 'from-yellow-500 to-orange-600' },
  ];

  return (
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-slate-50'} rounded-lg p-6`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : ''}`}>Marketplace - Shop</h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white text-sm font-semibold rounded-md transition-all shadow-md">TZS</button>
          <button className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-white text-sm font-semibold rounded-md transition-all shadow-md">USD</button>
          <button className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-semibold rounded-md transition-all shadow-md">PI</button>
        </div>
      </div>

      {/* Category Filter Buttons */}
      <div className="mb-6">
        <p className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Shop by Category</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`p-4 rounded-lg font-bold transition-all flex flex-col items-center justify-center gap-2 ${
                selectedCategory === cat.id
                  ? `bg-gradient-to-br ${cat.color} text-white shadow-lg scale-105`
                  : darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Product Count */}
      <div className={`mb-4 text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredProducts.map((product) => (
          <div key={product.id} className={`border rounded-lg overflow-hidden transition-transform hover:scale-105 ${darkMode ? 'bg-gray-700 border-gray-600 hover:shadow-xl' : 'bg-white border-gray-200 hover:shadow-lg'}`}>
            <div className={`h-32 flex items-center justify-center text-4xl ${product.category === 'car' ? 'bg-gradient-to-br from-blue-600 to-cyan-500' : product.category === 'phone' || product.category === 'watch' ? 'bg-gradient-to-br from-cyan-500 to-blue-600' : 'bg-gradient-to-br from-blue-400 to-purple-500'}`}>
              {product.icon}
            </div>
            <div className="p-3">
              <p className={`font-bold text-sm mb-1 ${darkMode ? 'text-white' : ''}`}>{product.name}</p>
              
              {product.category === 'car' && (
                <div className={`text-xs mb-2 space-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <p>Year: {product.year} | Fuel: {product.fuel}</p>
                  <p className={`font-semibold ${product.condition === 'New' ? 'text-green-600' : 'text-yellow-600'}`}>{product.condition}</p>
                </div>
              )}

              {(product.category === 'phone' || product.category === 'watch') && (
                <div className={`text-xs mb-2 space-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <p>{product.storage || product.display} {product.color}</p>
                  <p className="text-green-600 font-semibold">In Stock</p>
                </div>
              )}
              
              <div className="flex items-center gap-1 mb-2">
                <span className="text-yellow-400 text-xs">★ {product.rating}</span>
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>({product.reviews})</span>
              </div>
              
              <div className={`text-xs space-y-0.5 mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <p className="text-black font-bold">TSh {product.tzs.toLocaleString()}</p>
                <p className="text-yellow-600 font-bold">${product.usd.toFixed(2)}</p>
                <p className="text-purple-600 font-bold">Π{product.pi.toFixed(6)}</p>
              </div>
              
              <div className="flex gap-1.5">
                {product.category === 'phone' || product.category === 'watch' ? (
                  <>
                    <button onClick={() => setSelectedPhoneProduct(product)} className="flex-1 px-2 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-xs font-bold rounded transition-all">View</button>
                    <button onClick={() => onAddToCart(product)} className="flex-1 px-2 py-1.5 bg-gradient-to-r from-emerald-400 to-green-600 hover:from-emerald-500 hover:to-green-700 text-white text-xs font-bold rounded transition-all">Buy</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => onAddToCart(product)} className="flex-1 px-2 py-1.5 bg-gradient-to-r from-emerald-400 to-green-600 hover:from-emerald-500 hover:to-green-700 text-white text-xs font-bold rounded transition-all">Add</button>
                    <button className="flex-1 px-2 py-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold rounded transition-all">Buy</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Phone Gallery Modal */}
      {selectedPhoneProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className={`w-full max-w-4xl rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : ''}`}>Product Details</h3>
              <button onClick={() => setSelectedPhoneProduct(null)} className="p-2 hover:bg-gray-200 rounded-lg transition-all">
                <X size={24} className={darkMode ? 'text-white' : 'text-gray-800'} />
              </button>
            </div>
            <div className="p-6">
              <ProductPhoneGallery product={selectedPhoneProduct} darkMode={darkMode} onAddToCart={(product) => { onAddToCart(product); setSelectedPhoneProduct(null); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
