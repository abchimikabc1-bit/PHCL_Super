import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';

type JsonObject = Record<string, unknown>;
type RateLimitPolicy = { windowMs: number; maxAttempts: number; blockMs: number };
type RateLimitEntry = {
  key: string;
  attempts: number;
  windowStart: number;
  blockedUntil: number;
  updatedAt: string;
  lastFailureAt?: string;
  lastSuccessAt?: string;
};
type AuthAuditEvent = {
  action: string;
  statusCode: number;
  ip: string;
  userAgent: string;
  email?: string;
  detail?: string;
  at: string;
};

const SECURITY_DIR = path.join(process.cwd(), 'generated', 'security');
const AUDIT_FILE =
  process.env.ADMIN_AUTH_AUDIT_LOG_PATH?.trim()
    ? path.join(process.cwd(), process.env.ADMIN_AUTH_AUDIT_LOG_PATH.trim())
    : path.join(SECURITY_DIR, 'admin-auth-audit.log');
const RATE_LIMIT_FILE =
  process.env.ADMIN_AUTH_RATE_LIMIT_PATH?.trim()
    ? path.join(process.cwd(), process.env.ADMIN_AUTH_RATE_LIMIT_PATH.trim())
    : path.join(SECURITY_DIR, 'admin-auth-rate-limit.json');

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

async function ensureSecurityFile(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function writeJsonFile(filePath: string, payload: unknown): Promise<void> {
  await ensureSecurityFile(filePath);
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

async function readRateLimitState(): Promise<Record<string, RateLimitEntry>> {
  const raw = await safeReadFile(RATE_LIMIT_FILE);
  if (!raw.trim()) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};

    const safe: Record<string, RateLimitEntry> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const row = value as Partial<RateLimitEntry>;
      safe[key] = {
        key: typeof row.key === 'string' && row.key.trim() ? row.key.trim() : key,
        attempts: Number.isFinite(Number(row.attempts)) ? Math.max(0, Math.floor(Number(row.attempts))) : 0,
        windowStart: Number.isFinite(Number(row.windowStart)) ? Number(row.windowStart) : 0,
        blockedUntil: Number.isFinite(Number(row.blockedUntil)) ? Number(row.blockedUntil) : 0,
        updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date(0).toISOString(),
        lastFailureAt: typeof row.lastFailureAt === 'string' ? row.lastFailureAt : undefined,
        lastSuccessAt: typeof row.lastSuccessAt === 'string' ? row.lastSuccessAt : undefined,
      };
    }

    return safe;
  } catch {
    return {};
  }
}

async function writeRateLimitState(state: Record<string, RateLimitEntry>): Promise<void> {
  await writeJsonFile(RATE_LIMIT_FILE, state);
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

export async function appendAuthAuditEvent(event: AuthAuditEvent): Promise<void> {
  await ensureSecurityFile(AUDIT_FILE);
  await fs.appendFile(AUDIT_FILE, `${JSON.stringify(event)}\n`, 'utf8');
}

export async function getRateLimitState(
  key: string,
  policy: RateLimitPolicy,
  now = Date.now()
): Promise<RateLimitEntry> {
  const safeKey = key.trim();
  const state = await readRateLimitState();
  const existing = state[safeKey];

  if (!existing) {
    return {
      key: safeKey,
      attempts: 0,
      windowStart: now,
      blockedUntil: 0,
      updatedAt: new Date(now).toISOString(),
    };
  }

  if (existing.blockedUntil > now) {
    return existing;
  }

  if (existing.windowStart + policy.windowMs <= now) {
    return {
      key: safeKey,
      attempts: 0,
      windowStart: now,
      blockedUntil: 0,
      updatedAt: new Date(now).toISOString(),
      lastFailureAt: existing.lastFailureAt,
      lastSuccessAt: existing.lastSuccessAt,
    };
  }

  return existing;
}

export async function registerRateLimitResult(
  key: string,
  policy: RateLimitPolicy,
  success: boolean,
  now = Date.now()
): Promise<RateLimitEntry> {
  const safeKey = key.trim();
  const state = await readRateLimitState();
  const current = await getRateLimitState(safeKey, policy, now);

  const next: RateLimitEntry = success
    ? {
        ...current,
        attempts: 0,
        blockedUntil: 0,
        windowStart: now,
        updatedAt: new Date(now).toISOString(),
        lastSuccessAt: new Date(now).toISOString(),
      }
    : (() => {
        const attempts = current.windowStart + policy.windowMs <= now ? 1 : current.attempts + 1;
        return {
          ...current,
          attempts,
          windowStart: current.windowStart + policy.windowMs <= now ? now : current.windowStart,
          blockedUntil: attempts >= policy.maxAttempts ? now + policy.blockMs : 0,
          updatedAt: new Date(now).toISOString(),
          lastFailureAt: new Date(now).toISOString(),
        };
      })();

  state[safeKey] = next;
  await writeRateLimitState(state);
  return next;
}