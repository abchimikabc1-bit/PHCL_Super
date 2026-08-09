import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, ShoppingCart, Heart, Share2 } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  rating?: number;
  reviews?: number;
  usd?: number;
  tzs?: number;
  pi?: number;
  storage?: string;
  screen?: string;
  color?: string;
}

interface PhoneGalleryProps {
  product: Product;
  darkMode: boolean;
  onAddToCart: (product: Product) => void;
}

export function ProductPhoneGallery({ product, darkMode, onAddToCart }: PhoneGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const getPhoneImage = (productId: number, imageType: string) => {
    const phones: Record<number, Record<string, string>> = {
      63: { // Galaxy S26 Ultra
        'Front': '📱', 'Back': '📱', 'Side': '📱', 'Box & Accessories': '📦', 'Unboxing': '🎁',
      },
      64: { // Galaxy S26
        'Front': '📱', 'Back': '📱', 'Side': '📱', 'Box & Accessories': '📦',
      },
      65: { // Galaxy S24 Ultra
        'Front': '📱', 'Back': '📱', 'Side': '📱', 'Box & Accessories': '📦',
      },
      66: { // Galaxy S24
        'Front': '📱', 'Back': '📱', 'Side': '📱', 'Box & Accessories': '📦',
      },
      67: { // iPhone 16 Pro Max
        'Front': '📱', 'Back': '📱', 'Side': '📱', 'Box & Accessories': '📦',
      },
      68: { // iPhone 16 Pro
        'Front': '📱', 'Back': '📱', 'Side': '📱', 'Box & Accessories': '📦',
      },
      69: { // iPhone 16
        'Front': '📱', 'Back': '📱', 'Side': '📱', 'Box & Accessories': '📦',
      },
    };
    return phones[productId]?.[imageType] || '📱';
  };

  const imageUrls: Record<number, { type: string; url: string }[]> = {
    69: [
      { type: 'Front', url: '/placeholder.svg?height=500&width=300' },
      { type: 'Back', url: '/placeholder.svg?height=500&width=300' },
      { type: 'Side', url: '/placeholder.svg?height=500&width=300' },
      { type: 'Box & Accessories', url: '/placeholder.svg?height=500&width=300' },
    ],
  };

  const getImages = () => {
    if (imageUrls[product.id]) {
      return imageUrls[product.id];
    }

    const imageTypes = ['Front', 'Back', 'Side', 'Box & Accessories', 'Unboxing'];
    return imageTypes.slice(0, 5).map((type) => ({
      type,
      url: '/placeholder.svg?height=500&width=300',
    }));
  };

  const images = getImages();
  const accessories = ['USB-C Cable', 'Charger 65W', 'Screen Protector', 'Premium Case', 'SIM Ejector Tool', 'Quick Start Guide'];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
      {/* Image Gallery */}
      <div className="space-y-4">
        {/* Main Image Display */}
        <div className={`relative h-96 rounded-xl overflow-hidden flex items-center justify-center border-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'}`}>
          <div className="text-center">
            <div className="text-8xl mb-4">{getPhoneImage(product.id, images[currentImageIndex].type)}</div>
            <p className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>{images[currentImageIndex].type}</p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{product.name}</p>
          </div>
          
          {/* Navigation Buttons */}
          <button
            type="button"
            aria-label="Previous image"
            onClick={prevImage}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all"
          >
            <ChevronLeft size={24} className="text-gray-800" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={nextImage}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all"
          >
            <ChevronRight size={24} className="text-gray-800" />
          </button>
          
          {/* Image Counter */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-semibold">
            {currentImageIndex + 1} / {images.length}
          </div>
        </div>

        {/* Thumbnail Gallery */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Show ${img.type}`}
              onClick={() => setCurrentImageIndex(idx)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                idx === currentImageIndex
                  ? 'border-blue-500 ring-2 ring-blue-300'
                  : darkMode
                  ? 'border-gray-600 hover:border-blue-400'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.type} className="w-full h-full object-cover" />
              <span className="text-xs text-center block mt-1">{img.type}</span>
            </button>
          ))}
        </div>

        {/* Image Type Label */}
        <div className={`text-center font-semibold text-lg ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {images[currentImageIndex].type}
        </div>
      </div>

      {/* Product Details */}
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{product.name}</h1>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex text-yellow-400">
              {'★'.repeat(Math.floor(product.rating))}
              <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>{'★'.repeat(5 - Math.floor(product.rating))}</span>
            </div>
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>({product.reviews} reviews)</span>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 rounded-lg text-white space-y-2">
          <div className="text-sm opacity-90">Price in Multiple Currencies</div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs opacity-75">USD</div>
              <div className="text-xl font-bold">${product.usd}</div>
            </div>
            <div>
              <div className="text-xs opacity-75">TSh</div>
              <div className="text-xl font-bold">{product.tzs.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs opacity-75">Pi Network</div>
              <div className="text-xl font-bold">Π {product.pi.toFixed(6)}</div>
            </div>
          </div>
        </div>

        {/* Specifications */}
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <h3 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Specifications</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Storage:</span>
              <span className={darkMode ? 'text-gray-300' : 'text-gray-900'}>{product.storage}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Screen Size:</span>
              <span className={darkMode ? 'text-gray-300' : 'text-gray-900'}>{product.screen}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Color:</span>
              <span className={darkMode ? 'text-gray-300' : 'text-gray-900'}>{product.color}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Condition:</span>
              <span className="text-green-500 font-semibold">Brand New</span>
            </div>
          </div>
        </div>

        {/* What's in the Box */}
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <h3 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Box Contents & Accessories</h3>
          <div className="grid grid-cols-2 gap-2">
            {accessories.map((item, idx) => (
              <div key={idx} className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <span className="text-green-500">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              onAddToCart(product);
              toast.success('Added to cart', {
                description: `${product.name} has been added to your cart.`,
              });
            }}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold rounded-lg shadow-lg transition-all active:scale-95"
          >
            <ShoppingCart size={20} />
            Buy Now
          </button>
          <button
            type="button"
            aria-pressed={isWishlisted}
            onClick={() => setIsWishlisted(!isWishlisted)}
            className={`px-4 py-3 rounded-lg transition-all ${
              isWishlisted
                ? 'bg-red-500 text-white'
                : darkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Heart size={20} fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>
          <button type="button" className={`px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`} aria-label="Share product">
            <Share2 size={20} />
          </button>
        </div>

        {/* Warranty Badge */}
        <div className={`p-3 rounded-lg border-2 border-green-500 ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
          <p className={`text-sm font-semibold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
            ✓ 2-Year International Warranty | Free Shipping | 30-Day Money-Back Guarantee
          </p>
        </div>
      </div>
    </div>
  );
}
