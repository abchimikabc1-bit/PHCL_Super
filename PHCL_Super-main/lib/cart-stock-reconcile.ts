import { canAddToCart } from '@/lib/admin-product-stock';
import type { CartStorageItem } from '@/lib/cart-storage';

export interface CartStockReconcileChange {
  type: 'removed_unavailable' | 'reduced_quantity';
  itemName: string;
  fromQty: number;
  toQty: number;
  reason: string;
}

export interface CartStockReconcileResult {
  items: CartStorageItem[];
  changes: CartStockReconcileChange[];
}

export function reconcileCartItemsWithStock(items: CartStorageItem[]): CartStockReconcileResult {
  const nextItems: CartStorageItem[] = [];
  const changes: CartStockReconcileChange[] = [];

  for (const item of items) {
    const check = canAddToCart(item.id, item.quantity);
    if (check.allowed) {
      nextItems.push(item);
      continue;
    }

    const available = check.availableStock ?? 0;
    if (available > 0) {
      nextItems.push({
        ...item,
        quantity: available,
      });
      changes.push({
        type: 'reduced_quantity',
        itemName: item.name,
        fromQty: item.quantity,
        toQty: available,
        reason: check.reason || 'Quantity adjusted to available stock',
      });
      continue;
    }

    changes.push({
      type: 'removed_unavailable',
      itemName: item.name,
      fromQty: item.quantity,
      toQty: 0,
      reason: check.reason || 'Item removed because it is unavailable',
    });
  }

  return {
    items: nextItems,
    changes,
  };
}
