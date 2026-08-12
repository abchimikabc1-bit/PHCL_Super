import { getRuntimeStoreState, updateRuntimeStoreState } from '@/lib/db';
import type { CommerceStatePayload, CommerceSyncPayload } from '@/lib/commerce-sync';
import {
  sanitizeAdminCurrencyAudit,
  sanitizeAdminCurrencyConfig,
  type AdminCurrencyAuditEntry,
  type AdminCurrencyConfig,
} from '@/lib/admin-currency-rates';
import {
  sanitizeAdminLanguageAudit,
  sanitizeAdminLanguageConfig,
  type AdminLanguageAuditEntry,
  type AdminLanguageConfig,
} from '@/lib/admin-language-settings';
import { sanitizeCartItems, type CartStorageItem } from '@/lib/cart-storage';
import {
  sanitizeCustomerOverrideMap,
  sanitizeDeliveredAtMap,
  sanitizeOrderStatusAudit,
  sanitizeOrderStatusMap,
  type CustomerContactOverride,
  type OrderWorkflowAuditEntry,
  type OrderWorkflowStatus,
} from '@/lib/admin-order-meta-storage';
import {
  sanitizeAdminSettings,
  sanitizeAdminSettingsAudit,
  type AdminSettingsAuditEntry,
  type AdminSystemSettings,
} from '@/lib/admin-settings';
import { sanitizeStoredOrder } from '@/lib/order-storage';
import {
  sanitizeWalletLedgerEntry,
  sanitizeWalletSnapshot,
  type WalletLedgerEntry,
  type WalletSnapshot,
} from '@/lib/wallet-storage';

const MAX_ORDERS = 25;
const MAX_LEDGER_ITEMS = 120;
const MAX_CART_ITEMS = 100;

const sanitizeCartPayload = (input: unknown): CartStorageItem[] => sanitizeCartItems(input).slice(0, MAX_CART_ITEMS);
const sanitizeCartRows = (input: unknown): Record<string, unknown>[] =>
  sanitizeCartPayload(input).map((item) => ({ ...item }));

const sanitizeOrders = (input: unknown): ReturnType<typeof sanitizeStoredOrder>[] => {
  if (!Array.isArray(input)) return [];

  const next = input
    .map((entry) => sanitizeStoredOrder(entry))
    .filter((entry): entry is NonNullable<ReturnType<typeof sanitizeStoredOrder>> => !!entry)
    .slice(0, MAX_ORDERS);

  return next;
};

const sanitizeWalletLedger = (input: unknown): WalletLedgerEntry[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => sanitizeWalletLedgerEntry(entry))
    .filter((entry): entry is WalletLedgerEntry => !!entry)
    .slice(0, MAX_LEDGER_ITEMS);
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? { ...(value as Record<string, unknown>) } : {};
const toRecordArray = (values: unknown[]): Record<string, unknown>[] => values.map((value) => toRecord(value));

export const getServerCommerceSnapshot = (): CommerceStatePayload => {
  const state = getRuntimeStoreState();

  return {
    revision: Number.isFinite(Number(state.commerce_revision)) ? Number(state.commerce_revision) : 0,
    updatedAt: typeof state.commerce_updated_at === 'string' ? state.commerce_updated_at : new Date(0).toISOString(),
    cartItems: sanitizeCartPayload(state.cart_items),
    adminSettings: sanitizeAdminSettings(state.admin_settings),
    adminSettingsAudit: sanitizeAdminSettingsAudit(state.admin_settings_audit) as AdminSettingsAuditEntry[],
    currencyConfig: sanitizeAdminCurrencyConfig(state.currency_config) as AdminCurrencyConfig,
    currencyAudit: sanitizeAdminCurrencyAudit(state.currency_audit) as AdminCurrencyAuditEntry[],
    languageConfig: sanitizeAdminLanguageConfig(state.language_config) as AdminLanguageConfig,
    languageAudit: sanitizeAdminLanguageAudit(state.language_audit) as AdminLanguageAuditEntry[],
    orders: sanitizeOrders(state.commerce_orders),
    walletSnapshot: sanitizeWalletSnapshot(state.wallet_snapshot),
    walletLedger: sanitizeWalletLedger(state.wallet_ledger),
    orderStatusMap: sanitizeOrderStatusMap(state.order_status_map) as Record<string, OrderWorkflowStatus>,
    orderStatusAudit: sanitizeOrderStatusAudit(state.order_status_audit) as OrderWorkflowAuditEntry[],
    customerOverrideMap: sanitizeCustomerOverrideMap(state.customer_override_map) as Record<string, CustomerContactOverride>,
    deliveredAtMap: sanitizeDeliveredAtMap(state.delivered_at_map),
  };
};

export const saveServerCommerceSnapshot = (payload: CommerceSyncPayload): CommerceStatePayload => {
  const nowIso = new Date().toISOString();
  const nextState = updateRuntimeStoreState((state) => {
    if (payload.cartItems) {
      state.cart_items = sanitizeCartRows(payload.cartItems);
    }

    if (payload.adminSettings !== undefined) {
      const nextAdminSettings = sanitizeAdminSettings(payload.adminSettings);
      state.admin_settings = nextAdminSettings ? toRecord(nextAdminSettings) : null;
    }

    if (payload.adminSettingsAudit) {
      state.admin_settings_audit = toRecordArray(sanitizeAdminSettingsAudit(payload.adminSettingsAudit));
    }

    if (payload.currencyConfig !== undefined) {
      const nextCurrencyConfig = sanitizeAdminCurrencyConfig(payload.currencyConfig);
      state.currency_config = nextCurrencyConfig ? toRecord(nextCurrencyConfig) : null;
    }

    if (payload.currencyAudit) {
      state.currency_audit = toRecordArray(sanitizeAdminCurrencyAudit(payload.currencyAudit));
    }

    if (payload.languageConfig !== undefined) {
      const nextLanguageConfig = sanitizeAdminLanguageConfig(payload.languageConfig);
      state.language_config = nextLanguageConfig ? toRecord(nextLanguageConfig) : null;
    }

    if (payload.languageAudit) {
      state.language_audit = toRecordArray(sanitizeAdminLanguageAudit(payload.languageAudit));
    }

    if (payload.orders) {
      state.commerce_orders = toRecordArray(sanitizeOrders(payload.orders));
    }

    if (payload.walletSnapshot !== undefined) {
      const nextWalletSnapshot = sanitizeWalletSnapshot(payload.walletSnapshot);
      state.wallet_snapshot = nextWalletSnapshot ? toRecord(nextWalletSnapshot) : null;
    }

    if (payload.walletLedger) {
      state.wallet_ledger = toRecordArray(sanitizeWalletLedger(payload.walletLedger));
    }

    if (payload.orderStatusMap) {
      state.order_status_map = sanitizeOrderStatusMap(payload.orderStatusMap);
    }

    if (payload.orderStatusAudit) {
      state.order_status_audit = toRecordArray(sanitizeOrderStatusAudit(payload.orderStatusAudit));
    }

    if (payload.customerOverrideMap) {
      state.customer_override_map = sanitizeCustomerOverrideMap(payload.customerOverrideMap);
    }

    if (payload.deliveredAtMap) {
      state.delivered_at_map = sanitizeDeliveredAtMap(payload.deliveredAtMap);
    }

    state.commerce_revision = Math.max(0, Number(state.commerce_revision) || 0) + 1;
    state.commerce_updated_at = nowIso;
  });

  return {
    revision: Number.isFinite(Number(nextState.commerce_revision)) ? Number(nextState.commerce_revision) : 0,
    updatedAt: typeof nextState.commerce_updated_at === 'string' ? nextState.commerce_updated_at : nowIso,
    cartItems: sanitizeCartPayload(nextState.cart_items),
    adminSettings: sanitizeAdminSettings(nextState.admin_settings),
    adminSettingsAudit: sanitizeAdminSettingsAudit(nextState.admin_settings_audit) as AdminSettingsAuditEntry[],
    currencyConfig: sanitizeAdminCurrencyConfig(nextState.currency_config) as AdminCurrencyConfig,
    currencyAudit: sanitizeAdminCurrencyAudit(nextState.currency_audit) as AdminCurrencyAuditEntry[],
    languageConfig: sanitizeAdminLanguageConfig(nextState.language_config) as AdminLanguageConfig,
    languageAudit: sanitizeAdminLanguageAudit(nextState.language_audit) as AdminLanguageAuditEntry[],
    orders: sanitizeOrders(nextState.commerce_orders),
    walletSnapshot: sanitizeWalletSnapshot(nextState.wallet_snapshot),
    walletLedger: sanitizeWalletLedger(nextState.wallet_ledger),
    orderStatusMap: sanitizeOrderStatusMap(nextState.order_status_map) as Record<string, OrderWorkflowStatus>,
    orderStatusAudit: sanitizeOrderStatusAudit(nextState.order_status_audit) as OrderWorkflowAuditEntry[],
    customerOverrideMap: sanitizeCustomerOverrideMap(nextState.customer_override_map) as Record<string, CustomerContactOverride>,
    deliveredAtMap: sanitizeDeliveredAtMap(nextState.delivered_at_map),
  };
};