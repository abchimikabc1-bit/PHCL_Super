import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';

type JsonObject = Record<string, unknown>;
type RateLimitPolicy = { windowMs: number; maxAttempts: number; blockMs: number };

const SECURITY_DIR = path.join(process.cwd(), 'generated', 'security');
const AUDIT_FILE = path.join(SECURITY_DIR, 'admin-auth-audit.log');
const RATE_LIMIT_FILE = path.join(SECURITY_DIR, 'admin-auth-rate-limit.json');

export type AuthAuditEvent = {
  timestamp: string;
  action: 'login_success' | 'login_failed' | 'login_blocked' | 'logout' | 'session_invalid' | 'config_error';
  email?: string;
  ip?: string;
  reason?: string;
  sessionId?: string;
};

type RateLimitEntry = {
  key: string;
  attempts: number;
  windowStart: number;
  blockedUntil: number;
  updatedAt: string;
};

export function getAdminAuthAuditLogPath(): string {
  return AUDIT_FILE;
}

export function getAdminAuthRateLimitPath(): string {
  return RATE_LIMIT_FILE;
}

async function safeReadFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return '';
  }
}

async function ensureSecurityDir(): Promise<void> {
  await fs.mkdir(SECURITY_DIR, { recursive: true });
}

async function readRateLimitMap(): Promise<Record<string, RateLimitEntry>> {
  const raw = await safeReadFile(RATE_LIMIT_FILE);
  if (!raw.trim()) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const next: Record<string, RateLimitEntry> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const row = value as Partial<RateLimitEntry>;
      const attempts = Number(row.attempts ?? 0);
      const windowStart = Number(row.windowStart ?? 0);
      const blockedUntil = Number(row.blockedUntil ?? 0);

      if (!Number.isFinite(attempts) || !Number.isFinite(windowStart) || !Number.isFinite(blockedUntil)) continue;
      next[key] = {
        key,
        attempts: Math.max(0, Math.floor(attempts)),
        windowStart,
        blockedUntil,
        updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date().toISOString(),
      };
    }

    return next;
  } catch {
    return {};
  }
}

async function writeRateLimitMap(state: Record<string, RateLimitEntry>): Promise<void> {
  await ensureSecurityDir();
  await fs.writeFile(RATE_LIMIT_FILE, JSON.stringify(state, null, 2), 'utf8');
}

export async function appendAuthAuditEvent(event: AuthAuditEvent): Promise<void> {
  const line = `${JSON.stringify({
    timestamp: event.timestamp || new Date().toISOString(),
    action: event.action,
    email: event.email || undefined,
    ip: event.ip || undefined,
    reason: event.reason || undefined,
    sessionId: event.sessionId || undefined,
  })}\n`;
  await ensureSecurityDir();
  await fs.appendFile(AUDIT_FILE, line, 'utf8');
}

export async function readRateLimitState(
  key: string,
  policy: RateLimitPolicy
): Promise<{ blocked: boolean; retryAfterSeconds: number; attempts: number }> {
  const now = Date.now();
  const state = await readRateLimitMap();
  const current = state[key];

  if (!current) {
    return { blocked: false, retryAfterSeconds: 0, attempts: 0 };
  }

  if (current.blockedUntil > now) {
    return {
      blocked: true,
      retryAfterSeconds: Math.max(1, Math.ceil((current.blockedUntil - now) / 1000)),
      attempts: current.attempts,
    };
  }

  if (now - current.windowStart > policy.windowMs) {
    return { blocked: false, retryAfterSeconds: 0, attempts: 0 };
  }

  return { blocked: false, retryAfterSeconds: 0, attempts: current.attempts };
}

export async function registerAuthFailure(
  key: string,
  policy: RateLimitPolicy
): Promise<{ blocked: boolean; retryAfterSeconds: number; attempts: number }> {
  const now = Date.now();
  const state = await readRateLimitMap();
  const current = state[key];

  const nextWindowStart =
    !current || now - current.windowStart > policy.windowMs ? now : current.windowStart;
  const nextAttempts =
    !current || now - current.windowStart > policy.windowMs ? 1 : current.attempts + 1;
  const blockedUntil = nextAttempts >= policy.maxAttempts ? now + policy.blockMs : 0;

  state[key] = {
    key,
    attempts: nextAttempts,
    windowStart: nextWindowStart,
    blockedUntil,
    updatedAt: new Date(now).toISOString(),
  };
  await writeRateLimitMap(state);

  return {
    blocked: blockedUntil > now,
    retryAfterSeconds: blockedUntil > now ? Math.max(1, Math.ceil((blockedUntil - now) / 1000)) : 0,
    attempts: nextAttempts,
  };
}

export async function clearAuthRateLimitKey(key: string): Promise<void> {
  const state = await readRateLimitMap();
  if (!state[key]) return;
  delete state[key];
  await writeRateLimitMap(state);
}

export async function readAuthAuditEvents(limit = 200): Promise<JsonObject[]> {
  const raw = await safeReadFile(AUDIT_FILE);
  if (!raw.trim()) return [];

  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const parsed = lines
    .map((line) => {
      try {
        return JSON.parse(line) as JsonObject;
      } catch {
        return null;
      }
    })
    .filter((v): v is JsonObject => v !== null);

  return parsed.slice(-limit).reverse();
}

export async function readRateLimitEntries(
  limitOrPolicy: number | RateLimitPolicy = 200
): Promise<JsonObject[]> {
  const limit = typeof limitOrPolicy === 'number' ? limitOrPolicy : 200;

  const raw = await safeReadFile(RATE_LIMIT_FILE);
  if (!raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return (parsed as JsonObject[]).slice(-limit).reverse();
    if (parsed && typeof parsed === 'object') {
      return Object.values(parsed as Record<string, JsonObject>).slice(-limit).reverse();
    }
    return [];
  } catch {
    return [];
  }
}