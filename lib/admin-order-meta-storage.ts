import { hydrateCommerceStateFromServer, syncCommerceStateToServer } from '@/lib/commerce-sync';

export type OrderWorkflowStatus = 'new' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderWorkflowAuditEntry {
  changedAt: string;
  orderId: string;
  actor: string;
  fromStatus: OrderWorkflowStatus;
  toStatus: OrderWorkflowStatus;
  reason?: string;
}

export interface CustomerContactOverride {
  fullName: string;
  phone: string;
  addressLine1: string;
  city: string;
  country: string;
}

export const ORDER_STATUS_KEY = 'phcl_admin_order_status_map';
export const ORDER_STATUS_AUDIT_KEY = 'phcl_admin_order_status_audit';
export const ORDER_CUSTOMER_OVERRIDE_KEY = 'phcl_admin_order_customer_overrides';
export const ORDER_DELIVERED_AT_KEY = 'phcl_admin_order_delivered_at';
export const MAX_ORDER_STATUS_AUDIT = 200;

let attemptedAdminMetaHydration = false;

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage;
const trimText = (value: unknown, max = 180): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

export const sanitizeOrderStatusMap = (input: unknown): Record<string, OrderWorkflowStatus> => {
  if (!input || typeof input !== 'object') return {};

  const safe: Record<string, OrderWorkflowStatus> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (
      value === 'new' ||
      value === 'processing' ||
      value === 'packed' ||
      value === 'shipped' ||
      value === 'delivered' ||
      value === 'cancelled'
    ) {
      safe[trimText(key, 120)] = value;
    }
  }

  return safe;
};

const sanitizeAuditEntry = (entry: unknown): OrderWorkflowAuditEntry | null => {
  if (!entry || typeof entry !== 'object') return null;
  const row = entry as Partial<OrderWorkflowAuditEntry>;
  const fromStatus = row.fromStatus;
  const toStatus = row.toStatus;

  if (
    (fromStatus !== 'new' && fromStatus !== 'processing' && fromStatus !== 'packed' && fromStatus !== 'shipped' && fromStatus !== 'delivered' && fromStatus !== 'cancelled') ||
    (toStatus !== 'new' && toStatus !== 'processing' && toStatus !== 'packed' && toStatus !== 'shipped' && toStatus !== 'delivered' && toStatus !== 'cancelled')
  ) {
    return null;
  }

  const changedAt = trimText(row.changedAt, 60);
  const orderId = trimText(row.orderId, 120);
  const actor = trimText(row.actor, 120);
  if (!changedAt || !orderId || !actor) return null;

  return {
    changedAt,
    orderId,
    actor,
    fromStatus,
    toStatus,
    reason: trimText(row.reason, 180) || undefined,
  };
};

export const sanitizeOrderStatusAudit = (input: unknown): OrderWorkflowAuditEntry[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => sanitizeAuditEntry(entry))
    .filter((entry): entry is OrderWorkflowAuditEntry => !!entry)
    .slice(0, MAX_ORDER_STATUS_AUDIT);
};

export const sanitizeCustomerOverrideMap = (input: unknown): Record<string, CustomerContactOverride> => {
  if (!input || typeof input !== 'object') return {};

  const safe: Record<string, CustomerContactOverride> = {};
  for (const [orderId, value] of Object.entries(input as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const row = value as Partial<CustomerContactOverride>;
    const fullName = trimText(row.fullName, 120);
    const phone = trimText(row.phone, 40);
    const addressLine1 = trimText(row.addressLine1, 200);
    const city = trimText(row.city, 80);
    const country = trimText(row.country, 80);

    if (fullName && phone && addressLine1 && city && country) {
      safe[trimText(orderId, 120)] = { fullName, phone, addressLine1, city, country };
    }
  }

  return safe;
};

export const sanitizeDeliveredAtMap = (input: unknown): Record<string, string> => {
  if (!input || typeof input !== 'object') return {};
  const safe: Record<string, string> = {};
  for (const [orderId, value] of Object.entries(input as Record<string, unknown>)) {
    const deliveredAt = trimText(value, 60);
    if (deliveredAt) {
      safe[trimText(orderId, 120)] = deliveredAt;
    }
  }
  return safe;
};

const hydrateAdminMetaFromServer = (): void => {
  if (attemptedAdminMetaHydration || !canUseStorage()) return;
  attemptedAdminMetaHydration = true;

  void hydrateCommerceStateFromServer().then((snapshot) => {
    if (!snapshot) return;

    window.localStorage.setItem(ORDER_STATUS_KEY, JSON.stringify(sanitizeOrderStatusMap(snapshot.orderStatusMap)));
    window.localStorage.setItem(ORDER_STATUS_AUDIT_KEY, JSON.stringify(sanitizeOrderStatusAudit(snapshot.orderStatusAudit)));
    window.localStorage.setItem(ORDER_CUSTOMER_OVERRIDE_KEY, JSON.stringify(sanitizeCustomerOverrideMap(snapshot.customerOverrideMap)));
    window.localStorage.setItem(ORDER_DELIVERED_AT_KEY, JSON.stringify(sanitizeDeliveredAtMap(snapshot.deliveredAtMap)));
  });
};

export const getOrderStatusMap = (): Record<string, OrderWorkflowStatus> => {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(ORDER_STATUS_KEY);
    if (!raw) {
      hydrateAdminMetaFromServer();
      return {};
    }
    return sanitizeOrderStatusMap(JSON.parse(raw));
  } catch {
    hydrateAdminMetaFromServer();
    return {};
  }
};

export const saveOrderStatusMap = (map: Record<string, OrderWorkflowStatus>) => {
  if (!canUseStorage()) return;
  const safe = sanitizeOrderStatusMap(map);
  window.localStorage.setItem(ORDER_STATUS_KEY, JSON.stringify(safe));
  syncCommerceStateToServer({ orderStatusMap: safe });
};

export const getOrderStatusAudit = (): OrderWorkflowAuditEntry[] => {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(ORDER_STATUS_AUDIT_KEY);
    if (!raw) {
      hydrateAdminMetaFromServer();
      return [];
    }
    return sanitizeOrderStatusAudit(JSON.parse(raw));
  } catch {
    hydrateAdminMetaFromServer();
    return [];
  }
};

export const appendOrderStatusAudit = (entry: OrderWorkflowAuditEntry) => {
  if (!canUseStorage()) return;
  const next = [entry, ...getOrderStatusAudit()].slice(0, MAX_ORDER_STATUS_AUDIT);
  const safe = sanitizeOrderStatusAudit(next);
  window.localStorage.setItem(ORDER_STATUS_AUDIT_KEY, JSON.stringify(safe));
  syncCommerceStateToServer({ orderStatusAudit: safe });
};

export const getCustomerOverrideMap = (): Record<string, CustomerContactOverride> => {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(ORDER_CUSTOMER_OVERRIDE_KEY);
    if (!raw) {
      hydrateAdminMetaFromServer();
      return {};
    }
    return sanitizeCustomerOverrideMap(JSON.parse(raw));
  } catch {
    hydrateAdminMetaFromServer();
    return {};
  }
};

export const saveCustomerOverrideMap = (map: Record<string, CustomerContactOverride>) => {
  if (!canUseStorage()) return;
  const safe = sanitizeCustomerOverrideMap(map);
  window.localStorage.setItem(ORDER_CUSTOMER_OVERRIDE_KEY, JSON.stringify(safe));
  syncCommerceStateToServer({ customerOverrideMap: safe });
};

export const getDeliveredAtMap = (): Record<string, string> => {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(ORDER_DELIVERED_AT_KEY);
    if (!raw) {
      hydrateAdminMetaFromServer();
      return {};
    }
    return sanitizeDeliveredAtMap(JSON.parse(raw));
  } catch {
    hydrateAdminMetaFromServer();
    return {};
  }
};

export const saveDeliveredAtMap = (map: Record<string, string>) => {
  if (!canUseStorage()) return;
  const safe = sanitizeDeliveredAtMap(map);
  window.localStorage.setItem(ORDER_DELIVERED_AT_KEY, JSON.stringify(safe));
  syncCommerceStateToServer({ deliveredAtMap: safe });
};
