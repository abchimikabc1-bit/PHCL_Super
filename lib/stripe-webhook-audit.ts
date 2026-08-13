import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export type StripeWebhookAuditEvent = {
  eventId: string;
  eventType: string;
  status: 'processed' | 'ignored' | 'failed';
  orderId?: string;
  paymentSessionId?: string;
  paymentTransactionId?: string;
  detail?: string;
  at: string;
};

const DEFAULT_AUDIT_PATH = path.join(process.cwd(), 'generated', 'security', 'stripe-webhook-audit.log');

const AUDIT_FILE =
  process.env.STRIPE_WEBHOOK_AUDIT_LOG_PATH?.trim()
    ? path.join(process.cwd(), process.env.STRIPE_WEBHOOK_AUDIT_LOG_PATH.trim())
    : DEFAULT_AUDIT_PATH;

async function ensureAuditFile(): Promise<void> {
  await fs.mkdir(path.dirname(AUDIT_FILE), { recursive: true });
}

async function safeReadFile(): Promise<string> {
  try {
    return await fs.readFile(AUDIT_FILE, 'utf8');
  } catch {
    return '';
  }
}

export function getStripeWebhookAuditPath(): string {
  return AUDIT_FILE;
}

export async function appendStripeWebhookAuditEvent(event: StripeWebhookAuditEvent): Promise<void> {
  await ensureAuditFile();
  await fs.appendFile(AUDIT_FILE, `${JSON.stringify(event)}\n`, 'utf8');
}

export async function readStripeWebhookAuditEvents(limit = 100): Promise<StripeWebhookAuditEvent[]> {
  const raw = await safeReadFile();
  if (!raw.trim()) return [];

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as StripeWebhookAuditEvent;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is StripeWebhookAuditEvent => !!entry)
    .slice(-limit)
    .reverse();
}
