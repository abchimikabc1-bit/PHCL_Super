'use client';

import { BulkDiscountCalculator } from '@/components/bulk-discount-calculator';
import { useState } from 'react';

const SAMPLE_PRICES = [
  { name: 'Mercedes-Benz', price: 28000 },
  { name: 'iPhone 15 Pro', price: 1800 },
  { name: 'Laptop Pro', price: 2500 },
];

export default function BulkDiscountTestPage() {
  const [selectedPrice, setSelectedPrice] = useState(28000);
  const [testResults, setTestResults] = useState<any[]>([]);

  const handleQuantityChange = (quantity: number, finalPrice: number, discount: number) => {
    const result = {
      quantity,
      originalPrice: selectedPrice * quantity,
      discountAmount: discount,
      finalPrice,
      discountPercentage: Math.round((discount / (selectedPrice * quantity)) * 100),
      timestamp: new Date().toLocaleTimeString(),
    };

    setTestResults((prev) => [result, ...prev.slice(0, 9)]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-amber-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Bulk Discount Calculator Test</h1>
          <p className="text-gray-600">Test the discount logic with different quantities and prices</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Calculator */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Select Product Price</h2>
              <div className="space-y-3">
                {SAMPLE_PRICES.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => setSelectedPrice(item.price)}
                    className={`w-full p-4 rounded-lg border-2 transition ${
                      selectedPrice === item.price
                        ? 'border-amber-600 bg-amber-50'
                        : 'border-gray-200 hover:border-amber-300'
                    }`}
                  >
                    <span className="font-semibold text-gray-900">{item.name}</span>
                    <span className="ml-4 text-lg font-bold text-amber-600">${item.price}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk Calculator */}
            <BulkDiscountCalculator
              basePrice={selectedPrice}
              currency="$"
              onQuantityChange={handleQuantityChange}
              language="en"
            />
          </div>

          {/* Test Results */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Test History</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No tests yet. Adjust quantity above to start testing.</p>
              ) : (
                testResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-gray-900">Qty: {result.quantity}</span>
                      <span className="text-xs text-gray-500">{result.timestamp}</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Original:</span>
                        <span className="font-semibold">${result.originalPrice}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({result.discountPercentage}%):</span>
                        <span className="font-semibold">-${result.discountAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 text-gray-900 font-bold">
                        <span>Final:</span>
                        <span className="text-amber-600">${result.finalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Discount Tiers Reference */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Discount Tier Reference</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-2 border-green-300">
              <p className="font-bold text-gray-900">1-2 Items</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">0%</p>
              <p className="text-sm text-gray-600 mt-1">Regular Price</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-300">
              <p className="font-bold text-gray-900">3-4 Items</p>
              <p className="text-2xl font-bold text-green-600 mt-2">-10%</p>
              <p className="text-sm text-gray-600 mt-1">Bulk Discount</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border-2 border-purple-300">
              <p className="font-bold text-gray-900">5-9 Items</p>
              <p className="text-2xl font-bold text-green-600 mt-2">-20%</p>
              <p className="text-sm text-gray-600 mt-1">Volume Discount</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border-2 border-amber-300">
              <p className="font-bold text-gray-900">10+ Items</p>
              <p className="text-2xl font-bold text-green-600 mt-2">-25%</p>
              <p className="text-sm text-gray-600 mt-1">Premium Discount</p>
            </div>
          </div>
        </div>

        {/* Test Cases */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Expected Test Cases</h2>
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="font-semibold text-gray-900">Test Case 1: Regular Price (1-2 items)</p>
              <p className="text-sm text-gray-600 mt-1">5 items @ $100: Should show 0% for 1-2 qty, then 10% for 3-4 qty</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="font-semibold text-gray-900">Test Case 2: Bulk Discount (3-4 items)</p>
              <p className="text-sm text-gray-600 mt-1">3 Mercedes @ $28,000: 3×$28k = $84k, 10% off = $75,600</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="font-semibold text-gray-900">Test Case 3: Volume Discount (5-9 items)</p>
              <p className="text-sm text-gray-600 mt-1">7 iPhones @ $1,800: 7×$1,800 = $12,600, 20% off = $10,080</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="font-semibold text-gray-900">Test Case 4: Premium Discount (10+ items)</p>
              <p className="text-sm text-gray-600 mt-1">15 Laptops @ $2,500: 15×$2,500 = $37,500, 25% off = $28,125</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
