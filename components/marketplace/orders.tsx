'use client';

import React, { useState } from 'react';
import { products, Product } from '@/data/products'; // Badilisha njia ya import (path) iendane na ulipoweka faili lako la products

// ==========================================
// 1. ORDER INTERFACES & TYPES
// ==========================================
export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface OrderItem {
  id: string | number;
  product: Product;
  quantity: number;
  selectedCurrency: 'TZS' | 'USD' | 'Pi';
  totalPrice: number;
}

export interface Order {
  orderId: string;
  customerName: string;
  customerEmail?: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  createdAt: string;
  shippingAddress: string;
}

// ==========================================
// 2. MOCK DATA (ODA ZA AWALI)
// ==========================================
const initialOrders: Order[] = [
  {
    orderId: 'ORD-9081',
    customerName: 'Juma Ally',
    customerEmail: 'juma@example.com',
    items: [
      {
        id: 1,
        product: products[0] || { id: 1, name: 'Toyota Corolla 2024', category: 'car', tzs: 52500000, usd: 19999, pi: 0.0637, rating: 4.9, reviews: 456, icon: '🚗' },
        quantity: 1,
        selectedCurrency: 'USD',
        totalPrice: 19999
      }
    ],
    status: 'Processing',
    totalAmount: 19999,
    currency: 'USD',
    createdAt: '2026-06-10',
    shippingAddress: 'Dar es Salaam, Tanzania'
  },
  {
    orderId: 'ORD-9082',
    customerName: 'Baraka Mwinyi',
    customerEmail: 'baraka@example.com',
    items: [
      {
        id: 13,
        product: products[12] || { id: 13, name: 'Bitcoin Trading Pro', category: 'crypto', tzs: 265000, usd: 99.99, pi: 0.0003183, rating: 4.8, reviews: 234, icon: '₿' },
        quantity: 2,
        selectedCurrency: 'TZS',
        totalPrice: 530000
      }
    ],
    status: 'Delivered',
    totalAmount: 530000,
    currency: 'TZS',
    createdAt: '2026-06-08',
    shippingAddress: 'Arusha, Tanzania'
  }
];

// ==========================================
// 3. MAIN ORDER COMPONENT
// ==========================================
export default function OrderComponent() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [filter, setFilter] = useState<string>('All');

  // Kuchuja oda kulingana na Status
  const filteredOrders = filter === 'All' 
    ? orders 
    : orders.filter((o) => o.status.toLowerCase() === filter.toLowerCase());

  // Badilisha Status ya Oda
  const updateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prevOrders) =>
      prevOrders.map((ord) =>
        ord.orderId === orderId ? { ...ord, status: newStatus } : ord
      )
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 bg-slate-950 text-white rounded-3xl border border-slate-800 shadow-2xl">
      {/* Kichwa cha Sehemu ya Oda */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <span>📦</span> Usimamizi wa Oda (Order Management)
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Fuatilia, angalia, na thibitisha oda zote za wateja wa kimataifa kwa urahisi.
          </p>
        </div>

        {/* Vichujio vya Hali (Filters) */}
        <div className="flex flex-wrap gap-2">
          {['All', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                filter === status
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Orodha ya Oda */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800/60">
          <p className="text-slate-400 text-base">Hakuna oda zilizopatikana kwenye kundi hili.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredOrders.map((order) => (
            <div
              key={order.orderId}
              className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 transition-all hover:border-slate-700 shadow-lg"
            >
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-blue-400">{order.orderId}</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        order.status === 'Delivered'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : order.status === 'Processing'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : order.status === 'Shipped'
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Mteja: <strong className="text-slate-200">{order.customerName}</strong> ({order.customerEmail || 'Hakuna Barua pepe'}) • Tarehe: {order.createdAt}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Jumla ya Malipo</span>
                  <span className="text-xl font-bold text-emerald-400">
                    {order.currency === 'TZS' ? 'TZS ' : order.currency === 'USD' ? '$' : 'Pi '}
                    {order.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Vitu Viliyoagizwa (Items List) */}
              <div className="space-y-3 mb-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bidhaa Kwenye Oda Hii:</h4>
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800/50">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.product.icon || '📦'}</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{item.product.name}</p>
                        <p className="text-xs text-slate-400">Idadi: {item.quantity} | Kundi: {item.product.category}</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-slate-300">
                      {item.selectedCurrency} {item.totalPrice.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Anwani na Vifungo vya Kuchukua Hatua (Actions) */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-slate-800/60 text-xs text-slate-400">
                <p>📍 Anwani ya Mteja: <span className="text-slate-300 font-medium">{order.shippingAddress}</span></p>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 mr-1">Badilisha Hali:</span>
                  {(['Processing', 'Shipped', 'Delivered', 'Cancelled'] as OrderStatus[]).map((st) => (
                    order.status !== st && (
                      <button
                        key={st}
                        onClick={() => updateOrderStatus(order.orderId, st)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
                      >
                        {st}
                      </button>
                    )
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}