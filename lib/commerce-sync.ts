import type { CartStorageItem } from '@/lib/cart-storage';
import type { AdminCurrencyAuditEntry, AdminCurrencyConfig } from '@/lib/admin-currency-rates';
import type { AdminLanguageAuditEntry, AdminLanguageConfig } from '@/lib/admin-language-settings';
import type { StoredOrder } from '@/lib/order-storage';
import type {
  CustomerContactOverride,
  OrderWorkflowAuditEntry,
  OrderWorkflowStatus,
} from '@/lib/admin-order-meta-storage';
import type { AdminSettingsAuditEntry, AdminSystemSettings } from '@/lib/admin-settings';
import type { WalletLedgerEntry, WalletSnapshot } from '@/lib/wallet-storage';

export interface CommerceStatePayload {
  revision: number;
  updatedAt: string;
  cartItems: CartStorageItem[];
  adminSettings: AdminSystemSettings | null;
  adminSettingsAudit: AdminSettingsAuditEntry[];
  currencyConfig: AdminCurrencyConfig | null;
  currencyAudit: AdminCurrencyAuditEntry[];
  languageConfig: AdminLanguageConfig | null;
  languageAudit: AdminLanguageAuditEntry[];
  orders: StoredOrder[];
  walletSnapshot: WalletSnapshot | null;
  walletLedger: WalletLedgerEntry[];
  orderStatusMap: Record<string, OrderWorkflowStatus>;
  orderStatusAudit: OrderWorkflowAuditEntry[];
  customerOverrideMap: Record<string, CustomerContactOverride>;
  deliveredAtMap: Record<string, string>;
}

export interface CommerceSyncPayload {
  expectedRevision?: number;
  cartItems?: CartStorageItem[];
  adminSettings?: AdminSystemSettings | null;
  adminSettingsAudit?: AdminSettingsAuditEntry[];
  currencyConfig?: AdminCurrencyConfig | null;
  currencyAudit?: AdminCurrencyAuditEntry[];
  languageConfig?: AdminLanguageConfig | null;
  languageAudit?: AdminLanguageAuditEntry[];
  orders?: StoredOrder[];
  walletSnapshot?: WalletSnapshot | null;
  walletLedger?: WalletLedgerEntry[];
  orderStatusMap?: Record<string, OrderWorkflowStatus>;
  orderStatusAudit?: OrderWorkflowAuditEntry[];
  customerOverrideMap?: Record<string, CustomerContactOverride>;
  deliveredAtMap?: Record<string, string>;
}

let inflightHydration: Promise<CommerceStatePayload | null> | null = null;
let latestCommerceRevision = 0;

export const syncCommerceStateToServer = (payload: CommerceSyncPayload): void => {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;

  void window.fetch('/api/commerce/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, expectedRevision: latestCommerceRevision }),
    keepalive: true,
  })
    .then(async (response) => {
      if (response.status === 409) {
        const conflict = (await response.json().catch(() => null)) as { snapshot?: CommerceStatePayload } | null;
        if (conflict?.snapshot && typeof conflict.snapshot.revision === 'number') {
          latestCommerceRevision = conflict.snapshot.revision;
        }
        return;
      }

      const next = (await response.json().catch(() => null)) as { success?: boolean; snapshot?: CommerceStatePayload } | null;
      if (next?.success && next.snapshot && typeof next.snapshot.revision === 'number') {
        latestCommerceRevision = next.snapshot.revision;
      }
    })
    .catch(() => {
      // Ignore best-effort mirror failures.
    });
};

export const hydrateCommerceStateFromServer = async (): Promise<CommerceStatePayload | null> => {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return null;

  if (!inflightHydration) {
    inflightHydration = window
      .fetch('/api/commerce/sync', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = (await response.json()) as { success?: boolean; snapshot?: CommerceStatePayload };
        if (payload.success && payload.snapshot && typeof payload.snapshot.revision === 'number') {
          latestCommerceRevision = payload.snapshot.revision;
        }
        return payload.success ? payload.snapshot || null : null;
      })
      .catch(() => null)
      .finally(() => {
        inflightHydration = null;
      });
  }

  return inflightHydration;
};

export const getLatestCommerceRevision = (): number => latestCommerceRevision;