import type { StoredOrder } from '@/lib/order-storage';

const ORDER_STORAGE_KEY = 'phcl_orders';
const ORDERS_UPDATED_EVENT = 'phcl-orders-updated';
const MAX_ORDERS = 25;

const now = Date.now();

export const DEMO_ORDER_IDS = ['ORD-DEMO-1001', 'ORD-DEMO-1002', 'ORD-DEMO-1003', 'ORD-DEMO-1004'] as const;

export const DEMO_ORDERS: StoredOrder[] = [
  {
    id: 'ORD-DEMO-1001',
    createdAt: new Date(now - 1000 * 60 * 45).toISOString(),
    itemCount: 3,
    totalUsd: 47999,
    paymentMethod: 'usd',
    displayCurrency: 'usd',
    items: [
      {
        id: '1',
        name: 'Mercedes-Benz C 200 Sedan',
        price: 46500,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&h=600&fit=crop',
      },
      {
        id: '14',
        name: 'Sony WH-1000XM5 Headphones',
        price: 700,
        quantity: 2,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop',
      },
    ],
    customer: {
      fullName: 'Amina Joseph',
      phone: '+255712000111',
      addressLine1: 'Mikocheni B, Plot 17',
      city: 'Dar es Salaam',
      country: 'Tanzania',
    },
    audit: {
      schemaVersion: 2,
      sourceRoute: '/checkout',
      channel: 'web',
      recordedAt: new Date(now - 1000 * 60 * 45).toISOString(),
    },
  },
  {
    id: 'ORD-DEMO-1002',
    createdAt: new Date(now - 1000 * 60 * 30).toISOString(),
    itemCount: 3,
    totalUsd: 3018,
    paymentMethod: 'tzs',
    displayCurrency: 'tzs',
    items: [
      {
        id: '12',
        name: 'Samsung Galaxy S24 Ultra 256GB',
        price: 1499,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop',
      },
      {
        id: '20',
        name: 'Philips Airfryer XXL',
        price: 759,
        quantity: 2,
        image: 'https://images.unsplash.com/photo-1585515656792-3f2f4d24f4b4?w=600&h=600&fit=crop',
      },
    ],
    customer: {
      fullName: 'Brian Mushi',
      phone: '+255745222333',
      addressLine1: 'Njiro Block C',
      city: 'Arusha',
      country: 'Tanzania',
    },
    audit: {
      schemaVersion: 2,
      sourceRoute: '/checkout',
      channel: 'web',
      recordedAt: new Date(now - 1000 * 60 * 30).toISOString(),
    },
  },
  {
    id: 'ORD-DEMO-1003',
    createdAt: new Date(now - 1000 * 60 * 10).toISOString(),
    itemCount: 5,
    totalUsd: 2080,
    paymentMethod: 'pi',
    displayCurrency: 'pi',
    items: [
      {
        id: '11',
        name: 'Apple iPhone 15 Pro Max 512GB',
        price: 1800,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=600&fit=crop',
      },
      {
        id: '30',
        name: 'Premium Delivery + Insurance',
        price: 70,
        quantity: 4,
      },
    ],
    customer: {
      fullName: 'Neema Peter',
      phone: '+255767444555',
      addressLine1: 'Kaunda Street 21',
      city: 'Mwanza',
      country: 'Tanzania',
    },
    audit: {
      schemaVersion: 2,
      sourceRoute: '/checkout',
      channel: 'web',
      recordedAt: new Date(now - 1000 * 60 * 10).toISOString(),
    },
  },
  {
    id: 'ORD-DEMO-1004',
    createdAt: new Date(now - 1000 * 60 * 5).toISOString(),
    itemCount: 2,
    totalUsd: 1280,
    paymentMethod: 'ntzs',
    displayCurrency: 'ntzs',
    items: [
      {
        id: '18',
        name: 'Dell XPS 13 Laptop',
        price: 1200,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=600&fit=crop',
      },
      {
        id: '31',
        name: 'Priority Delivery',
        price: 80,
        quantity: 1,
      },
    ],
    customer: {
      fullName: 'Khalid Omary',
      phone: '+255754666777',
      addressLine1: 'Makumbusho Road 12',
      city: 'Dodoma',
      country: 'Tanzania',
    },
    audit: {
      schemaVersion: 2,
      sourceRoute: '/checkout',
      channel: 'web',
      recordedAt: new Date(now - 1000 * 60 * 5).toISOString(),
    },
  },
];

export function seedDemoOrdersInStorage(): { seededCount: number; totalCount: number } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { seededCount: 0, totalCount: 0 };
  }

  let existing: StoredOrder[] = [];
  try {
    const raw = window.localStorage.getItem(ORDER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      existing = parsed as StoredOrder[];
    }
  } catch {
    existing = [];
  }

  const next = [
    ...DEMO_ORDERS,
    ...existing.filter((order) => !DEMO_ORDER_IDS.includes(order.id as (typeof DEMO_ORDER_IDS)[number])),
  ].slice(0, MAX_ORDERS);

  window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(ORDERS_UPDATED_EVENT));

  return { seededCount: DEMO_ORDERS.length, totalCount: next.length };
}

export function clearDemoOrdersInStorage(): { removedCount: number; totalCount: number } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { removedCount: 0, totalCount: 0 };
  }

  let existing: StoredOrder[] = [];
  try {
    const raw = window.localStorage.getItem(ORDER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      existing = parsed as StoredOrder[];
    }
  } catch {
    existing = [];
  }

  const filtered = existing.filter(
    (order) => !DEMO_ORDER_IDS.includes(order.id as (typeof DEMO_ORDER_IDS)[number])
  );

  window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(filtered));
  window.dispatchEvent(new Event(ORDERS_UPDATED_EVENT));

  return {
    removedCount: existing.length - filtered.length,
    totalCount: filtered.length,
  };
}
