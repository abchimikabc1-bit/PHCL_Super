export interface CartStorageItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

const CART_STORAGE_KEY = 'phcl_cart_items';
export const CART_UPDATED_EVENT = 'phcl-cart-updated';
const MAX_CART_ITEMS = 100;
const MAX_ITEM_NAME_LENGTH = 140;
const MAX_ITEM_IMAGE_LENGTH = 20000;
const MAX_ITEM_QTY = 999;

const canUseStorage = (): boolean => typeof window !== 'undefined' && !!window.localStorage;

const normalizeCartItem = (item: unknown): CartStorageItem | null => {
  if (!item || typeof item !== 'object') return null;

  const candidate = item as {
    id?: unknown;
    name?: unknown;
    price?: unknown;
    quantity?: unknown;
    image?: unknown;
  };

  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') {
    return null;
  }

  const price = Number(candidate.price);
  const quantity = Number(candidate.quantity);

  if (!Number.isFinite(price) || !Number.isFinite(quantity)) {
    return null;
  }

  const safePrice = Math.max(0, Number(price.toFixed(2)));
  const safeQty = Math.min(MAX_ITEM_QTY, Math.max(1, Math.floor(quantity)));

  return {
    id: candidate.id.trim().slice(0, 80),
    name: candidate.name.trim().slice(0, MAX_ITEM_NAME_LENGTH),
    price: safePrice,
    quantity: safeQty,
    image:
      typeof candidate.image === 'string'
        ? candidate.image.trim().slice(0, MAX_ITEM_IMAGE_LENGTH)
        : undefined,
  };
};

const normalizeCartItems = (items: unknown): CartStorageItem[] => {
  if (!Array.isArray(items)) return [];

  const sanitized: CartStorageItem[] = [];
  for (const raw of items) {
    const item = normalizeCartItem(raw);
    if (item) sanitized.push(item);
    if (sanitized.length >= MAX_CART_ITEMS) break;
  }

  return sanitized;
};

export const getCartItems = (): CartStorageItem[] => {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizeCartItems(parsed);
  } catch {
    return [];
  }
};

export const setCartItems = (items: CartStorageItem[]): void => {
  if (!canUseStorage()) return;
  const sanitized = normalizeCartItems(items);
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(sanitized));
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
};

export const addCartItem = (item: CartStorageItem): CartStorageItem[] => {
  const normalized = normalizeCartItem(item);
  if (!normalized) return getCartItems();

  const current = getCartItems();
  const existingIndex = current.findIndex((entry) => entry.id === normalized.id);

  if (existingIndex >= 0) {
    const updated = [...current];
    updated[existingIndex] = {
      ...updated[existingIndex],
      quantity: Math.min(MAX_ITEM_QTY, updated[existingIndex].quantity + normalized.quantity),
    };
    setCartItems(updated);
    return updated;
  }

  const next = [...current, normalized].slice(0, MAX_CART_ITEMS);
  setCartItems(next);
  return next;
};

export const getCartTotal = (items: CartStorageItem[]): number =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);

export const getCartItemCount = (items: CartStorageItem[]): number =>
  items.reduce((sum, item) => sum + item.quantity, 0);
