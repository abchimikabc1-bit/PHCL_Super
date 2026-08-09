// Bulk Discount Calculator Component
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertCircle, Zap, TrendingDown } from "lucide-react";
import { calculateDiscount } from "@/lib/promo-system";

interface BulkDiscountCalculatorProps {
  basePrice: number;
  currency?: string;
  onQuantityChange?: (quantity: number, finalPrice: number, discount: number) => void;
  language?: "en" | "sw";
}

export function BulkDiscountCalculator({
  basePrice,
  currency = "$",
  onQuantityChange,
  language = "en",
}: BulkDiscountCalculatorProps) {
  const [quantity, setQuantity] = useState(1);
  
  // Bulk discount tiers
  const discountTiers = [
    { min: 1, max: 2, discount: 0, label: language === "en" ? "Regular" : "Kawaida" },
    { min: 3, max: 4, discount: 10, label: language === "en" ? "10% Off" : "10% Punguzo" },
    { min: 5, max: 9, discount: 20, label: language === "en" ? "20% Off" : "20% Punguzo" },
    { min: 10, max: Infinity, discount: 25, label: language === "en" ? "25% Off" : "25% Punguzo" },
  ];

  const getCurrentDiscount = () => {
    return discountTiers.find(tier => quantity >= tier.min && quantity <= tier.max)?.discount || 0;
  };

  const currentDiscount = getCurrentDiscount();
  const totalOriginalPrice = basePrice * quantity;
  const discountAmount = (totalOriginalPrice * currentDiscount) / 100;
  const finalPrice = totalOriginalPrice - discountAmount;

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = Math.max(1, parseInt(e.target.value) || 1);
    setQuantity(newQuantity);
    onQuantityChange?.(newQuantity, finalPrice, discountAmount);
  };

  const handleQuickSelect = (qty: number) => {
    setQuantity(qty);
    const newTotal = basePrice * qty;
    const newDiscount = discountTiers.find(tier => qty >= tier.min && qty <= tier.max)?.discount || 0;
    const newDiscountAmount = (newTotal * newDiscount) / 100;
    onQuantityChange?.(qty, newTotal - newDiscountAmount, newDiscountAmount);
  };

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-25">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="text-blue-600" size={20} />
            {language === "en" ? "Bulk Discount Calculator" : "Kikokotoo cha Punguzo"}
          </CardTitle>
          <Badge className="bg-blue-600">
            {language === "en" ? "Save Up to 25%" : "Okoa Hadi 25%"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Information Banner */}
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 flex gap-2">
          <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            {language === "en"
              ? "Buy more, save more! Get 10% off on 3+ items, 20% off on 5+ items"
              : "Nunua zaidi, okoa zaidi! Pata 10% punguzo kwenye bidhaa 3+, 20% kwenye bidhaa 5+"}
          </div>
        </div>

        {/* Quantity Input */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-900">
            {language === "en" ? "Quantity" : "Kiasi"}
          </label>
          <Input
            type="number"
            min="1"
            max="1000"
            value={quantity}
            onChange={handleQuantityChange}
            className="border-2 border-blue-300 text-lg font-semibold"
            placeholder="Enter quantity"
          />
        </div>

        {/* Quick Select Buttons */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600 uppercase">
            {language === "en" ? "Quick Select" : "Chagua Haraka"}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[3, 5, 10, 20].map((qty) => (
              <Button
                key={qty}
                variant={quantity === qty ? "default" : "outline"}
                size="sm"
                onClick={() => handleQuickSelect(qty)}
                className={quantity === qty ? "bg-blue-600" : "border-blue-300"}
              >
                {qty}
              </Button>
            ))}
          </div>
        </div>

        {/* Discount Tiers */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600 uppercase">
            {language === "en" ? "Discount Tiers" : "Ngazi za Punguzo"}
          </p>
          <div className="space-y-2">
            {discountTiers.map((tier) => (
              <div
                key={tier.label}
                className={`p-3 rounded-lg border-2 transition ${
                  quantity >= tier.min && quantity <= tier.max
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {tier.min}-{tier.max === Infinity ? "∞" : tier.max} items
                  </span>
                  <Badge
                    variant={quantity >= tier.min && quantity <= tier.max ? "default" : "secondary"}
                    className={quantity >= tier.min && quantity <= tier.max ? "bg-blue-600" : ""}
                  >
                    {tier.discount > 0 ? `-${tier.discount}%` : language === "en" ? "Regular" : "Kawaida"}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mt-1">{tier.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              {language === "en" ? "Subtotal" : "Jumla"}:
            </span>
            <span className="font-medium">
              {currency}{totalOriginalPrice.toFixed(2)}
            </span>
          </div>

          {currentDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>
                {language === "en" ? "Discount" : "Punguzo"} ({currentDiscount}%):
              </span>
              <span className="font-semibold">-{currency}{discountAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t pt-2 flex justify-between">
            <span className="font-semibold text-gray-900">
              {language === "en" ? "Total" : "Jumla"}:
            </span>
            <span className="text-lg font-bold text-blue-600">
              {currency}{finalPrice.toFixed(2)}
            </span>
          </div>

          {currentDiscount > 0 && (
            <p className="text-xs text-green-600 font-semibold text-center mt-2">
              {language === "en" ? "You save" : "Unaooa"} {currency}{discountAmount.toFixed(2)}!
            </p>
          )}
        </div>

        {/* Add to Cart Suggestion */}
        {quantity < 3 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-900">
              {language === "en"
                ? `Add ${3 - quantity} more item${3 - quantity > 1 ? "s" : ""} to qualify for 10% bulk discount`
                : `Ongeza bidhaa ${3 - quantity} zaidi kupata punguzo la 10%`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
