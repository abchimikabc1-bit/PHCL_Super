export interface StoredOrder {
  id: string;
  createdAt: string;
  itemCount: number;
  totalUsd: number;
  paymentMethod: 'usd' | 'tzs' | 'ntzs' | 'pi';
  displayCurrency: 'usd' | 'tzs' | 'ntzs' | 'pi';
  items?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
  }>;
  customer?: {
    fullName: string;
    phone: string;
    addressLine1: string;
    city: string;
    country: string;
  };
  audit?: {
    schemaVersion: number;
    sourceRoute: string;
    channel: 'web';
    recordedAt: string;
    reorderSourceOrderId?: string;
    mobilePayment?: {
      network: 'mpesa' | 'tigopesa' | 'airtelmoney' | 'halopesa';
      phone: string;
    };
    consent?: {
      agreedToTerms: boolean;
      agreedToPrivacy: boolean;
      agreedAt: string;
      termsVersion: string;
      privacyVersion: string;
    };
  };
  integrityHash?: string;
}

export interface OrderIntegrityReport {
  validOrders: StoredOrder[];
  rejectedOrders: number;
  totalRead: number;
  rejectedSamples: string[];
}

export interface OrderIntegrityEvent {
  timestamp: string;
  reason: string;
}

const ORDER_STORAGE_KEY = 'phcl_orders';
export const ORDERS_UPDATED_EVENT = 'phcl-orders-updated';
export const REORDER_SOURCE_KEY = 'phcl_reorder_source_order_id';
const ORDER_INTEGRITY_LOG_KEY = 'phcl_order_integrity_events';
const MAX_ORDERS = 25;
const MAX_ORDER_ITEMS = 120;
const ORDER_SCHEMA_VERSION = 4;
const MAX_INTEGRITY_EVENTS = 30;

const canUseStorage = (): boolean => typeof window !== 'undefined' && !!window.localStorage;

const isCurrency = (value: unknown): value is 'usd' | 'tzs' | 'ntzs' | 'pi' =>
  value === 'usd' || value === 'tzs' || value === 'ntzs' || value === 'pi';

const trimText = (value: unknown, max = 180): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const computeHashHex = (input: string): string => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const computeOrderIntegrityHash = (
  order: Omit<StoredOrder, 'integrityHash'>
): string => {
  const payload = {
    id: order.id,
    createdAt: order.createdAt,
    itemCount: order.itemCount,
    totalUsd: order.totalUsd,
    paymentMethod: order.paymentMethod,
    displayCurrency: order.displayCurrency,
    items: order.items ?? [],
    customer: order.customer ?? null,
    audit: order.audit ?? null,
  };

  return computeHashHex(JSON.stringify(payload));
};

const normalizeOrderItems = (
  items: unknown
): Array<{ id: string; name: string; price: number; quantity: number; image?: string }> | undefined => {
  if (!Array.isArray(items)) return undefined;

  const safeItems: Array<{ id: string; name: string; price: number; quantity: number; image?: string }> = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as {
      id?: unknown;
      name?: unknown;
      price?: unknown;
      quantity?: unknown;
      image?: unknown;
    };

    const id = trimText(row.id, 80);
    const name = trimText(row.name, 140);
    const price = Number(row.price);
    const quantity = Number(row.quantity);

    if (!id || !name || !Number.isFinite(price) || !Number.isFinite(quantity)) continue;

    safeItems.push({
      id,
      name,
      price: Math.max(0, Number(price.toFixed(2))),
      quantity: Math.min(999, Math.max(1, Math.floor(quantity))),
      image: trimText(row.image, 600) || undefined,
    });

    if (safeItems.length >= MAX_ORDER_ITEMS) break;
  }

  return safeItems;
};

const normalizeOrder = (raw: unknown): { order: StoredOrder | null; reason?: string } => {
  if (!raw || typeof raw !== 'object') return { order: null, reason: 'invalid-object' };

  const row = raw as {
    id?: unknown;
    createdAt?: unknown;
    itemCount?: unknown;
    totalUsd?: unknown;
    paymentMethod?: unknown;
    displayCurrency?: unknown;
    items?: unknown;
    customer?: unknown;
    audit?: unknown;
    integrityHash?: unknown;
  };

  const id = trimText(row.id, 100);
  const createdAt = trimText(row.createdAt, 60);
  const totalUsd = Number(row.totalUsd);

  if (!id || !createdAt || !Number.isFinite(totalUsd)) {
    return { order: null, reason: 'invalid-core-fields' };
  }
  if (!isCurrency(row.paymentMethod) || !isCurrency(row.displayCurrency)) {
    return { order: null, reason: 'invalid-currency' };
  }

  const items = normalizeOrderItems(row.items);
  const normalizedCount = items
    ? items.reduce((sum, item) => sum + item.quantity, 0)
    : Math.min(9999, Math.max(1, Math.floor(Number(row.itemCount) || 0)));

  let customer:
    | {
        fullName: string;
        phone: string;
        addressLine1: string;
        city: string;
        country: string;
      }
    | undefined;

  if (row.customer && typeof row.customer === 'object') {
    const c = row.customer as {
      fullName?: unknown;
      phone?: unknown;
      addressLine1?: unknown;
      city?: unknown;
      country?: unknown;
    };

    const fullName = trimText(c.fullName, 120);
    const phone = trimText(c.phone, 40);
    const addressLine1 = trimText(c.addressLine1, 200);
    const city = trimText(c.city, 80);
    const country = trimText(c.country, 80);

    if (fullName && phone && addressLine1 && city && country) {
      customer = { fullName, phone, addressLine1, city, country };
    }
  }

  let reorderSourceOrderId: string | undefined;
  let sourceRoute = '/checkout';
  let recordedAt = createdAt;
  let mobilePayment:
    | {
        network: 'mpesa' | 'tigopesa' | 'airtelmoney' | 'halopesa';
        phone: string;
      }
    | undefined;
  let consent:
    | {
        agreedToTerms: boolean;
        agreedToPrivacy: boolean;
        agreedAt: string;
        termsVersion: string;
        privacyVersion: string;
      }
    | undefined;

  if (row.audit && typeof row.audit === 'object') {
    const audit = row.audit as {
      sourceRoute?: unknown;
      recordedAt?: unknown;
      reorderSourceOrderId?: unknown;
      mobilePayment?: unknown;
      consent?: unknown;
    };
    sourceRoute = trimText(audit.sourceRoute, 80) || '/checkout';
    recordedAt = trimText(audit.recordedAt, 60) || createdAt;
    reorderSourceOrderId = trimText(audit.reorderSourceOrderId, 100) || undefined;

    if (audit.mobilePayment && typeof audit.mobilePayment === 'object') {
      const rawMobile = audit.mobilePayment as {
        network?: unknown;
        phone?: unknown;
      };
      const rawNetwork = trimText(rawMobile.network, 40).toLowerCase();
      const phone = trimText(rawMobile.phone, 40).replace(/[\s()-]/g, '');
      const network =
        rawNetwork === 'mpesa' ||
        rawNetwork === 'tigopesa' ||
        rawNetwork === 'airtelmoney' ||
        rawNetwork === 'halopesa'
          ? rawNetwork
          : '';

      if (network && /^\+?[0-9]{10,15}$/.test(phone)) {
        mobilePayment = {
          network,
          phone,
        };
      }
    }

    if (audit.consent && typeof audit.consent === 'object') {
      const rawConsent = audit.consent as {
        agreedToTerms?: unknown;
        agreedToPrivacy?: unknown;
        agreedAt?: unknown;
        termsVersion?: unknown;
        privacyVersion?: unknown;
      };

      const agreedAt = trimText(rawConsent.agreedAt, 60);
      const termsVersion = trimText(rawConsent.termsVersion, 32);
      const privacyVersion = trimText(rawConsent.privacyVersion, 32);
      if (agreedAt && termsVersion && privacyVersion) {
        consent = {
          agreedToTerms: rawConsent.agreedToTerms === true,
          agreedToPrivacy: rawConsent.agreedToPrivacy === true,
          agreedAt,
          termsVersion,
          privacyVersion,
        };
      }
    }
  }

  const normalizedWithoutHash: Omit<StoredOrder, 'integrityHash'> = {
    id,
    createdAt,
    itemCount: normalizedCount,
    totalUsd: Math.max(0, Number(totalUsd.toFixed(2))),
    paymentMethod: row.paymentMethod,
    displayCurrency: row.displayCurrency,
    items,
    customer,
    audit: {
      schemaVersion: ORDER_SCHEMA_VERSION,
      sourceRoute,
      channel: 'web',
      recordedAt,
      reorderSourceOrderId,
      mobilePayment,
      consent,
    },
  };

  const computedHash = computeOrderIntegrityHash(normalizedWithoutHash);
  const providedHash = trimText(row.integrityHash, 32);
  if (providedHash && providedHash !== computedHash) {
    return { order: null, reason: 'hash-mismatch' };
  }

  return {
    order: {
      ...normalizedWithoutHash,
      integrityHash: providedHash || computedHash,
    },
  };
};

export const getOrders = (): StoredOrder[] => {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(ORDER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const report = getOrderIntegrityReportFromParsed(parsed);
    return report.validOrders;
  } catch {
    return [];
  }
};

const getOrderIntegrityReportFromParsed = (parsed: unknown[]): OrderIntegrityReport => {
  let rejectedOrders = 0;
  const validOrders: StoredOrder[] = [];
  const rejectedSamples: string[] = [];

  for (const entry of parsed) {
    const { order, reason } = normalizeOrder(entry);
    if (!order) {
      rejectedOrders += 1;
      if (reason && rejectedSamples.length < 5) {
        rejectedSamples.push(reason);
      }
      continue;
    }

    validOrders.push(order);
    if (validOrders.length >= MAX_ORDERS) break;
  }

  return {
    validOrders,
    rejectedOrders,
    totalRead: parsed.length,
    rejectedSamples,
  };
};

const appendIntegrityEvents = (events: string[]): void => {
  if (!canUseStorage() || events.length === 0) return;

  try {
    const raw = window.localStorage.getItem(ORDER_INTEGRITY_LOG_KEY);
    const current = raw ? JSON.parse(raw) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const mapped = events.map((reason) => ({
      timestamp: new Date().toISOString(),
      reason,
    }));

    const next = [...mapped, ...safeCurrent]
      .slice(0, MAX_INTEGRITY_EVENTS)
      .map((entry) => ({
        timestamp: trimText((entry as { timestamp?: unknown }).timestamp, 60),
        reason: trimText((entry as { reason?: unknown }).reason, 120),
      }))
      .filter((entry) => entry.timestamp && entry.reason);

    window.localStorage.setItem(ORDER_INTEGRITY_LOG_KEY, JSON.stringify(next));
  } catch {
    // Ignore telemetry write failures.
  }
};

export const getOrderIntegrityEvents = (): OrderIntegrityEvent[] => {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(ORDER_INTEGRITY_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => ({
        timestamp: trimText((entry as { timestamp?: unknown }).timestamp, 60),
        reason: trimText((entry as { reason?: unknown }).reason, 120),
      }))
      .filter((entry) => entry.timestamp && entry.reason)
      .slice(0, MAX_INTEGRITY_EVENTS);
  } catch {
    return [];
  }
};

export const getOrderIntegrityReport = (): OrderIntegrityReport => {
  if (!canUseStorage()) {
    return { validOrders: [], rejectedOrders: 0, totalRead: 0, rejectedSamples: [] };
  }

  try {
    const raw = window.localStorage.getItem(ORDER_STORAGE_KEY);
    if (!raw) return { validOrders: [], rejectedOrders: 0, totalRead: 0, rejectedSamples: [] };

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      appendIntegrityEvents(['invalid-storage-shape']);
      return { validOrders: [], rejectedOrders: 1, totalRead: 1, rejectedSamples: ['invalid-storage-shape'] };
    }

    const report = getOrderIntegrityReportFromParsed(parsed);
    appendIntegrityEvents(report.rejectedSamples);
    return report;
  } catch {
    appendIntegrityEvents(['storage-parse-failure']);
    return { validOrders: [], rejectedOrders: 1, totalRead: 1, rejectedSamples: ['storage-parse-failure'] };
  }
};

export const saveOrder = (order: StoredOrder): StoredOrder[] => {
  if (!canUseStorage()) return [];
  const normalized = normalizeOrder(order).order;
  if (!normalized) return getOrders();

  const current = getOrders();
  const next = [normalized, ...current].slice(0, MAX_ORDERS);
  window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(ORDERS_UPDATED_EVENT));
  return next;
};
