// Shopping Cart with Bulk Discount Application
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Minus, Plus, Tag, Zap } from "lucide-react";
import { toast } from 'sonner';
import { applyPromo, getActivePromos } from "@/lib/promo-system";
import { canAddToCart } from '@/lib/admin-product-stock';
import { convertAmount, formatCurrencyAmount } from "@/components/marketplace/currency-utils";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface ShoppingCartProps {
  items?: CartItem[];
  language?: "en" | "sw";
  displayCurrency?: "usd" | "tzs" | "ntzs" | "pi";
  onProceedToCheckout?: () => void;
  onCartChange?: (items: CartItem[]) => void;
}

export function ShoppingCart({
  items = [],
  language = "en",
  displayCurrency = "usd",
  onProceedToCheckout,
  onCartChange,
}: ShoppingCartProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>(items);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  useEffect(() => {
    setCartItems(items);
  }, [items]);

  const updateCart = (nextItems: CartItem[]) => {
    setCartItems(nextItems);
    onCartChange?.(nextItems);
  };

  // Calculate subtotal
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Get auto-applied bulk discount
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const autoDiscount = totalQuantity >= 3 && !appliedPromo ? 10 : 0;

  // Apply promo if user entered one
  const handleApplyPromo = () => {
    if (!promoCode.trim()) {
      setPromoError("Please enter a promo code");
      return;
    }

    const result = applyPromo(subtotal, promoCode, totalQuantity);

    if (result.success) {
      setAppliedPromo(promoCode);
      setPromoError(null);
    } else {
      setPromoError(result.message);
    }
  };

  // Calculate discounts
  const manualDiscount = appliedPromo ? (subtotal * 10) / 100 : 0;
  const autoAppliedDiscount = autoDiscount && !appliedPromo ? (subtotal * autoDiscount) / 100 : 0;
  const totalDiscount = Math.max(manualDiscount, autoAppliedDiscount);
  const tax = (subtotal - totalDiscount) * 0.08; // 8% tax
  const total = subtotal - totalDiscount + tax;

  const formatForDisplay = (amountUsd: number) =>
    formatCurrencyAmount(displayCurrency, convertAmount(amountUsd, "usd", displayCurrency));

  // Cart management
  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
    } else {
      const stockCheck = canAddToCart(itemId, newQuantity);
      if (!stockCheck.allowed) {
        toast.error(stockCheck.reason || 'Requested quantity is unavailable');
        return;
      }

      updateCart(
        cartItems.map((item) =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const removeItem = (itemId: string) => {
    updateCart(cartItems.filter((item) => item.id !== itemId));
  };

  if (cartItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-500">
            {language === "en" ? "Your cart is empty" : "Karibu yako ni tupu"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cart Items */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === "en" ? "Shopping Cart" : "Karibu"} ({cartItems.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition"
              >
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 rounded object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-lg font-bold text-blue-600">
                    {formatForDisplay(item.price)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus size={16} />
                  </Button>
                  <span className="w-8 text-center font-semibold">{item.quantity}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeItem(item.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <X size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Promo Code Section */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag size={20} />
            {language === "en" ? "Apply Promo Code" : "Tumia Nambari ya Promo"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter promo code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleApplyPromo} className="bg-blue-600 hover:bg-blue-700">
              {language === "en" ? "Apply" : "Tumia"}
            </Button>
          </div>
          {promoError && <p className="text-sm text-red-600">{promoError}</p>}
          {appliedPromo && (
            <p className="text-sm text-green-600 font-semibold">
              {language === "en" ? "Promo code applied!" : "Nambari ya promo imetumika!"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Auto Bulk Discount Banner */}
      {autoDiscount > 0 && !appliedPromo && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-4 flex gap-3">
          <Zap className="text-green-600 flex-shrink-0" size={20} />
          <div>
            <p className="font-semibold text-green-900">
              {language === "en" ? "Bulk Discount Applied!" : "Punguzo la Juu Limetumika!"}
            </p>
            <p className="text-sm text-green-800">
              {language === "en"
                ? `You automatically qualified for ${autoDiscount}% discount with ${totalQuantity} items`
                : `Unabaki kwa ${autoDiscount}% punguzo na bidhaa ${totalQuantity}`}
            </p>
          </div>
        </div>
      )}

      {/* Price Summary */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === "en" ? "Order Summary" : "Muhtasari wa Agizo"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span>{language === "en" ? "Subtotal" : "Jumla"}</span>
            <span className="font-semibold">
              {formatForDisplay(subtotal)}
            </span>
          </div>

          {totalDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span className="flex items-center gap-2">
                <Zap size={16} />
                {language === "en" ? "Discount" : "Punguzo"}:
              </span>
              <span className="font-semibold">-{formatForDisplay(totalDiscount)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>{language === "en" ? "Tax (8%)" : "Kodi (8%)"}</span>
            <span className="font-semibold">
              {formatForDisplay(tax)}
            </span>
          </div>

          <div className="border-t pt-3 flex justify-between text-lg">
            <span className="font-bold">
              {language === "en" ? "Total" : "Jumla"}:
            </span>
            <span className="font-bold text-blue-600">
              {formatForDisplay(total)}
            </span>
          </div>

          {totalDiscount > 0 && (
            <p className="text-xs text-green-600 text-center font-semibold">
              {language === "en" ? "You save" : "Unaooa"} {formatForDisplay(totalDiscount)}!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Checkout Button */}
      <Button onClick={onProceedToCheckout} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold">
        {language === "en" ? "Proceed to Checkout" : "Endelea kwa Malipo"}
      </Button>

      {/* Available Promos */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-sm">
            {language === "en" ? "Available Promotional Codes" : "Nambari za Promo Zinazopatikana"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="font-mono font-semibold">BULK10</span>
              <span>{language === "en" ? "10% off 3+ items" : "10% kwenye bidhaa 3+"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono font-semibold">NEWUSER10</span>
              <span>{language === "en" ? "10% off first purchase" : "10% kwa ununuzi wa kwanza"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono font-semibold">CRYPTO15</span>
              <span>{language === "en" ? "15% off crypto trades" : "15% kwenye crypto"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
