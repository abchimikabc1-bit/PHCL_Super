import type {
  CartStorageItem,
} from '@/lib/cart-storage';

import type {
  AdminCurrencyAuditEntry,
  AdminCurrencyConfig,
} from '@/lib/admin-currency-rates';

import type {
  AdminLanguageAuditEntry,
  AdminLanguageConfig,
} from '@/lib/admin-language-settings';

import type {
  StoredOrder,
} from '@/lib/order-storage';

import type {
  CustomerContactOverride,
  OrderWorkflowAuditEntry,
  OrderWorkflowStatus,
} from '@/lib/admin-order-meta-storage';

import type {
  AdminSettingsAuditEntry,
  AdminSystemSettings,
} from '@/lib/admin-settings';

import type {
  WalletLedgerEntry,
  WalletSnapshot,
} from '@/lib/wallet-storage';

/**
 * ============================================================
 * PHCL SUPER — LEGACY COMMERCE SYNC COMPATIBILITY LAYER
 * ============================================================
 *
 * SECURITY STATUS:
 *
 * Legacy browser-to-server commerce snapshot synchronization
 * has been intentionally DISABLED.
 *
 * The previous implementation allowed the browser to send and
 * hydrate a combined commerce snapshot containing data such as:
 *
 * - orders
 * - wallet balances/snapshots
 * - wallet ledger entries
 * - admin configuration
 * - audit entries
 * - order workflow state
 *
 * Those domains must NOT use a browser-controlled shared snapshot
 * as their source of truth.
 *
 * PHCL authoritative state must instead be handled by dedicated
 * authenticated server services / APIs with:
 *
 * - Firebase identity verification
 * - authorization / role enforcement
 * - server-authoritative financial ledger
 * - server-authoritative stock
 * - server-authoritative orders
 * - immutable / controlled audit trails
 * - transaction and idempotency protection
 *
 * This file temporarily preserves the public TypeScript API used
 * by legacy callers while preventing any request to:
 *
 *   /api/commerce/sync
 *
 * Do not restore network synchronization here.
 *
 * Each legacy domain should be migrated independently to its
 * dedicated secure server API before this compatibility layer is
 * eventually removed.
 */

export interface CommerceStatePayload {
  revision: number;

  updatedAt: string;

  cartItems:
    CartStorageItem[];

  adminSettings:
    AdminSystemSettings |
    null;

  adminSettingsAudit:
    AdminSettingsAuditEntry[];

  currencyConfig:
    AdminCurrencyConfig |
    null;

  currencyAudit:
    AdminCurrencyAuditEntry[];

  languageConfig:
    AdminLanguageConfig |
    null;

  languageAudit:
    AdminLanguageAuditEntry[];

  orders:
    StoredOrder[];

  walletSnapshot:
    WalletSnapshot |
    null;

  walletLedger:
    WalletLedgerEntry[];

  orderStatusMap:
    Record<
      string,
      OrderWorkflowStatus
    >;

  orderStatusAudit:
    OrderWorkflowAuditEntry[];

  customerOverrideMap:
    Record<
      string,
      CustomerContactOverride
    >;

  deliveredAtMap:
    Record<
      string,
      string
    >;
}

export interface CommerceSyncPayload {
  expectedRevision?:
    number;

  cartItems?:
    CartStorageItem[];

  adminSettings?:
    AdminSystemSettings |
    null;

  adminSettingsAudit?:
    AdminSettingsAuditEntry[];

  currencyConfig?:
    AdminCurrencyConfig |
    null;

  currencyAudit?:
    AdminCurrencyAuditEntry[];

  languageConfig?:
    AdminLanguageConfig |
    null;

  languageAudit?:
    AdminLanguageAuditEntry[];

  orders?:
    StoredOrder[];

  walletSnapshot?:
    WalletSnapshot |
    null;

  walletLedger?:
    WalletLedgerEntry[];

  orderStatusMap?:
    Record<
      string,
      OrderWorkflowStatus
    >;

  orderStatusAudit?:
    OrderWorkflowAuditEntry[];

  customerOverrideMap?:
    Record<
      string,
      CustomerContactOverride
    >;

  deliveredAtMap?:
    Record<
      string,
      string
    >;
}

/**
 * Legacy revision retained only for API compatibility.
 *
 * No network-backed commerce snapshot is accepted or hydrated.
 */
let latestCommerceRevision =
  0;

/**
 * Legacy compatibility function.
 *
 * SECURITY:
 * This function intentionally performs NO network request.
 *
 * Browser state must never be allowed to overwrite authoritative:
 *
 * - financial balances
 * - ledger entries
 * - orders
 * - stock
 * - admin configuration
 * - audit history
 *
 * Individual secure APIs will replace the old shared sync model.
 */
export const syncCommerceStateToServer = (
  _payload:
    CommerceSyncPayload,
): void => {
  /**
   * Intentionally disabled.
   *
   * Do not call:
   *
   *   POST /api/commerce/sync
   */
};

/**
 * Legacy compatibility function.
 *
 * SECURITY:
 * Shared commerce-state hydration from the legacy endpoint is
 * intentionally disabled.
 *
 * Authoritative domains must load through their dedicated secure
 * APIs instead.
 */
export const hydrateCommerceStateFromServer =
  async (): Promise<
    CommerceStatePayload |
    null
  > => {
    /**
     * Intentionally disabled.
     *
     * Do not call:
     *
     *   GET /api/commerce/sync
     */
    return null;
  };

/**
 * Retained temporarily for callers that still track the legacy
 * revision value.
 */
export const getLatestCommerceRevision =
  (): number =>
    latestCommerceRevision;

/**
 * Internal compatibility helper.
 *
 * This does not synchronize anything and is intentionally not
 * exported.
 *
 * Keeping revision state constrained to this module prevents
 * browser-controlled network snapshots from becoming authoritative.
 */
const resetLegacyCommerceRevision =
  (): void => {
    latestCommerceRevision =
      0;
  };

void resetLegacyCommerceRevision;