import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';

type JsonObject = Record<string, unknown>;
type RateLimitPolicy = { windowMs: number; maxAttempts: number; blockMs: number };

const SECURITY_DIR = path.join(process.cwd(), 'generated', 'security');
const AUDIT_FILE = path.join(SECURITY_DIR, 'admin-auth-audit.log');
const RATE_LIMIT_FILE = path.join(SECURITY_DIR, 'admin-auth-rate-limit.json');

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