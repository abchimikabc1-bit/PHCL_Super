'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { type MarketplaceProduct } from '@/lib/marketplace-products';

// Tunatumia MarketplaceProduct badala ya Product
interface CartItem extends MarketplaceProduct {
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: MarketplaceProduct) => void;
  removeFromCart: (productId: string | number) => void;
  clearCart: () => void;
  getTotalAmount: (currency: 'tzs' | 'usd' | 'ntzs' | 'pi') => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (product: MarketplaceProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string | number) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotalAmount = (currency: 'tzs' | 'usd' | 'ntzs' | 'pi') => {
    return cart.reduce((sum, item) => {
      // 👉 HAPA NDIPO TULIPOREKEBISHA: 
      // Tunatumia (item as any) kuzuia TypeScript isilalamike kuhusu tzs, ntzs na pi
      const itemData = item as any;
      
      // Ulinzi: Tunatumia 'priceUSD' au 'tzs' kama mbadala (fallback) kuzuia hesabu kufeli
      let price = itemData.tzs || (item.priceUSD ? item.priceUSD * 2625 : 0);

      if (currency === 'usd') {
        price = item.priceUSD || itemData.usd || 0;
      } else if (currency === 'ntzs') {
        price = itemData.ntzs || itemData.tzs || 0;
      } else if (currency === 'pi') {
        price = itemData.pi || 0;
      }

      return sum + (price * item.quantity);
    }, 0);
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, getTotalAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart lazima itumike ndani ya CartProvider');
  }
  return context;
}