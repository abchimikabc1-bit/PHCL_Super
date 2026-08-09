'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Truck,
  Bike,
  Smartphone,
  Refrigerator,
  Shirt,
  Wrench,
  Package,
  Utensils,
  Grid3x3,
  ChevronDown,
} from 'lucide-react';

export interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  count: number;
  description: string;
}

export const PRODUCT_CATEGORIES: Category[] = [
  {
    id: 'all',
    name: 'All Products',
    icon: <Grid3x3 size={24} />,
    color: 'from-gray-400 to-gray-600',
    count: 37,
    description: 'Browse all available products',
  },
  {
    id: 'vehicles',
    name: 'Vehicles',
    icon: <Truck size={24} />,
    color: 'from-blue-400 to-blue-600',
    count: 5,
    description: 'Cars, SUVs, and luxury vehicles',
  },
  {
    id: 'motorcycles',
    name: 'Motorcycles',
    icon: <Bike size={24} />,
    color: 'from-orange-400 to-orange-600',
    count: 5,
    description: 'Motorcycles and scooters',
  },
  {
    id: 'electronics',
    name: 'Electronics',
    icon: <Smartphone size={24} />,
    color: 'from-purple-400 to-purple-600',
    count: 5,
    description: 'Phones, tablets, and accessories',
  },
  {
    id: 'appliances',
    name: 'Appliances',
    icon: <Refrigerator size={24} />,
    color: 'from-green-400 to-green-600',
    count: 5,
    description: 'Kitchen and home appliances',
  },
  {
    id: 'clothing',
    name: 'Clothing',
    icon: <Shirt size={24} />,
    color: 'from-pink-400 to-pink-600',
    count: 5,
    description: 'Fashion and apparel',
  },
  {
    id: 'industrial',
    name: 'Industrial',
    icon: <Wrench size={24} />,
    color: 'from-gray-600 to-gray-800',
    count: 5,
    description: 'Industrial equipment and machinery',
  },
  {
    id: 'food',
    name: 'Food & Supplies',
    icon: <Utensils size={24} />,
    color: 'from-yellow-400 to-yellow-600',
    count: 4,
    description: 'Food, beverages, and supplies',
  },
  {
    id: 'tools',
    name: 'Tools',
    icon: <Wrench size={24} />,
    color: 'from-red-400 to-red-600',
    count: 3,
    description: 'Hand tools and equipment',
  },
];

interface CategorySelectorProps {
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  layout?: 'grid' | 'horizontal' | 'dropdown';
}

export function CategorySelector({
  selectedCategory,
  onCategoryChange,
  layout = 'grid',
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (layout === 'dropdown') {
    const selectedCat = PRODUCT_CATEGORIES.find(c => c.id === selectedCategory);
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full md:w-64 px-4 py-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between hover:border-amber-500 transition-colors"
        >
          <span className="font-semibold text-gray-900">{selectedCat?.name}</span>
          <ChevronDown size={20} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            {PRODUCT_CATEGORIES.map(category => (
              <button
                key={category.id}
                onClick={() => {
                  onCategoryChange(category.id);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-amber-50 transition-colors ${
                  selectedCategory === category.id ? 'bg-amber-100 border-l-4 border-amber-600' : ''
                }`}
              >
                <div className={`p-2 bg-gradient-to-br ${category.color} text-white rounded-lg`}>
                  {category.icon}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{category.name}</p>
                  <p className="text-xs text-gray-600">{category.count} items</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (layout === 'horizontal') {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {PRODUCT_CATEGORIES.map(category => (
          <Button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            className={`whitespace-nowrap ${
              selectedCategory === category.id
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0'
                : 'hover:border-amber-500'
            }`}
          >
            {category.icon}
            <span className="ml-2">{category.name}</span>
          </Button>
        ))}
      </div>
    );
  }

  // Grid layout
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {PRODUCT_CATEGORIES.map(category => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={`group relative overflow-hidden rounded-xl p-4 transition-all duration-300 ${
            selectedCategory === category.id
              ? 'ring-2 ring-amber-600 scale-105'
              : 'hover:scale-105'
          }`}
        >
          {/* Background gradient */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-90 group-hover:opacity-100 transition-opacity`}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center gap-3 text-white h-40">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              {category.icon}
            </div>
            <div className="text-center">
              <p className="font-bold text-sm">{category.name}</p>
              <p className="text-xs opacity-80">{category.count} items</p>
            </div>
          </div>

          {/* Hover highlight */}
          {selectedCategory === category.id && (
            <div className="absolute inset-0 border-2 border-white rounded-xl pointer-events-none" />
          )}
        </button>
      ))}
    </div>
  );
}

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const category = PRODUCT_CATEGORIES.find(c => c.id === selectedCategory);

  return (
    <Card className="premium-card mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className={`p-3 bg-gradient-to-br ${category?.color} text-white rounded-lg`}>
            {category?.icon}
          </div>
          <div>
            <p className="text-gray-600 text-sm">Browsing</p>
            <p className="text-2xl font-bold">{category?.name}</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 mb-4">{category?.description}</p>
        <CategorySelector
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
          layout="horizontal"
        />
      </CardContent>
    </Card>
  );
}

export default CategorySelector;
