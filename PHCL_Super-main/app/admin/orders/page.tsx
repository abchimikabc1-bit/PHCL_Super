'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { convertAmount, formatCurrencyAmount } from '@/components/marketplace/currency-utils';
import {
  OrderIntegrityEvent,
  ORDERS_UPDATED_EVENT,
  StoredOrder,
  getOrderIntegrityEvents,
  getOrderIntegrityReport,
} from '@/lib/order-storage';
import { clearDemoOrdersInStorage, DEMO_ORDER_IDS, seedDemoOrdersInStorage } from '@/lib/demo-order-seed';
import { useAdmin } from '@/lib/admin-context';
import { getPolicyVersions } from '@/lib/policy-compliance';

type OrderWorkflowStatus = 'new' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled';

interface OrderWorkflowAuditEntry {
  changedAt: string;
  orderId: string;
  actor: string;
  fromStatus: OrderWorkflowStatus;
  toStatus: OrderWorkflowStatus;
  reason?: string;
}

interface CustomerContactOverride {
  fullName: string;
  phone: string;
  addressLine1: string;
  city: string;
  country: string;
}

interface ConsentComplianceInfo {
  status: 'missing' | 'match' | 'mismatch';
  termsMismatch: boolean;
  privacyMismatch: boolean;
}

const ORDER_STATUS_KEY = 'phcl_admin_order_status_map';
const ORDER_STATUS_AUDIT_KEY = 'phcl_admin_order_status_audit';
const ORDER_CUSTOMER_OVERRIDE_KEY = 'phcl_admin_order_customer_overrides';
const ORDER_DELIVERED_AT_KEY = 'phcl_admin_order_delivered_at';
const MAX_ORDER_STATUS_AUDIT = 200;
const STATUS_SEQUENCE: OrderWorkflowStatus[] = ['new', 'processing', 'packed', 'shipped', 'delivered'];

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage;

const getOrderStatusMap = (): Record<string, OrderWorkflowStatus> => {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(ORDER_STATUS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const safe: Record<string, OrderWorkflowStatus> = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (
        value === 'new' ||
        value === 'processing' ||
        value === 'packed' ||
        value === 'shipped' ||
        value === 'delivered' ||
        value === 'cancelled'
      ) {
        safe[key] = value;
      }
    }

    return safe;
  } catch {
    return {};
  }
};

const saveOrderStatusMap = (map: Record<string, OrderWorkflowStatus>) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ORDER_STATUS_KEY, JSON.stringify(map));
};

const getOrderStatusAudit = (): OrderWorkflowAuditEntry[] => {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(ORDER_STATUS_AUDIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is OrderWorkflowAuditEntry => {
        if (!entry || typeof entry !== 'object') return false;
        const row = entry as OrderWorkflowAuditEntry;
        return (
          typeof row.changedAt === 'string' &&
          typeof row.orderId === 'string' &&
          typeof row.actor === 'string' &&
          typeof row.fromStatus === 'string' &&
          typeof row.toStatus === 'string'
        );
      })
      .slice(0, MAX_ORDER_STATUS_AUDIT);
  } catch {
    return [];
  }
};

const appendOrderStatusAudit = (entry: OrderWorkflowAuditEntry) => {
  if (!canUseStorage()) return;
  const next = [entry, ...getOrderStatusAudit()].slice(0, MAX_ORDER_STATUS_AUDIT);
  window.localStorage.setItem(ORDER_STATUS_AUDIT_KEY, JSON.stringify(next));
};

const getCustomerOverrideMap = (): Record<string, CustomerContactOverride> => {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(ORDER_CUSTOMER_OVERRIDE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const safe: Record<string, CustomerContactOverride> = {};

    for (const [orderId, value] of Object.entries(parsed)) {
      if (!value || typeof value !== 'object') continue;
      const row = value as Partial<CustomerContactOverride>;
      if (
        typeof row.fullName === 'string' &&
        typeof row.phone === 'string' &&
        typeof row.addressLine1 === 'string' &&
        typeof row.city === 'string' &&
        typeof row.country === 'string'
      ) {
        safe[orderId] = {
          fullName: row.fullName,
          phone: row.phone,
          addressLine1: row.addressLine1,
          city: row.city,
          country: row.country,
        };
      }
    }

    return safe;
  } catch {
    return {};
  }
};

const saveCustomerOverrideMap = (map: Record<string, CustomerContactOverride>) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ORDER_CUSTOMER_OVERRIDE_KEY, JSON.stringify(map));
};

const getDeliveredAtMap = (): Record<string, string> => {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(ORDER_DELIVERED_AT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const safe: Record<string, string> = {};
    for (const [orderId, value] of Object.entries(parsed)) {
      if (typeof value === 'string') {
        safe[orderId] = value;
      }
    }
    return safe;
  } catch {
    return {};
  }
};

const saveDeliveredAtMap = (map: Record<string, string>) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ORDER_DELIVERED_AT_KEY, JSON.stringify(map));
};

const getStatusMeta = (status: OrderWorkflowStatus) => {
  if (status === 'new') return { label: 'New', className: 'bg-sky-500/20 text-sky-300' };
  if (status === 'processing') return { label: 'Processing', className: 'bg-indigo-500/20 text-indigo-300' };
  if (status === 'packed') return { label: 'Packed', className: 'bg-violet-500/20 text-violet-300' };
  if (status === 'shipped') return { label: 'Shipped', className: 'bg-amber-500/20 text-amber-300' };
  if (status === 'delivered') return { label: 'Delivered', className: 'bg-emerald-500/20 text-emerald-300' };
  return { label: 'Cancelled', className: 'bg-rose-500/20 text-rose-300' };
};

const getNextStatus = (status: OrderWorkflowStatus): OrderWorkflowStatus | null => {
  if (status === 'cancelled' || status === 'delivered') return null;
  const idx = STATUS_SEQUENCE.indexOf(status);
  if (idx === -1 || idx + 1 >= STATUS_SEQUENCE.length) return null;
  return STATUS_SEQUENCE[idx + 1];
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, refreshSession, sessionDebug } = useAdmin();
  const [loadingGuardElapsed, setLoadingGuardElapsed] = useState(false);
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [rejectedOrders, setRejectedOrders] = useState(0);
  const [totalRead, setTotalRead] = useState(0);
  const [rejectedSamples, setRejectedSamples] = useState<string[]>([]);
  const [integrityEvents, setIntegrityEvents] = useState<OrderIntegrityEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'usd' | 'tzs' | 'ntzs' | 'pi'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderWorkflowStatus>('all');
  const [consentFilter, setConsentFilter] = useState<'all' | 'exceptions' | 'missing' | 'mismatch' | 'match'>('all');
  const [orderStatusMap, setOrderStatusMap] = useState<Record<string, OrderWorkflowStatus>>({});
  const [statusAuditEvents, setStatusAuditEvents] = useState<OrderWorkflowAuditEntry[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [detailsOrderId, setDetailsOrderId] = useState<string | null>(null);
  const [customerOverrideMap, setCustomerOverrideMap] = useState<Record<string, CustomerContactOverride>>({});
  const [deliveredAtMap, setDeliveredAtMap] = useState<Record<string, string>>({});
  const [policyBaseline, setPolicyBaseline] = useState(getPolicyVersions());
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);
  const [customerDraft, setCustomerDraft] = useState<CustomerContactOverride>({
    fullName: '',
    phone: '',
    addressLine1: '',
    city: '',
    country: '',
  });

  const sessionAgeMinutes =
    sessionDebug.sessionAgeMs !== null ? Math.floor(sessionDebug.sessionAgeMs / 60000) : null;
  const sessionExpiresMinutes =
    sessionDebug.expiresInMs !== null ? Math.floor(sessionDebug.expiresInMs / 60000) : null;

  const resetDemoOrderMeta = useCallback(() => {
    const nextStatusMap = { ...getOrderStatusMap() };
    const nextCustomerOverrides = { ...getCustomerOverrideMap() };
    const nextDeliveredMap = { ...getDeliveredAtMap() };

    for (const demoId of DEMO_ORDER_IDS) {
      delete nextStatusMap[demoId];
      delete nextCustomerOverrides[demoId];
      delete nextDeliveredMap[demoId];
    }

    saveOrderStatusMap(nextStatusMap);
    saveCustomerOverrideMap(nextCustomerOverrides);
    saveDeliveredAtMap(nextDeliveredMap);
    setSelectedOrderIds((prev) => prev.filter((id) => !DEMO_ORDER_IDS.includes(id as (typeof DEMO_ORDER_IDS)[number])));
  }, []);

  const seedDemoOrders = useCallback(() => {
    const result = seedDemoOrdersInStorage();
    resetDemoOrderMeta();
    window.dispatchEvent(new Event(ORDERS_UPDATED_EVENT));
    setSeedNotice(`Seeded ${result.seededCount} demo orders. Total stored orders: ${result.totalCount}.`);
  }, [resetDemoOrderMeta]);

  const clearDemoOrders = useCallback(() => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Clear demo orders from this browser session?');
      if (!confirmed) return;
    }

    const result = clearDemoOrdersInStorage();
    resetDemoOrderMeta();
    window.dispatchEvent(new Event(ORDERS_UPDATED_EVENT));
    setSeedNotice(`Removed ${result.removedCount} demo orders. Total stored orders: ${result.totalCount}.`);
  }, [resetDemoOrderMeta]);

  useEffect(() => {
    const syncOrders = () => {
      const report = getOrderIntegrityReport();
      setOrders(report.validOrders);
      setRejectedOrders(report.rejectedOrders);
      setTotalRead(report.totalRead);
      setRejectedSamples(report.rejectedSamples);
      setIntegrityEvents(getOrderIntegrityEvents());
      setOrderStatusMap(getOrderStatusMap());
      setStatusAuditEvents(getOrderStatusAudit());
      setCustomerOverrideMap(getCustomerOverrideMap());
      setDeliveredAtMap(getDeliveredAtMap());
      setPolicyBaseline(getPolicyVersions());
    };

    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
      return;
    }

    if (isAuthenticated) {
      syncOrders();
      window.addEventListener(ORDERS_UPDATED_EVENT, syncOrders);
      window.addEventListener('storage', syncOrders);
      window.addEventListener('focus', syncOrders);
    }

    return () => {
      window.removeEventListener(ORDERS_UPDATED_EVENT, syncOrders);
      window.removeEventListener('storage', syncOrders);
      window.removeEventListener('focus', syncOrders);
    };
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadingGuardElapsed(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  const loadingActive = isLoading && !loadingGuardElapsed;

  useEffect(() => {
    if (loadingGuardElapsed && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [loadingGuardElapsed, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (searchParams.get('seed') !== 'demo') return;

    seedDemoOrders();
    router.replace('/admin/orders');
  }, [isAuthenticated, searchParams, seedDemoOrders, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (searchParams.get('clear') !== 'demo') return;

    const result = clearDemoOrdersInStorage();
    resetDemoOrderMeta();
    window.dispatchEvent(new Event(ORDERS_UPDATED_EVENT));
    setSeedNotice(`Removed ${result.removedCount} demo orders. Total stored orders: ${result.totalCount}.`);
    router.replace('/admin/orders');
  }, [isAuthenticated, searchParams, resetDemoOrderMeta, router]);

  const summary = useMemo(() => {
    const mergedOrders = orders.map((order) => {
      const override = customerOverrideMap[order.id];
      return {
        ...order,
        customer: override ?? order.customer,
      };
    });

    const totalUsd = mergedOrders.reduce((sum, order) => sum + order.totalUsd, 0);
    const byMethod = mergedOrders.reduce(
      (acc, order) => {
        acc[order.paymentMethod] += 1;
        return acc;
      },
      { usd: 0, tzs: 0, ntzs: 0, pi: 0 }
    );

    const currencyTotals = mergedOrders.reduce(
      (acc, order) => {
        if (order.paymentMethod === 'usd') {
          acc.totalUsdInUsd += order.totalUsd;
        } else if (order.paymentMethod === 'tzs') {
          acc.totalTzsInTzs += convertAmount(order.totalUsd, 'usd', 'tzs');
        } else if (order.paymentMethod === 'ntzs') {
          acc.totalNTzsInNTzs += convertAmount(order.totalUsd, 'usd', 'ntzs');
        } else if (order.paymentMethod === 'pi') {
          acc.totalPiInPi += convertAmount(order.totalUsd, 'usd', 'pi');
        }
        return acc;
      },
      { totalUsdInUsd: 0, totalTzsInTzs: 0, totalNTzsInNTzs: 0, totalPiInPi: 0 }
    );

    const statusCounts = mergedOrders.reduce(
      (acc, order) => {
        const status = orderStatusMap[order.id] ?? 'new';
        acc[status] += 1;
        return acc;
      },
      { new: 0, processing: 0, packed: 0, shipped: 0, delivered: 0, cancelled: 0 }
    );

    return {
      totalOrders: mergedOrders.length,
      totalUsd,
      byMethod,
      statusCounts,
      currencyTotals,
      mergedOrders,
    };
  }, [orders, orderStatusMap, customerOverrideMap]);

  const complianceSummary = useMemo(() => {
    const total = summary.mergedOrders.length;
    const byOrderId: Record<string, ConsentComplianceInfo> = {};
    let withConsent = 0;
    let missingConsent = 0;
    let versionMismatch = 0;
    let termsMismatch = 0;
    let privacyMismatch = 0;

    for (const order of summary.mergedOrders) {
      const consent = order.audit?.consent;
      const complete = Boolean(
        consent?.agreedToTerms &&
          consent?.agreedToPrivacy &&
          consent?.agreedAt &&
          consent?.termsVersion &&
          consent?.privacyVersion
      );

      if (!complete) {
        missingConsent += 1;
        byOrderId[order.id] = {
          status: 'missing',
          termsMismatch: false,
          privacyMismatch: false,
        };
        continue;
      }

      withConsent += 1;
      const termMismatch = consent.termsVersion !== policyBaseline.termsVersion;
      const privMismatch = consent.privacyVersion !== policyBaseline.privacyVersion;
      if (termMismatch) termsMismatch += 1;
      if (privMismatch) privacyMismatch += 1;
      if (termMismatch || privMismatch) {
        versionMismatch += 1;
      }

      byOrderId[order.id] = {
        status: termMismatch || privMismatch ? 'mismatch' : 'match',
        termsMismatch: termMismatch,
        privacyMismatch: privMismatch,
      };
    }

    const coveragePct = total > 0 ? (withConsent / total) * 100 : 100;
    const matchBaseline = withConsent - versionMismatch;

    return {
      total,
      withConsent,
      missingConsent,
      coveragePct,
      versionMismatch,
      termsMismatch,
      privacyMismatch,
      matchBaseline,
      byOrderId,
    };
  }, [summary.mergedOrders, policyBaseline]);

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return summary.mergedOrders.filter((order) => {
      const matchesMethod = methodFilter === 'all' || order.paymentMethod === methodFilter;
      const orderStatus = orderStatusMap[order.id] ?? 'new';
      const matchesStatus = statusFilter === 'all' || statusFilter === orderStatus;
      const consentStatus = complianceSummary.byOrderId[order.id]?.status || 'missing';
      const matchesConsent =
        consentFilter === 'all' ||
        (consentFilter === 'exceptions' && (consentStatus === 'missing' || consentStatus === 'mismatch')) ||
        (consentFilter === 'missing' && consentStatus === 'missing') ||
        (consentFilter === 'mismatch' && consentStatus === 'mismatch') ||
        (consentFilter === 'match' && consentStatus === 'match');
      const matchesSearch =
        term.length === 0 ||
        order.id.toLowerCase().includes(term) ||
        order.customer?.fullName?.toLowerCase().includes(term) ||
        order.customer?.phone?.toLowerCase().includes(term);

      return matchesMethod && matchesStatus && matchesConsent && matchesSearch;
    });
  }, [summary.mergedOrders, searchTerm, methodFilter, statusFilter, consentFilter, complianceSummary.byOrderId, orderStatusMap]);

  useEffect(() => {
    setSelectedOrderIds((prev) => prev.filter((id) => orders.some((order) => order.id === id)));
  }, [orders]);

  const updateOrderStatus = (
    orderId: string,
    nextStatus: OrderWorkflowStatus,
    actor = 'PHCL Administrator',
    reason?: string
  ) => {
    const current = orderStatusMap[orderId] ?? 'new';
    if (current === nextStatus) return;

    const nextMap = { ...orderStatusMap, [orderId]: nextStatus };
    setOrderStatusMap(nextMap);
    saveOrderStatusMap(nextMap);

    if (nextStatus === 'delivered') {
      const nextDeliveredMap = { ...deliveredAtMap, [orderId]: new Date().toISOString() };
      setDeliveredAtMap(nextDeliveredMap);
      saveDeliveredAtMap(nextDeliveredMap);
    }

    const entry: OrderWorkflowAuditEntry = {
      changedAt: new Date().toISOString(),
      orderId,
      actor,
      fromStatus: current,
      toStatus: nextStatus,
      reason,
    };
    appendOrderStatusAudit(entry);
    setStatusAuditEvents((prev) => [entry, ...prev].slice(0, MAX_ORDER_STATUS_AUDIT));
  };

  const saveCustomerDetails = () => {
    if (!detailsOrderId) return;

    const normalized: CustomerContactOverride = {
      fullName: customerDraft.fullName.trim().slice(0, 120),
      phone: customerDraft.phone.trim().slice(0, 40),
      addressLine1: customerDraft.addressLine1.trim().slice(0, 200),
      city: customerDraft.city.trim().slice(0, 80),
      country: customerDraft.country.trim().slice(0, 80),
    };

    if (!normalized.fullName || !normalized.phone || !normalized.addressLine1 || !normalized.city || !normalized.country) {
      return;
    }

    const next = { ...customerOverrideMap, [detailsOrderId]: normalized };
    setCustomerOverrideMap(next);
    saveCustomerOverrideMap(next);
    setIsEditingCustomer(false);
  };

  const printOrderSlip = (order: StoredOrder) => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;

    const customer = order.customer;
    const itemsHtml = order.items && order.items.length > 0
      ? order.items
          .map(
            (item) =>
              `<tr><td>${item.name}</td><td>${item.quantity}</td><td>$${item.price.toFixed(2)}</td></tr>`
          )
          .join('')
      : '<tr><td colspan="3">No item breakdown available</td></tr>';

    win.document.write(`
      <html>
        <head><title>Order Slip ${order.id}</title></head>
        <body style="font-family: Arial, sans-serif; padding: 24px; color: #111;">
          <h2>PHCL Super Order Slip</h2>
          <p><strong>Order:</strong> ${order.id}</p>
          <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
          <p><strong>Payment:</strong> ${order.paymentMethod.toUpperCase()}</p>
          <p><strong>Total USD:</strong> ${formatCurrencyAmount('usd', order.totalUsd)}</p>
          <hr/>
          <h3>Customer</h3>
          <p>${customer ? customer.fullName : 'N/A'}</p>
          <p>${customer ? customer.phone : 'N/A'}</p>
          <p>${customer ? customer.addressLine1 : 'N/A'}</p>
          <p>${customer ? `${customer.city}, ${customer.country}` : 'N/A'}</p>
          <hr/>
          <h3>Items</h3>
          <table border="1" cellspacing="0" cellpadding="8" width="100%">
            <thead><tr><th align="left">Item</th><th align="left">Qty</th><th align="left">Price</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const askCancelReason = (): string | undefined => {
    if (typeof window === 'undefined') return undefined;
    const value = window.prompt('Optional: Add cancellation reason for audit trail');
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.slice(0, 180) : undefined;
  };

  const runBulkStatusAction = (action: 'mark_processing' | 'mark_shipped' | 'mark_delivered' | 'mark_cancelled') => {
    if (selectedOrderIds.length === 0) return;

    const cancelReason = action === 'mark_cancelled' ? askCancelReason() : undefined;

    const nextStatus =
      action === 'mark_processing'
        ? 'processing'
        : action === 'mark_shipped'
        ? 'shipped'
        : action === 'mark_delivered'
        ? 'delivered'
        : 'cancelled';

    const nextMap = { ...orderStatusMap };
    const nextDeliveredMap = { ...deliveredAtMap };
    const auditEntries: OrderWorkflowAuditEntry[] = [];

    for (const id of selectedOrderIds) {
      const current = nextMap[id] ?? 'new';
      if (current === nextStatus) continue;

      nextMap[id] = nextStatus;
      if (nextStatus === 'delivered') {
        nextDeliveredMap[id] = new Date().toISOString();
      }

      auditEntries.push({
        changedAt: new Date().toISOString(),
        orderId: id,
        actor: 'PHCL Administrator',
        fromStatus: current,
        toStatus: nextStatus,
        reason: cancelReason,
      });
    }

    setOrderStatusMap(nextMap);
    saveOrderStatusMap(nextMap);
    setDeliveredAtMap(nextDeliveredMap);
    saveDeliveredAtMap(nextDeliveredMap);

    for (const entry of auditEntries) {
      appendOrderStatusAudit(entry);
    }
    if (auditEntries.length > 0) {
      setStatusAuditEvents((prev) => [...auditEntries.reverse(), ...prev].slice(0, MAX_ORDER_STATUS_AUDIT));
    }

    setSelectedOrderIds([]);
  };

  const exportCsv = () => {
    const escapeCsv = (value: string | number | null | undefined) => {
      const rawText = String(value ?? '');
      const neutralized = /^[=+\-@]/.test(rawText) ? `'${rawText}` : rawText;
      if (neutralized.includes(',') || neutralized.includes('"') || neutralized.includes('\n')) {
        return `"${neutralized.replace(/"/g, '""')}"`;
      }
      return neutralized;
    };

    const header = [
      'order_id',
      'created_at',
      'item_count',
      'payment_method',
      'total_usd',
      'source_route',
      'audit_schema_version',
      'reorder_source_order_id',
      'consent_terms',
      'consent_privacy',
      'consent_agreed_at',
      'consent_terms_version',
      'consent_privacy_version',
      'consent_exception_status',
      'consent_terms_mismatch',
      'consent_privacy_mismatch',
      'baseline_terms_version',
      'baseline_privacy_version',
      'customer_name',
      'customer_phone',
      'address_line1',
      'city',
      'country',
    ];

    const rows = filteredOrders.map((order) => {
      const compliance = complianceSummary.byOrderId[order.id] || {
        status: 'missing' as const,
        termsMismatch: false,
        privacyMismatch: false,
      };

      return [
        escapeCsv(order.id),
        escapeCsv(order.createdAt),
        escapeCsv(order.itemCount),
        escapeCsv(order.paymentMethod),
        escapeCsv(order.totalUsd.toFixed(2)),
        escapeCsv(order.audit?.sourceRoute),
        escapeCsv(order.audit?.schemaVersion),
        escapeCsv(order.audit?.reorderSourceOrderId),
        escapeCsv(order.audit?.consent?.agreedToTerms === true ? 'yes' : 'no'),
        escapeCsv(order.audit?.consent?.agreedToPrivacy === true ? 'yes' : 'no'),
        escapeCsv(order.audit?.consent?.agreedAt),
        escapeCsv(order.audit?.consent?.termsVersion),
        escapeCsv(order.audit?.consent?.privacyVersion),
        escapeCsv(compliance.status),
        escapeCsv(compliance.termsMismatch ? 'yes' : 'no'),
        escapeCsv(compliance.privacyMismatch ? 'yes' : 'no'),
        escapeCsv(policyBaseline.termsVersion),
        escapeCsv(policyBaseline.privacyVersion),
        escapeCsv(order.customer?.fullName),
        escapeCsv(order.customer?.phone),
        escapeCsv(order.customer?.addressLine1),
        escapeCsv(order.customer?.city),
        escapeCsv(order.customer?.country),
      ];
    });

    const csv = [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `orders-export-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loadingActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-200">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (isLoading && loadingGuardElapsed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="w-full max-w-lg rounded-xl border border-amber-300/30 bg-amber-500/10 p-5 text-amber-100">
          <h1 className="text-lg font-semibold">Admin Session Recovery</h1>
          <p className="mt-2 text-sm text-amber-100/85">Admin session is taking too long to hydrate. You can force a recheck now.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refreshSession}
              style={{ minHeight: '44px' }}
              className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Force Session Rehydrate
            </button>
            <Link href="/admin/login" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="rounded-lg bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Order Management</h1>
            <p className="text-sm text-slate-400 mt-1">Review latest customer checkouts</p>
          </div>
          <Link href="/admin/dashboard" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
          Session Debug: hasSession={sessionDebug.hasSession ? 'yes' : 'no'} • age={sessionAgeMinutes ?? 'n/a'}m • expiresIn={sessionExpiresMinutes ?? 'n/a'}m
          <button
            type="button"
            onClick={refreshSession}
            className="ml-3 rounded bg-slate-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-600"
          >
            Rehydrate Now
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by order ID, name, or phone"
            className="md:col-span-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as 'all' | 'usd' | 'tzs' | 'ntzs' | 'pi')}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Methods</option>
            <option value="usd">USD</option>
            <option value="tzs">TZS</option>
            <option value="ntzs">nTZS</option>
            <option value="pi">PI</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | OrderWorkflowStatus)}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="processing">Processing</option>
            <option value="packed">Packed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={consentFilter}
            onChange={(e) => setConsentFilter(e.target.value as 'all' | 'exceptions' | 'missing' | 'mismatch' | 'match')}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Consent</option>
            <option value="exceptions">Exceptions Only</option>
            <option value="missing">Missing Consent</option>
            <option value="mismatch">Version Mismatch</option>
            <option value="match">Baseline Match</option>
          </select>
          <button
            type="button"
            onClick={exportCsv}
            style={{ minHeight: '44px' }}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Export CSV
          </button>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-blue-300/20 bg-blue-500/10 p-3 text-xs text-blue-100">
          <button
            type="button"
            onClick={seedDemoOrders}
            className="rounded bg-blue-600 px-3 py-1 font-semibold text-white hover:bg-blue-700"
          >
            Seed Demo Orders
          </button>
          <button
            type="button"
            onClick={clearDemoOrders}
            className="rounded bg-rose-600 px-3 py-1 font-semibold text-white hover:bg-rose-700"
          >
            Clear Demo Orders
          </button>
          <span>Repeatable dev seeding without duplicates. Shortcuts: /admin/orders?seed=demo, /admin/orders?clear=demo</span>
        </div>

        {seedNotice && (
          <div className="mb-6 rounded-lg border border-emerald-300/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">
            {seedNotice}
          </div>
        )}

        <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
          Showing {filteredOrders.length} of {orders.length} orders.
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
          <button
            type="button"
            onClick={() => {
              const visibleIds = filteredOrders.map((order) => order.id);
              const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedOrderIds.includes(id));

              if (allVisibleSelected) {
                setSelectedOrderIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
              } else {
                setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
              }
            }}
            className="rounded bg-slate-700 px-3 py-1 font-semibold text-white hover:bg-slate-600"
          >
            Select Visible
          </button>
          <button type="button" onClick={() => runBulkStatusAction('mark_processing')} className="rounded bg-indigo-600 px-3 py-1 font-semibold text-white hover:bg-indigo-700">
            Mark Processing
          </button>
          <button type="button" onClick={() => runBulkStatusAction('mark_shipped')} className="rounded bg-amber-600 px-3 py-1 font-semibold text-white hover:bg-amber-700">
            Mark Shipped
          </button>
          <button type="button" onClick={() => runBulkStatusAction('mark_delivered')} className="rounded bg-emerald-600 px-3 py-1 font-semibold text-white hover:bg-emerald-700">
            Mark Delivered
          </button>
          <button type="button" onClick={() => runBulkStatusAction('mark_cancelled')} className="rounded bg-rose-600 px-3 py-1 font-semibold text-white hover:bg-rose-700">
            Mark Cancelled
          </button>
          <span className="ml-auto">Selected: {selectedOrderIds.length}</span>
        </div>

        <div className={`mb-6 rounded-lg border p-3 text-xs ${rejectedOrders > 0 ? 'border-rose-300/40 bg-rose-500/10 text-rose-100' : 'border-emerald-300/30 bg-emerald-500/10 text-emerald-100'}`}>
          Integrity Monitor: {rejectedOrders > 0 ? `${rejectedOrders} rejected/tampered order(s)` : 'No tampered orders detected'} out of {totalRead} record(s) scanned.
          {rejectedSamples.length > 0 && (
            <p className="mt-2 text-[11px] text-rose-200">Recent reasons: {rejectedSamples.join(', ')}</p>
          )}
        </div>

        <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-white">Integrity Telemetry</h2>
          {integrityEvents.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">No tamper telemetry events logged yet.</p>
          ) : (
            <div className="mt-2 space-y-1 text-xs text-slate-300">
              {integrityEvents.slice(0, 5).map((event, index) => (
                <p key={`${event.timestamp}-${index}`}>
                  {new Date(event.timestamp).toLocaleString()} • {event.reason}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Revenue by Currency</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center rounded bg-blue-500/10 px-3 py-2 border border-blue-300/20">
                <span className="text-blue-200">USD</span>
                <span className="text-blue-300 font-bold">{formatCurrencyAmount('usd', summary.currencyTotals.totalUsdInUsd)}</span>
              </div>
              <div className="flex justify-between items-center rounded bg-amber-500/10 px-3 py-2 border border-amber-300/20">
                <span className="text-amber-200">TZS</span>
                <span className="text-amber-300 font-bold">{formatCurrencyAmount('tzs', summary.currencyTotals.totalTzsInTzs)}</span>
              </div>
              <div className="flex justify-between items-center rounded bg-cyan-500/10 px-3 py-2 border border-cyan-300/20">
                <span className="text-cyan-200">nTZS</span>
                <span className="text-cyan-300 font-bold">{formatCurrencyAmount('ntzs', summary.currencyTotals.totalNTzsInNTzs)}</span>
              </div>
              <div className="flex justify-between items-center rounded bg-yellow-500/10 px-3 py-2 border border-yellow-300/20">
                <span className="text-yellow-200">PI</span>
                <span className="text-yellow-300 font-bold">{formatCurrencyAmount('pi', summary.currencyTotals.totalPiInPi)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Order Statistics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center rounded bg-purple-500/10 px-3 py-2 border border-purple-300/20">
                <span className="text-purple-200">Total Orders</span>
                <span className="text-purple-300 font-bold">{summary.totalOrders}</span>
              </div>
              <div className="flex justify-between items-center rounded bg-slate-500/10 px-3 py-2 border border-slate-300/20">
                <span className="text-slate-200">By Payment Method</span>
                <span className="text-slate-300 font-bold">USD {summary.byMethod.usd} | TZS {summary.byMethod.tzs} | nTZS {summary.byMethod.ntzs} | PI {summary.byMethod.pi}</span>
              </div>
              <div className="flex justify-between items-center rounded bg-rose-500/10 px-3 py-2 border border-rose-300/20">
                <span className="text-rose-200">Tamper Flags</span>
                <span className={`font-bold ${rejectedOrders > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{rejectedOrders}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-white">Order Workflow Snapshot</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
            <span className="rounded bg-sky-500/20 px-2 py-1 text-sky-300">New: {summary.statusCounts.new}</span>
            <span className="rounded bg-indigo-500/20 px-2 py-1 text-indigo-300">Processing: {summary.statusCounts.processing}</span>
            <span className="rounded bg-violet-500/20 px-2 py-1 text-violet-300">Packed: {summary.statusCounts.packed}</span>
            <span className="rounded bg-amber-500/20 px-2 py-1 text-amber-300">Shipped: {summary.statusCounts.shipped}</span>
            <span className="rounded bg-emerald-500/20 px-2 py-1 text-emerald-300">Delivered: {summary.statusCounts.delivered}</span>
            <span className="rounded bg-rose-500/20 px-2 py-1 text-rose-300">Cancelled: {summary.statusCounts.cancelled}</span>
          </div>
        </div>

        <div className={`mb-8 rounded-lg border p-4 ${complianceSummary.missingConsent > 0 ? 'border-amber-300/30 bg-amber-500/10' : 'border-emerald-300/30 bg-emerald-500/10'}`}>
          <h2 className="text-sm font-semibold text-white">Compliance Snapshot (Policy Consent)</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-4">
            <span className="rounded bg-slate-900/40 px-2 py-1 text-slate-200">Orders Scanned: {complianceSummary.total}</span>
            <span className="rounded bg-emerald-500/20 px-2 py-1 text-emerald-300">Consent Complete: {complianceSummary.withConsent}</span>
            <span className={`rounded px-2 py-1 ${complianceSummary.missingConsent > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
              Missing Consent: {complianceSummary.missingConsent}
            </span>
            <span className="rounded bg-cyan-500/20 px-2 py-1 text-cyan-300">Coverage: {complianceSummary.coveragePct.toFixed(1)}%</span>
          </div>
          {complianceSummary.missingConsent > 0 && (
            <p className="mt-2 text-[11px] text-amber-100">
              Some legacy orders do not contain consent snapshot metadata. New checkout flow now enforces and records this automatically.
            </p>
          )}
        </div>

        <div className={`mb-8 rounded-lg border p-4 ${complianceSummary.versionMismatch > 0 ? 'border-rose-300/30 bg-rose-500/10' : 'border-cyan-300/30 bg-cyan-500/10'}`}>
          <h2 className="text-sm font-semibold text-white">Consent Exception Monitor</h2>
          <p className="mt-1 text-[11px] text-slate-200">
            Active baseline: Terms v{policyBaseline.termsVersion} • Privacy v{policyBaseline.privacyVersion}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-5">
            <span className="rounded bg-emerald-500/20 px-2 py-1 text-emerald-300">Baseline Match: {complianceSummary.matchBaseline}</span>
            <span className={`rounded px-2 py-1 ${complianceSummary.versionMismatch > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
              Version Mismatch: {complianceSummary.versionMismatch}
            </span>
            <span className="rounded bg-amber-500/20 px-2 py-1 text-amber-300">Missing Consent: {complianceSummary.missingConsent}</span>
            <span className="rounded bg-slate-800/60 px-2 py-1 text-slate-200">Terms Mismatch: {complianceSummary.termsMismatch}</span>
            <span className="rounded bg-slate-800/60 px-2 py-1 text-slate-200">Privacy Mismatch: {complianceSummary.privacyMismatch}</span>
          </div>
          {complianceSummary.versionMismatch > 0 && (
            <p className="mt-2 text-[11px] text-rose-100">
              Policy version exceptions detected. Review affected orders and verify if they were captured before the latest policy activation.
            </p>
          )}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
            No orders match current filters.
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-300">
                <thead className="bg-white/10 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Select</th>
                    <th className="px-4 py-3 text-left font-semibold">Order ID</th>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Items</th>
                    <th className="px-4 py-3 text-left font-semibold">Method</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Total (USD)</th>
                    <th className="px-4 py-3 text-left font-semibold">Total (TZS)</th>
                    <th className="px-4 py-3 text-left font-semibold">Total (PI)</th>
                    <th className="px-4 py-3 text-left font-semibold">Customer</th>
                    <th className="px-4 py-3 text-left font-semibold">Consent</th>
                    <th className="px-4 py-3 text-left font-semibold">Audit</th>
                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredOrders.map((order) => {
                    const status = orderStatusMap[order.id] ?? 'new';
                    const statusMeta = getStatusMeta(status);
                    const nextStatus = getNextStatus(status);
                    const consentStatus = complianceSummary.byOrderId[order.id] || {
                      status: 'missing',
                      termsMismatch: false,
                      privacyMismatch: false,
                    };

                    return (
                    <tr key={order.id} className="hover:bg-white/5">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrderIds((prev) => Array.from(new Set([...prev, order.id])));
                            } else {
                              setSelectedOrderIds((prev) => prev.filter((id) => id !== order.id));
                            }
                          }}
                          className="h-4 w-4 cursor-pointer rounded border border-white/20 bg-white/10"
                        />
                      </td>
                      <td className="px-4 py-3 text-white font-medium">{order.id}</td>
                      <td className="px-4 py-3">{new Date(order.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3">{order.itemCount}</td>
                      <td className="px-4 py-3 uppercase">{order.paymentMethod}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-2 py-1 text-xs font-semibold ${statusMeta.className}`}>{statusMeta.label}</span>
                      </td>
                      <td className="px-4 py-3">{formatCurrencyAmount('usd', order.totalUsd)}</td>
                      <td className="px-4 py-3">{formatCurrencyAmount('tzs', convertAmount(order.totalUsd, 'usd', 'tzs'))}</td>
                      <td className="px-4 py-3">{formatCurrencyAmount('pi', convertAmount(order.totalUsd, 'usd', 'pi'))}</td>
                      <td className="px-4 py-3">
                        {order.customer ? (
                          <div>
                            <p className="text-white">{order.customer.fullName}</p>
                            <p className="text-xs text-slate-400">{order.customer.phone}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {consentStatus.status === 'match' && (
                          <div className="space-y-1">
                            <span className="rounded bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-300">Complete</span>
                            <p className="text-[10px] text-slate-400">v{order.audit?.consent?.termsVersion || 'n/a'} / v{order.audit?.consent?.privacyVersion || 'n/a'}</p>
                          </div>
                        )}
                        {consentStatus.status === 'mismatch' && (
                          <div className="space-y-1">
                            <span className="rounded bg-rose-500/20 px-2 py-1 text-[11px] font-semibold text-rose-300">Version Mismatch</span>
                            <p className="text-[10px] text-rose-200">Order v{order.audit?.consent?.termsVersion || 'n/a'} / v{order.audit?.consent?.privacyVersion || 'n/a'}</p>
                          </div>
                        )}
                        {consentStatus.status === 'missing' && (
                          <span className="rounded bg-amber-500/20 px-2 py-1 text-[11px] font-semibold text-amber-300">Missing</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1 text-xs">
                          <p className="text-slate-200">Route: {order.audit?.sourceRoute || 'N/A'}</p>
                          <p className="text-slate-400">Schema: v{order.audit?.schemaVersion ?? 'N/A'}</p>
                          <p className="text-slate-400">Reorder From: {order.audit?.reorderSourceOrderId || 'Direct'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailsOrderId(order.id)}
                            className="rounded bg-slate-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-500"
                          >
                            View
                          </button>
                          {nextStatus && (
                            <button
                              type="button"
                              onClick={() => updateOrderStatus(order.id, nextStatus)}
                              className="rounded bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
                            >
                              Move to {getStatusMeta(nextStatus).label}
                            </button>
                          )}
                          {status !== 'cancelled' && status !== 'delivered' && (
                            <button
                              type="button"
                              onClick={() => updateOrderStatus(order.id, 'cancelled', 'PHCL Administrator', askCancelReason())}
                              className="rounded bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-700"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-white">Recent Workflow Changes</h2>
          {statusAuditEvents.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">No order status changes yet.</p>
          ) : (
            <div className="mt-2 space-y-1 text-xs text-slate-300">
              {statusAuditEvents.slice(0, 8).map((event) => (
                <p key={`${event.changedAt}-${event.orderId}`}>
                  {new Date(event.changedAt).toLocaleString()} • {event.actor} • {event.orderId} • {event.fromStatus} → {event.toStatus}
                  {event.reason ? ` • Reason: ${event.reason}` : ''}
                </p>
              ))}
            </div>
          )}
        </div>

        {detailsOrderId && (() => {
          const detailOrder = summary.mergedOrders.find((order) => order.id === detailsOrderId);
          if (!detailOrder) return null;

          const deliveredAt = deliveredAtMap[detailOrder.id];

          return (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
              <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl border border-white/10 bg-slate-900 p-5 text-slate-200">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">Order Details</h2>
                    <p className="text-xs text-slate-400">{detailOrder.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => printOrderSlip(detailOrder)}
                      className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Print Slip
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailsOrderId(null)}
                      className="rounded bg-slate-700 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-600"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-slate-400">Created</p>
                    <p className="mt-1 text-white">{new Date(detailOrder.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="rounded border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-slate-400">Payment</p>
                    <p className="mt-1 text-white uppercase">{detailOrder.paymentMethod}</p>
                  </div>
                  <div className="rounded border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-slate-400">Total USD</p>
                    <p className="mt-1 text-white">{formatCurrencyAmount('usd', detailOrder.totalUsd)}</p>
                  </div>
                  <div className="rounded border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-slate-400">Total PI</p>
                    <p className="mt-1 text-white">{formatCurrencyAmount('pi', convertAmount(detailOrder.totalUsd, 'usd', 'pi'))}</p>
                  </div>
                </div>

                {deliveredAt && (
                  <div className="mt-3 rounded border border-emerald-300/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                    Delivered confirmation: {new Date(deliveredAt).toLocaleString()}
                  </div>
                )}

                <div className="mt-4 rounded border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Customer</p>
                    {detailOrder.customer && !isEditingCustomer && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerDraft({
                            fullName: detailOrder.customer?.fullName ?? '',
                            phone: detailOrder.customer?.phone ?? '',
                            addressLine1: detailOrder.customer?.addressLine1 ?? '',
                            city: detailOrder.customer?.city ?? '',
                            country: detailOrder.customer?.country ?? '',
                          });
                          setIsEditingCustomer(true);
                        }}
                        className="rounded bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
                      >
                        Edit Contact
                      </button>
                    )}
                  </div>
                  {detailOrder.customer ? (
                    isEditingCustomer ? (
                      <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
                        <input value={customerDraft.fullName} onChange={(e) => setCustomerDraft((prev) => ({ ...prev, fullName: e.target.value }))} className="rounded border border-white/20 bg-white/10 px-3 py-2 text-white" placeholder="Full name" />
                        <input value={customerDraft.phone} onChange={(e) => setCustomerDraft((prev) => ({ ...prev, phone: e.target.value }))} className="rounded border border-white/20 bg-white/10 px-3 py-2 text-white" placeholder="Phone" />
                        <input value={customerDraft.addressLine1} onChange={(e) => setCustomerDraft((prev) => ({ ...prev, addressLine1: e.target.value }))} className="rounded border border-white/20 bg-white/10 px-3 py-2 text-white" placeholder="Address" />
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <input value={customerDraft.city} onChange={(e) => setCustomerDraft((prev) => ({ ...prev, city: e.target.value }))} className="rounded border border-white/20 bg-white/10 px-3 py-2 text-white" placeholder="City" />
                          <input value={customerDraft.country} onChange={(e) => setCustomerDraft((prev) => ({ ...prev, country: e.target.value }))} className="rounded border border-white/20 bg-white/10 px-3 py-2 text-white" placeholder="Country" />
                        </div>
                        <div className="mt-1 flex gap-2">
                          <button type="button" onClick={saveCustomerDetails} className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700">Save Contact</button>
                          <button type="button" onClick={() => setIsEditingCustomer(false)} className="rounded bg-slate-700 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-600">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 space-y-1 text-sm">
                        <p>Name: {detailOrder.customer.fullName}</p>
                        <p>Phone: {detailOrder.customer.phone}</p>
                        <p>Address: {detailOrder.customer.addressLine1}</p>
                        <p>
                          City/Country: {detailOrder.customer.city}, {detailOrder.customer.country}
                        </p>
                      </div>
                    )
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">No customer details on this order.</p>
                  )}
                </div>

                <div className="mt-4 rounded border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-semibold text-white">Legal Consent</p>
                  {(complianceSummary.byOrderId[detailOrder.id]?.status || 'missing') !== 'missing' ? (
                    <div className="mt-2 space-y-1 text-xs text-slate-300">
                      <p>
                        Status:{' '}
                        <span className={(complianceSummary.byOrderId[detailOrder.id]?.status || 'missing') === 'mismatch' ? 'text-rose-300' : 'text-emerald-300'}>
                          {(complianceSummary.byOrderId[detailOrder.id]?.status || 'missing') === 'mismatch' ? 'Version Mismatch' : 'Complete'}
                        </span>
                      </p>
                      <p>Agreed At: {new Date(detailOrder.audit.consent.agreedAt).toLocaleString()}</p>
                      <p>Terms Version: {detailOrder.audit.consent.termsVersion}</p>
                      <p>Privacy Version: {detailOrder.audit.consent.privacyVersion}</p>
                      <p>Active Baseline: Terms v{policyBaseline.termsVersion} / Privacy v{policyBaseline.privacyVersion}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-amber-300">Consent snapshot missing (likely legacy order prior to policy enforcement).</p>
                  )}
                </div>

                <div className="mt-4 rounded border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-semibold text-white">Items</p>
                  {detailOrder.items && detailOrder.items.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {detailOrder.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded border border-white/10 bg-black/20 px-3 py-2 text-xs">
                          <span className="text-slate-200">{item.name}</span>
                          <span className="text-slate-300">
                            Qty {item.quantity} • ${item.price.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">No item breakdown saved for this order.</p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
