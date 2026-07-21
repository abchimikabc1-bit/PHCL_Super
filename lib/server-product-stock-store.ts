import { getRuntimeStoreState, updateRuntimeStoreState } from '@/lib/db';
import {
  createDefaultProductStockConfig,
  sanitizeProductStockAudit,
  sanitizeProductStockConfig,
  type ProductStock,
  type ProductStockAuditEntry,
  type ProductStockConfig,
  type ProductStockPurchaseItem,
} from '@/lib/admin-product-stock';

const MAX_AUDIT_ENTRIES = 120;

const appendAudit = (events: ProductStockAuditEntry[], entry: ProductStockAuditEntry): ProductStockAuditEntry[] =>
  [...events, entry].slice(-MAX_AUDIT_ENTRIES);

export const getServerProductStockConfig = (): ProductStockConfig => {
  const state = getRuntimeStoreState();
  return sanitizeProductStockConfig(state.product_stock_config) ?? createDefaultProductStockConfig();
};

export const getServerProductStockAudit = (): ProductStockAuditEntry[] => {
  const state = getRuntimeStoreState();
  return sanitizeProductStockAudit(state.product_stock_audit);
};

export const saveServerProductStockConfig = (
  config: ProductStockConfig,
  actor = 'admin'
): { config: ProductStockConfig; audit: ProductStockAuditEntry[] } => {
  const normalized = {
    ...(sanitizeProductStockConfig(config) ?? createDefaultProductStockConfig()),
    updatedAt: new Date().toISOString(),
  };

  const next = updateRuntimeStoreState((state) => {
    const currentAudit = sanitizeProductStockAudit(state.product_stock_audit);
    state.product_stock_config = normalized;
    state.product_stock_audit = appendAudit(currentAudit, {
      timestamp: new Date().toISOString(),
      actor,
      action: 'bulk_update',
      changedProducts: Object.keys(normalized.products),
    });
  });

  return {
    config: sanitizeProductStockConfig(next.product_stock_config) ?? createDefaultProductStockConfig(),
    audit: sanitizeProductStockAudit(next.product_stock_audit),
  };
};

export const updateServerProductStock = (
  productId: string,
  updates: Partial<ProductStock>,
  actor = 'admin'
): { config: ProductStockConfig; audit: ProductStockAuditEntry[]; updated: ProductStock | null } => {
  let updatedStock: ProductStock | null = null;

  const next = updateRuntimeStoreState((state) => {
    const config = sanitizeProductStockConfig(state.product_stock_config) ?? createDefaultProductStockConfig();
    const current = config.products[productId];
    if (!current) {
      state.product_stock_config = config;
      return;
    }

    const oldStock = current.stock;
    const oldEnabled = current.enabledForSale;
    updatedStock = {
      ...current,
      ...updates,
      lastRestockedAt: updates.stock !== undefined ? new Date().toISOString() : current.lastRestockedAt,
    };
    config.products[productId] = updatedStock;
    config.updatedAt = new Date().toISOString();

    let action = 'updated_stock';
    if (updates.enabledForSale !== undefined && oldEnabled !== updates.enabledForSale) {
      action = updates.enabledForSale ? 'enabled_product' : 'disabled_product';
    }

    const currentAudit = sanitizeProductStockAudit(state.product_stock_audit);
    state.product_stock_config = config;
    state.product_stock_audit = appendAudit(currentAudit, {
      timestamp: new Date().toISOString(),
      actor,
      action,
      productId,
      productName: updatedStock.productName,
      stockChangedFrom: updates.stock !== undefined ? oldStock : undefined,
      stockChangedTo: updates.stock !== undefined ? updates.stock : undefined,
    });
  });

  return {
    config: sanitizeProductStockConfig(next.product_stock_config) ?? createDefaultProductStockConfig(),
    audit: sanitizeProductStockAudit(next.product_stock_audit),
    updated: updatedStock,
  };
};

export const applyServerProductStockPurchase = (
  items: ProductStockPurchaseItem[],
  actor = 'system'
): { success: boolean; reason?: string; config: ProductStockConfig; audit: ProductStockAuditEntry[] } => {
  let resultReason: string | undefined;

  const next = updateRuntimeStoreState((state) => {
    const config = sanitizeProductStockConfig(state.product_stock_config) ?? createDefaultProductStockConfig();
    const currentAudit = sanitizeProductStockAudit(state.product_stock_audit);

    for (const item of items) {
      const stock = config.products[item.productId];
      if (!stock) {
        resultReason = `Product ${item.productId} not found`;
        state.product_stock_config = config;
        return;
      }
      if (!stock.enabledForSale) {
        resultReason = `${stock.productName} is unavailable for purchase`;
        state.product_stock_config = config;
        return;
      }
      if (stock.stock !== -1 && stock.stock < item.quantity) {
        resultReason = `Only ${stock.stock} ${stock.stock === 1 ? 'unit' : 'units'} available for ${stock.productName}`;
        state.product_stock_config = config;
        return;
      }
    }

    let audit = currentAudit;
    const now = new Date().toISOString();
    for (const item of items) {
      const stock = config.products[item.productId];
      if (!stock || stock.stock === -1) continue;
      const updatedStockValue = Math.max(0, stock.stock - item.quantity);
      config.products[item.productId] = {
        ...stock,
        stock: updatedStockValue,
        enabledForSale: updatedStockValue > 0,
        lastRestockedAt: stock.lastRestockedAt,
      };
      audit = appendAudit(audit, {
        timestamp: now,
        actor,
        action: 'sold_stock',
        productId: item.productId,
        productName: stock.productName,
        stockChangedFrom: stock.stock,
        stockChangedTo: updatedStockValue,
      });
    }

    config.updatedAt = now;
    state.product_stock_config = config;
    state.product_stock_audit = audit;
  });

  return {
    success: !resultReason,
    reason: resultReason,
    config: sanitizeProductStockConfig(next.product_stock_config) ?? createDefaultProductStockConfig(),
    audit: sanitizeProductStockAudit(next.product_stock_audit),
  };
};

export const revertServerProductStockPurchase = (
  items: ProductStockPurchaseItem[],
  actor = 'system_refund'
): { success: boolean; reason?: string; config: ProductStockConfig; audit: ProductStockAuditEntry[] } => {
  let resultReason: string | undefined;

  const next = updateRuntimeStoreState((state) => {
    const config = sanitizeProductStockConfig(state.product_stock_config) ?? createDefaultProductStockConfig();
    let audit = sanitizeProductStockAudit(state.product_stock_audit);
    const now = new Date().toISOString();

    for (const item of items) {
      const stock = config.products[item.productId];
      if (!stock) {
        resultReason = `Product ${item.productId} not found`;
        state.product_stock_config = config;
        return;
      }
      if (stock.stock === -1) continue;
      const safeQty = Math.max(0, Math.floor(item.quantity));
      const updatedStockValue = Math.max(0, stock.stock + safeQty);
      config.products[item.productId] = {
        ...stock,
        stock: updatedStockValue,
        enabledForSale: updatedStockValue > 0 ? true : stock.enabledForSale,
      };
      audit = appendAudit(audit, {
        timestamp: now,
        actor,
        action: 'restocked_refund',
        productId: item.productId,
        productName: stock.productName,
        stockChangedFrom: stock.stock,
        stockChangedTo: updatedStockValue,
      });
    }

    config.updatedAt = now;
    state.product_stock_config = config;
    state.product_stock_audit = audit;
  });

  return {
    success: !resultReason,
    reason: resultReason,
    config: sanitizeProductStockConfig(next.product_stock_config) ?? createDefaultProductStockConfig(),
    audit: sanitizeProductStockAudit(next.product_stock_audit),
  };
};