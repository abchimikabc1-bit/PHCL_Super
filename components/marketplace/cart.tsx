// components/marketplace/cart.tsx
'use client';
import React from 'react';

export default function Cart() {
  return (
    <div className="p-4 bg-slate-800/70 rounded-xl text-amber-300">
      <h2 className="text-xl font-semibold mb-2">Cart (Demo)</h2>
      <p className="text-sm">Your cart is empty. Add items from the marketplace.</p>
    </div>
  );
}
