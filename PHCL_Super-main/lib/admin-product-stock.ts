// Product stock management with audit trail
// Storage: phcl_product_stock_config (main), phcl_product_stock_audit (max 120 entries)

import { MARKETPLACE_PRODUCTS } from '@/lib/marketplace-products';

export interface ProductStock {
  productId: string;
  productName: string;
  stock: number; // -1 = unlimited
  enabledForSale: boolean;
  lastRestockedAt: string;
  notes?: string;
}

export interface ProductStockConfig {
  products: Record<string, ProductStock>; // key: productId
  updatedAt: string;
}

export interface ProductStockAuditEntry {
  timestamp: string;
  actor: string;
  action: string; // 'updated_stock', 'enabled_product', 'disabled_product', 'bulk_update', 'sold_stock'
  productId?: string;
  productName?: string;
  stockChangedFrom?: number;
  stockChangedTo?: number;
  changedProducts?: string[]; // for bulk operations
}

export interface ProductStockPurchaseItem {
  productId: string;
  quantity: number;
}

export interface ProductStockHealthSummary {
  totalProducts: number;
  enabledProducts: number;
  unlimitedProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}

const STORAGE_KEY = 'phcl_product_stock_config';
const AUDIT_KEY = 'phcl_product_stock_audit';
const MAX_AUDIT_ENTRIES = 120;

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function createDefaultProductStock(product: (typeof MARKETPLACE_PRODUCTS)[number]): ProductStock {
  return {
    productId: String(product.id),
    productName: product.name,
    stock: product.inStock ? -1 : 0,
    enabledForSale: product.inStock,
    lastRestockedAt: new Date().toISOString(),
  };
}

function normalizeProductConfig(config?: ProductStockConfig): ProductStockConfig {
  const products = MARKETPLACE_PRODUCTS.reduce<Record<string, ProductStock>>((acc, product) => {
    const productId = String(product.id);
    const existing = config?.products?.[productId];

    acc[productId] = existing
      ? {
          ...existing,
          productId,
          productName: product.name,
        }
      : createDefaultProductStock(product);

    return acc;
  }, {});

  return {
    products,
    updatedAt: config?.updatedAt || new Date().toISOString(),
  };
}

function createDefaultConfig(): ProductStockConfig {
  return normalizeProductConfig({
    products: {},
    updatedAt: new Date().toISOString(),
  });
}

export function getProductStockConfig(): ProductStockConfig {
  const storage = getStorage();
  if (!storage) {
    return createDefaultConfig();
  }

  try {
    const stored = storage.getItem(STORAGE_KEY);
    if (stored) {
      return normalizeProductConfig(JSON.parse(stored));
    }
  } catch (err) {
    console.error('Error reading product stock config:', err);
  }

  return createDefaultConfig();
}

export function getProductStock(productId: string): ProductStock | null {
  const config = getProductStockConfig();
  return config.products[productId] || null;
}

export function saveProductStockConfig(
  config: ProductStockConfig,
  actor: string = 'admin'
): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    const updated: ProductStockConfig = {
      ...normalizeProductConfig(config),
      updatedAt: new Date().toISOString(),
    };

    storage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Create audit entry
    const auditEntry: ProductStockAuditEntry = {
      timestamp: new Date().toISOString(),
      actor,
      action: 'bulk_update',
      changedProducts: Object.keys(config.products),
    };

    addAuditEntry(auditEntry);
  } catch (err) {
    console.error('Error saving product stock config:', err);
  }
}

export function updateProductStock(
  productId: string,
  updates: Partial<ProductStock>,
  actor: string = 'admin'
): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    const config = normalizeProductConfig(getProductStockConfig());
    const currentStock = config.products[productId];

    if (!currentStock) {
      console.warn(`Product ${productId} not found in stock config`);
      return;
    }

    const oldStock = currentStock.stock;
    const oldEnabled = currentStock.enabledForSale;

    const updatedStock: ProductStock = {
      ...currentStock,
      ...updates,
      lastRestockedAt: updates.stock !== undefined ? new Date().toISOString() : currentStock.lastRestockedAt,
    };

    config.products[productId] = updatedStock;
    config.updatedAt = new Date().toISOString();

    storage.setItem(STORAGE_KEY, JSON.stringify(config));

    // Determine action type
    let action = 'updated_stock';
    if (updates.enabledForSale !== undefined && oldEnabled !== updates.enabledForSale) {
      action = updates.enabledForSale ? 'enabled_product' : 'disabled_product';
    }

    // Create audit entry
    const auditEntry: ProductStockAuditEntry = {
      timestamp: new Date().toISOString(),
      actor,
      action,
      productId,
      productName: updatedStock.productName,
      stockChangedFrom: updates.stock !== undefined ? oldStock : undefined,
      stockChangedTo: updates.stock !== undefined ? updates.stock : undefined,
    };

    addAuditEntry(auditEntry);
  } catch (err) {
    console.error('Error updating product stock:', err);
  }
}

function addAuditEntry(entry: ProductStockAuditEntry): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    const stored = storage.getItem(AUDIT_KEY);
    let audit: ProductStockAuditEntry[] = [];

    if (stored) {
      audit = JSON.parse(stored);
    }

    audit.push(entry);

    // Keep only last MAX_AUDIT_ENTRIES
    if (audit.length > MAX_AUDIT_ENTRIES) {
      audit = audit.slice(-MAX_AUDIT_ENTRIES);
    }

    storage.setItem(AUDIT_KEY, JSON.stringify(audit));
  } catch (err) {
    console.error('Error adding audit entry:', err);
  }
}

export function getProductStockAudit(): ProductStockAuditEntry[] {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  try {
    const stored = storage.getItem(AUDIT_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error('Error reading product stock audit:', err);
  }

  return [];
}

export function canAddToCart(productId: string, quantity: number = 1): {
  allowed: boolean;
  reason?: string;
  availableStock?: number;
} {
  const stock = getProductStock(productId);

  if (!stock) {
    return { allowed: false, reason: 'Product not found' };
  }

  if (!stock.enabledForSale) {
    return { allowed: false, reason: 'Product is currently unavailable for purchase' };
  }

  if (stock.stock === -1) {
    // Unlimited stock
    return { allowed: true };
  }

  if (stock.stock < quantity) {
    return {
      allowed: false,
      reason: `Only ${stock.stock} ${stock.stock === 1 ? 'unit' : 'units'} available`,
      availableStock: stock.stock,
    };
  }

  return { allowed: true, availableStock: stock.stock - quantity };
}

export function applyProductStockPurchase(
  items: ProductStockPurchaseItem[],
  actor: string = 'system'
): { success: boolean; reason?: string } {
  const storage = getStorage();
  if (!storage) {
    return { success: false, reason: 'Storage is unavailable' };
  }

  try {
    const config = normalizeProductConfig(getProductStockConfig());

    for (const item of items) {
      const stock = config.products[item.productId];
      if (!stock) {
        return { success: false, reason: `Product ${item.productId} not found` };
      }

      if (!stock.enabledForSale) {
        return { success: false, reason: `${stock.productName} is unavailable for purchase` };
      }

      if (stock.stock !== -1 && stock.stock < item.quantity) {
        return {
          success: false,
          reason: `Only ${stock.stock} ${stock.stock === 1 ? 'unit' : 'units'} available for ${stock.productName}`,
        };
      }
    }

    const now = new Date().toISOString();
    for (const item of items) {
      const currentStock = config.products[item.productId];
      if (currentStock.stock === -1) {
        continue;
      }

      const updatedStockValue = Math.max(0, currentStock.stock - item.quantity);
      config.products[item.productId] = {
        ...currentStock,
        stock: updatedStockValue,
        enabledForSale: updatedStockValue > 0,
        lastRestockedAt: currentStock.lastRestockedAt,
      };

      addAuditEntry({
        timestamp: now,
        actor,
        action: 'sold_stock',
        productId: item.productId,
        productName: currentStock.productName,
        stockChangedFrom: currentStock.stock,
        stockChangedTo: updatedStockValue,
      });
    }

    config.updatedAt = now;
    storage.setItem(STORAGE_KEY, JSON.stringify(config));
    return { success: true };
  } catch (err) {
    console.error('Error applying stock purchase:', err);
    return { success: false, reason: 'Could not update stock after purchase' };
  }
}

export function getStockStatus(productId: string): {
  label: string;
  color: string;
  enabled: boolean;
} {
  const stock = getProductStock(productId);

  if (!stock) {
    return { label: 'Unknown', color: 'gray', enabled: false };
  }

  if (!stock.enabledForSale) {
    return { label: 'Unavailable', color: 'red', enabled: false };
  }

  if (stock.stock === 0) {
    return { label: 'Out of Stock', color: 'red', enabled: false };
  }

  if (stock.stock === -1) {
    return { label: 'In Stock', color: 'green', enabled: true };
  }

  if (stock.stock < 5) {
    return { label: `Low Stock (${stock.stock})`, color: 'amber', enabled: true };
  }

  return { label: `In Stock (${stock.stock})`, color: 'green', enabled: true };
}

export function getProductStockHealthSummary(): ProductStockHealthSummary {
  const config = getProductStockConfig();
  const products = Object.values(config.products);

  const summary: ProductStockHealthSummary = {
    totalProducts: products.length,
    enabledProducts: 0,
    unlimitedProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
  };

  for (const product of products) {
    if (product.enabledForSale) {
      summary.enabledProducts += 1;
    }

    if (product.stock === -1 && product.enabledForSale) {
      summary.unlimitedProducts += 1;
    }

    if (!product.enabledForSale || product.stock === 0) {
      summary.outOfStockProducts += 1;
      continue;
    }

    if (product.stock > 0 && product.stock < 5) {
      summary.lowStockProducts += 1;
    }
  }

  return summary;
}

export function getCriticalStockProducts(limit: number = 5): ProductStock[] {
  const config = getProductStockConfig();

  return Object.values(config.products)
    .filter((product) => !product.enabledForSale || product.stock === 0 || (product.stock > 0 && product.stock < 5))
    .sort((a, b) => {
      const score = (stock: ProductStock) => {
        if (!stock.enabledForSale || stock.stock === 0) return 0;
        return stock.stock;
      };

      return score(a) - score(b);
    })
    .slice(0, limit);
}

export function resetProductStockConfig(actor: string = 'admin'): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(STORAGE_KEY);

    const auditEntry: ProductStockAuditEntry = {
      timestamp: new Date().toISOString(),
      actor,
      action: 'bulk_update',
      changedProducts: MARKETPLACE_PRODUCTS.map((product) => String(product.id)),
    };

    addAuditEntry(auditEntry);
  } catch (err) {
    console.error('Error resetting product stock config:', err);
  }
}
