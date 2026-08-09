import { hydrateCommerceStateFromServer } from '@/lib/commerce-sync';
import { CART_STORAGE_KEY, CART_UPDATED_EVENT, sanitizeCartItems } from '@/lib/cart-storage';
import { ORDER_STORAGE_KEY, ORDERS_UPDATED_EVENT, sanitizeStoredOrder } from '@/lib/order-storage';
import {
  ORDER_CUSTOMER_OVERRIDE_KEY,
  ORDER_DELIVERED_AT_KEY,
  ORDER_STATUS_AUDIT_KEY,
  ORDER_STATUS_KEY,
  sanitizeCustomerOverrideMap,
  sanitizeDeliveredAtMap,
  sanitizeOrderStatusAudit,
  sanitizeOrderStatusMap,
} from '@/lib/admin-order-meta-storage';
import {
  WALLET_LEDGER_KEY,
  WALLET_STORAGE_KEY,
  WALLET_UPDATED_EVENT,
  sanitizeWalletLedgerEntry,
  sanitizeWalletSnapshot,
} from '@/lib/wallet-storage';

export const refreshCommerceClientCache = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  const snapshot = await hydrateCommerceStateFromServer();
  if (!snapshot) return false;

  const cartItems = sanitizeCartItems(snapshot.cartItems);
  const orders = Array.isArray(snapshot.orders)
    ? snapshot.orders
        .map((entry) => sanitizeStoredOrder(entry))
        .filter((entry): entry is NonNullable<ReturnType<typeof sanitizeStoredOrder>> => !!entry)
    : [];
  const walletSnapshot = sanitizeWalletSnapshot(snapshot.walletSnapshot);
  const walletLedger = Array.isArray(snapshot.walletLedger)
    ? snapshot.walletLedger
        .map((entry) => sanitizeWalletLedgerEntry(entry))
        .filter((entry): entry is NonNullable<ReturnType<typeof sanitizeWalletLedgerEntry>> => !!entry)
    : [];

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
  window.localStorage.setItem(ORDER_STATUS_KEY, JSON.stringify(sanitizeOrderStatusMap(snapshot.orderStatusMap)));
  window.localStorage.setItem(ORDER_STATUS_AUDIT_KEY, JSON.stringify(sanitizeOrderStatusAudit(snapshot.orderStatusAudit)));
  window.localStorage.setItem(ORDER_CUSTOMER_OVERRIDE_KEY, JSON.stringify(sanitizeCustomerOverrideMap(snapshot.customerOverrideMap)));
  window.localStorage.setItem(ORDER_DELIVERED_AT_KEY, JSON.stringify(sanitizeDeliveredAtMap(snapshot.deliveredAtMap)));

  if (walletSnapshot) {
    window.localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(walletSnapshot));
  }
  window.localStorage.setItem(WALLET_LEDGER_KEY, JSON.stringify(walletLedger));

  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  window.dispatchEvent(new Event(ORDERS_UPDATED_EVENT));
  window.dispatchEvent(new Event(WALLET_UPDATED_EVENT));
  return true;
};