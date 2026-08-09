import { randomUUID } from 'node:crypto';
import { getRuntimeStoreState, updateRuntimeStoreState } from '@/lib/db';

export interface AdminSessionRecord {
  sessionId: string;
  email: string;
  role: 'admin';
  issuedAt: string;
  expiresAt: string;
  idleExpiresAt: string;
  lastSeenAt: string;
}

const trimText = (value: unknown, max = 180): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const sanitizeSessionRecord = (value: unknown): AdminSessionRecord | null => {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<AdminSessionRecord>;
  const sessionId = trimText(row.sessionId, 120);
  const email = trimText(row.email, 180).toLowerCase();
  const issuedAt = trimText(row.issuedAt, 60);
  const expiresAt = trimText(row.expiresAt, 60);
  const idleExpiresAt = trimText(row.idleExpiresAt, 60);
  const lastSeenAt = trimText(row.lastSeenAt, 60);
  const role = row.role === 'admin' ? 'admin' : null;

  if (!sessionId || !email || !issuedAt || !expiresAt || !idleExpiresAt || !lastSeenAt || !role) {
    return null;
  }

  return { sessionId, email, role, issuedAt, expiresAt, idleExpiresAt, lastSeenAt };
};

const sanitizeSessionMap = (value: unknown): Record<string, AdminSessionRecord> => {
  if (!value || typeof value !== 'object') return {};
  const safe: Record<string, AdminSessionRecord> = {};

  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const normalized = sanitizeSessionRecord(entry);
    if (!normalized) continue;
    safe[trimText(key, 120)] = normalized;
  }

  return safe;
};

export const getAdminSessions = (): Record<string, AdminSessionRecord> =>
  sanitizeSessionMap(getRuntimeStoreState().admin_sessions);

export const pruneExpiredAdminSessions = (now = Date.now()): Record<string, AdminSessionRecord> => {
  const next = updateRuntimeStoreState((state) => {
    const current = sanitizeSessionMap(state.admin_sessions);
    const kept: Record<string, AdminSessionRecord> = {};

    for (const [sessionId, session] of Object.entries(current)) {
      const hardExp = Date.parse(session.expiresAt);
      const idleExp = Date.parse(session.idleExpiresAt);
      if (Number.isNaN(hardExp) || Number.isNaN(idleExp) || hardExp <= now || idleExp <= now) {
        continue;
      }
      kept[sessionId] = session;
    }

    state.admin_sessions = kept;
  });

  return sanitizeSessionMap(next.admin_sessions);
};

export const createAdminSession = (input: {
  email: string;
  expiresAt: string;
  idleExpiresAt: string;
}): AdminSessionRecord => {
  const session: AdminSessionRecord = {
    sessionId: randomUUID(),
    email: trimText(input.email, 180).toLowerCase(),
    role: 'admin',
    issuedAt: new Date().toISOString(),
    expiresAt: trimText(input.expiresAt, 60),
    idleExpiresAt: trimText(input.idleExpiresAt, 60),
    lastSeenAt: new Date().toISOString(),
  };

  updateRuntimeStoreState((state) => {
    const current = sanitizeSessionMap(state.admin_sessions);
    current[session.sessionId] = session;
    state.admin_sessions = current;
  });

  return session;
};

export const getAdminSession = (sessionId: string): AdminSessionRecord | null => {
  const sessions = pruneExpiredAdminSessions();
  return sessions[trimText(sessionId, 120)] || null;
};

export const touchAdminSession = (sessionId: string, idleExpiresAt: string): AdminSessionRecord | null => {
  let touched: AdminSessionRecord | null = null;

  updateRuntimeStoreState((state) => {
    const current = sanitizeSessionMap(state.admin_sessions);
    const existing = current[trimText(sessionId, 120)];
    if (!existing) return;

    touched = {
      ...existing,
      idleExpiresAt: trimText(idleExpiresAt, 60),
      lastSeenAt: new Date().toISOString(),
    };
    current[touched.sessionId] = touched;
    state.admin_sessions = current;
  });

  return touched;
};

export const deleteAdminSession = (sessionId: string): void => {
  updateRuntimeStoreState((state) => {
    const current = sanitizeSessionMap(state.admin_sessions);
    delete current[trimText(sessionId, 120)];
    state.admin_sessions = current;
  });
};