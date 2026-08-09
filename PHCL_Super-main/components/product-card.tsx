'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingCart, Star, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';

// Color mapping for currencies
const getCurrencyColor = (currency: string): string => {
  const colors: Record<string, string> = {
    "USD": "text-black",
    "TZS": "text-green-600",
    "PI": "text-purple-600",
    "usd": "text-black",
    "tsh": "text-green-600",
    "pi": "text-purple-600",
  };
  return colors[currency] || "text-gray-700";
};

interface ProductCardProps {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
  rating: number;
  isFavorite?: boolean;
  onFavorite?: (id: number) => void;
  onAddToCart?: (id: number) => void;
  displayCurrency?: 'USD' | 'TZS' | 'NTZS' | 'PI';
}

export function ProductCard({
  id,
  name,
  category,
  price,
  image,
  rating,
  isFavorite = false,
  onFavorite,
  onAddToCart,
  displayCurrency = 'USD',
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [favorite, setFavorite] = useState(isFavorite);

  const formatPrice = (amount: number) => {
    const TZS_USD_RATE = 2500;
    const PI_USD_RATE = 314159;

    if (displayCurrency === 'USD') {
      return `$${(amount / 1000000).toFixed(2)}M`;
    } else if (displayCurrency === 'TZS') {
      return `TSh ${((amount * TZS_USD_RATE) / 1000000).toFixed(0)}M`;
    } else if (displayCurrency === 'NTZS') {
      return `nTSh ${((amount * TZS_USD_RATE) / 1000000).toFixed(0)}M`;
    } else {
      return `Π ${(amount * PI_USD_RATE / 1000000).toFixed(0)}M`;
    }
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      Vehicles: 'from-blue-500 to-blue-600',
      Motorcycles: 'from-orange-500 to-orange-600',
      Electronics: 'from-purple-500 to-purple-600',
      Appliances: 'from-green-500 to-green-600',
      Clothing: 'from-pink-500 to-pink-600',
      Industrial: 'from-gray-600 to-gray-700',
      Food: 'from-yellow-500 to-yellow-600',
      Tools: 'from-red-500 to-red-600',
    };
    return colors[cat] || 'from-gray-500 to-gray-600';
  };

  const handleFavorite = () => {
    setFavorite(!favorite);
    onFavorite?.(id);
  };

  return (
    <Link href={`/product/${id}`}>
      <Card className="premium-card overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-105">
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-white h-64">
        {/* Image container */}
        <Image
          src={image}
          alt={name}
          width={512}
          height={512}
          className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
        />

        {/* Category badge */}
        <Badge
          className={`absolute top-3 left-3 bg-gradient-to-r ${getCategoryColor(category)} text-white`}
        >
          {category}
        </Badge>

        {/* Rating */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
          <Star size={16} className="fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-semibold text-gray-900">{rating}</span>
        </div>

        {/* Favorite button */}
        <button
          onClick={handleFavorite}
          className="absolute bottom-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg"
        >
          <Heart
            size={20}
            className={favorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}
          />
        </button>

        {/* Hover overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <div className="flex gap-3">
              <Button
                size="sm"
                className="bg-white text-gray-900 hover:bg-gray-100"
                onClick={() => onAddToCart?.(id)}
              >
                <ShoppingCart size={16} className="mr-1" /> Add
              </Button>
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* Product name */}
        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-amber-600 transition-colors">
          {name}
        </h3>

        {/* Price and trend */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-2xl font-bold text-amber-600">
            {formatPrice(price)}
          </div>
          <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
            <TrendingUp size={14} />
            +2.3%
          </div>
        </div>

        {/* Add to cart button */}
        <Button
          onClick={() => onAddToCart?.(id)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold"
        >
          <ShoppingCart size={16} className="mr-2" />
          Add to Cart
        </Button>
      </CardContent>
    </Card>
    </Link>
  );
}

export default ProductCard;
