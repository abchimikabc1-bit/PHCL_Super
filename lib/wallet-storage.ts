import { hydrateCommerceStateFromServer, syncCommerceStateToServer } from '@/lib/commerce-sync';

export type WalletCurrency = 'usd' | 'tzs' | 'ntzs' | 'pi';

export interface WalletBalances {
  usd: number;
  tzs: number;
  ntzs: number;
  pi: number;
}

export interface WalletSnapshot {
  balances: WalletBalances;
  updatedAt: string;
}

export interface WalletLedgerEntry {
  id: string;
  type: 'debit' | 'credit';
  currency: WalletCurrency;
  amount: number;
  balanceAfter: number;
  reason: string;
  orderId?: string;
  createdAt: string;
}

export interface WalletMutationResult {
  success: boolean;
  snapshot: WalletSnapshot;
  reason?: string;
  transactionId?: string;
}

export const WALLET_STORAGE_KEY = 'phcl_wallet_state';
export const WALLET_LEDGER_KEY = 'phcl_wallet_ledger';
export const WALLET_UPDATED_EVENT = 'phcl-wallet-updated';
const MAX_LEDGER_ITEMS = 120;
let attemptedWalletHydration = false;

const canUseStorage = (): boolean => typeof window !== 'undefined' && !!window.localStorage;

const roundByCurrency = (currency: WalletCurrency, value: number): number => {
  if (!Number.isFinite(value)) return 0;
  if (currency === 'pi') return Number(value.toFixed(8));
  if (currency === 'usd') return Number(value.toFixed(2));
  return Math.round(value);
};

const createDefaultSnapshot = (): WalletSnapshot => ({
  balances: {
    usd: 2500,
    tzs: 3500000,
    ntzs: 1500000,
    pi: 128.45,
  },
  updatedAt: new Date().toISOString(),
});

const normalizeBalances = (raw: unknown): WalletBalances => {
  const source = raw && typeof raw === 'object' ? (raw as Partial<Record<WalletCurrency, unknown>>) : {};

  return {
    usd: Math.max(0, roundByCurrency('usd', Number(source.usd))),
    tzs: Math.max(0, roundByCurrency('tzs', Number(source.tzs))),
    ntzs: Math.max(0, roundByCurrency('ntzs', Number(source.ntzs))),
    pi: Math.max(0, roundByCurrency('pi', Number(source.pi))),
  };
};

const normalizeSnapshot = (raw: unknown): WalletSnapshot | null => {
  if (!raw || typeof raw !== 'object') return null;

  const data = raw as { balances?: unknown; updatedAt?: unknown };
  const updatedAt = typeof data.updatedAt === 'string' && data.updatedAt.trim()
    ? data.updatedAt.trim().slice(0, 60)
    : new Date().toISOString();

  return {
    balances: normalizeBalances(data.balances),
    updatedAt,
  };
};

export const sanitizeWalletSnapshot = (raw: unknown): WalletSnapshot | null => normalizeSnapshot(raw);

const persistSnapshot = (snapshot: WalletSnapshot): WalletSnapshot => {
  if (!canUseStorage()) return snapshot;
  window.localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(snapshot));
  window.dispatchEvent(new Event(WALLET_UPDATED_EVENT));
  return snapshot;
};

const hydrateWalletFromServer = (): void => {
  if (attemptedWalletHydration || !canUseStorage()) return;
  attemptedWalletHydration = true;

  void hydrateCommerceStateFromServer().then((snapshot) => {
    if (!snapshot) return;

    const nextSnapshot = sanitizeWalletSnapshot(snapshot.walletSnapshot);
    const nextLedger = Array.isArray(snapshot.walletLedger)
      ? snapshot.walletLedger
          .map((entry) => sanitizeWalletLedgerEntry(entry))
          .filter((entry): entry is WalletLedgerEntry => !!entry)
          .slice(0, MAX_LEDGER_ITEMS)
      : [];

    let changed = false;
    if (nextSnapshot) {
      window.localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(nextSnapshot));
      changed = true;
    }
    if (nextLedger.length > 0) {
      window.localStorage.setItem(WALLET_LEDGER_KEY, JSON.stringify(nextLedger));
      changed = true;
    }
    if (changed) {
      window.dispatchEvent(new Event(WALLET_UPDATED_EVENT));
    }
  });
};

const readSnapshot = (): WalletSnapshot => {
  if (!canUseStorage()) return createDefaultSnapshot();

  try {
    const raw = window.localStorage.getItem(WALLET_STORAGE_KEY);
    if (!raw) {
      hydrateWalletFromServer();
      return persistSnapshot(createDefaultSnapshot());
    }

    const parsed = JSON.parse(raw);
    const normalized = normalizeSnapshot(parsed);
    if (!normalized) {
      hydrateWalletFromServer();
      return persistSnapshot(createDefaultSnapshot());
    }

    return normalized;
  } catch {
    hydrateWalletFromServer();
    return persistSnapshot(createDefaultSnapshot());
  }
};

const normalizeLedgerEntry = (raw: unknown): WalletLedgerEntry | null => {
  if (!raw || typeof raw !== 'object') return null;

  const entry = raw as {
    id?: unknown;
    type?: unknown;
    currency?: unknown;
    amount?: unknown;
    balanceAfter?: unknown;
    reason?: unknown;
    orderId?: unknown;
    createdAt?: unknown;
  };

  if (entry.type !== 'debit' && entry.type !== 'credit') return null;
  if (entry.currency !== 'usd' && entry.currency !== 'tzs' && entry.currency !== 'ntzs' && entry.currency !== 'pi') {
    return null;
  }

  const amount = Number(entry.amount);
  const balanceAfter = Number(entry.balanceAfter);
  if (!Number.isFinite(amount) || !Number.isFinite(balanceAfter) || amount <= 0) return null;

  const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim().slice(0, 64) : `wallet-${Date.now()}`;
  const createdAt = typeof entry.createdAt === 'string' && entry.createdAt.trim()
    ? entry.createdAt.trim().slice(0, 60)
    : new Date().toISOString();
  const reason = typeof entry.reason === 'string' && entry.reason.trim()
    ? entry.reason.trim().slice(0, 80)
    : 'manual';
  const orderId = typeof entry.orderId === 'string' && entry.orderId.trim()
    ? entry.orderId.trim().slice(0, 100)
    : undefined;

  return {
    id,
    type: entry.type,
    currency: entry.currency,
    amount: roundByCurrency(entry.currency, amount),
    balanceAfter: roundByCurrency(entry.currency, Math.max(0, balanceAfter)),
    reason,
    orderId,
    createdAt,
  };
};

export const sanitizeWalletLedgerEntry = (raw: unknown): WalletLedgerEntry | null => normalizeLedgerEntry(raw);

const appendLedgerEntry = (entry: WalletLedgerEntry): void => {
  if (!canUseStorage()) return;

  try {
    const raw = window.localStorage.getItem(WALLET_LEDGER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const safe = Array.isArray(parsed)
      ? parsed.map((item) => normalizeLedgerEntry(item)).filter((item): item is WalletLedgerEntry => !!item)
      : [];

    const next = [entry, ...safe].slice(0, MAX_LEDGER_ITEMS);
    window.localStorage.setItem(WALLET_LEDGER_KEY, JSON.stringify(next));
  } catch {
    window.localStorage.setItem(WALLET_LEDGER_KEY, JSON.stringify([entry]));
  }
};

export const getWalletSnapshot = (): WalletSnapshot => readSnapshot();

export const setWalletSnapshot = (snapshot: WalletSnapshot): WalletSnapshot => {
  const normalized = normalizeSnapshot(snapshot) ?? createDefaultSnapshot();
  normalized.updatedAt = new Date().toISOString();
  const persisted = persistSnapshot(normalized);
  syncCommerceStateToServer({
    walletSnapshot: persisted,
    walletLedger: getWalletLedger(),
  });
  return persisted;
};

export const getWalletLedger = (): WalletLedgerEntry[] => {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(WALLET_LEDGER_KEY);
    if (!raw) {
      hydrateWalletFromServer();
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      hydrateWalletFromServer();
      return [];
    }

    const next = parsed
      .map((entry) => normalizeLedgerEntry(entry))
      .filter((entry): entry is WalletLedgerEntry => !!entry)
      .slice(0, MAX_LEDGER_ITEMS);
    if (next.length === 0) {
      hydrateWalletFromServer();
    }
    return next;
  } catch {
    hydrateWalletFromServer();
    return [];
  }
};

const mutateWalletBalance = (
  type: 'debit' | 'credit',
  currency: WalletCurrency,
  amount: number,
  reason: string,
  orderId?: string
): WalletMutationResult => {
  const safeAmount = roundByCurrency(currency, Number(amount));
  const snapshot = readSnapshot();

  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    return { success: false, snapshot, reason: 'invalid_amount' };
  }

  const current = snapshot.balances[currency];
  if (type === 'debit' && current + 1e-9 < safeAmount) {
    return { success: false, snapshot, reason: 'insufficient_balance' };
  }

  const nextBalance = type === 'debit' ? current - safeAmount : current + safeAmount;
  const nextSnapshot: WalletSnapshot = {
    balances: {
      ...snapshot.balances,
      [currency]: Math.max(0, roundByCurrency(currency, nextBalance)),
    },
    updatedAt: new Date().toISOString(),
  };

  const transactionId = `wallet-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  persistSnapshot(nextSnapshot);
  appendLedgerEntry({
    id: transactionId,
    type,
    currency,
    amount: safeAmount,
    balanceAfter: nextSnapshot.balances[currency],
    reason: reason.trim().slice(0, 80) || 'manual',
    orderId: orderId?.trim().slice(0, 100),
    createdAt: new Date().toISOString(),
  });

  syncCommerceStateToServer({
    walletSnapshot: nextSnapshot,
    walletLedger: getWalletLedger(),
  });

  return { success: true, snapshot: nextSnapshot, transactionId };
};

export const debitWalletBalance = (
  currency: WalletCurrency,
  amount: number,
  reason = 'checkout_purchase',
  orderId?: string
): WalletMutationResult => mutateWalletBalance('debit', currency, amount, reason, orderId);

export const creditWalletBalance = (
  currency: WalletCurrency,
  amount: number,
  reason = 'wallet_credit',
  orderId?: string
): WalletMutationResult => mutateWalletBalance('credit', currency, amount, reason, orderId);
