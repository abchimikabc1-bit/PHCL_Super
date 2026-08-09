"use client";

import { useEffect, useState } from "react";
import { MARKETPLACE_PRODUCTS } from "@/lib/marketplace-products";

export default function DashboardPage() {
  const [productCount, setProductCount] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [topProduct, setTopProduct] = useState<(typeof MARKETPLACE_PRODUCTS)[number] | null>(null);

  useEffect(() => {
    setProductCount(MARKETPLACE_PRODUCTS.length);
    const cats = Array.from(new Set(MARKETPLACE_PRODUCTS.map(p => p.category)));
    setCategories(cats);
    const avg = MARKETPLACE_PRODUCTS.reduce((sum, p) => sum + p.rating, 0) / MARKETPLACE_PRODUCTS.length;
    setAverageRating(parseFloat(avg.toFixed(2)));
    const top = MARKETPLACE_PRODUCTS.reduce((prev, curr) => (curr.rating > prev.rating ? curr : prev), MARKETPLACE_PRODUCTS[0]);
    setTopProduct(top);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-[#101827] to-[#1c1607] text-white p-8">
      <svg width="400" height="400" viewBox="0 0 120 120" className="mx-auto mb-4"><circle cx="60" cy="60" r="55" stroke="#FFD700" strokeWidth="12" fill="none"/><text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontSize="100" fill="#0000FF" fontFamily="Arial">P</text></svg>
      <div className="bg-amber-200 text-amber-800 font-semibold px-3 py-1 rounded-md inline-block mb-2">super</div>
      <h1 className="text-3xl font-bold mb-6">Super Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl bg-slate-800/70 p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-2">Total Products</h2>
          <p className="text-4xl font-bold text-amber-300">{productCount}</p>
        </div>
        <div className="rounded-xl bg-slate-800/70 p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-2">Categories</h2>
          <p className="text-2xl font-medium text-amber-300">{categories.length}</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-100/80">
            {categories.map((c) => (
              <li key={c}>• {c}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-slate-800/70 p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-2">Avg. Rating</h2>
          <p className="text-4xl font-bold text-amber-300">{averageRating}</p>
        </div>
        <div className="rounded-xl bg-slate-800/70 p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-2">Top Product</h2>
          {topProduct ? (
            <div className="mt-2">
              <p className="text-lg font-medium text-amber-300">{topProduct.name}</p>
              <p className="text-sm text-amber-100/80">Rating: {topProduct.rating} ★</p>
            </div>
          ) : (
            <p className="text-sm text-amber-100/80">No products</p>
          )}
        </div>
      </div>
    </main>
  );
}
