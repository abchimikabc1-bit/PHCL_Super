import { getDatabase } from '@/lib/db';
import type { PerformanceAlert } from '@/lib/performance-analytics';

export interface AlertNotification {
  id: string;
  timestamp: number;
  alert: PerformanceAlert;
  recipient: string;
  channel: 'email' | 'slack' | 'sms';
  status: 'sent' | 'failed';
  errorMessage?: string;
}

export interface AlertPreferences {
  enabledChannels: ('email' | 'slack' | 'sms')[];
  emailAddress?: string;
  slackWebhookUrl?: string;
  phoneNumber?: string;
  thresholdSeverity: 'critical' | 'warning';
  batchAlerts: boolean;
  batchIntervalMs: number;
}

const MAX_NOTIFICATIONS = 500;
const PREFS_ROW_ID = 1;
const PERFORMANCE_METRICS = ['lcp', 'fid', 'cls', 'ttfb', 'imageBandwidth', 'imageLoadTime'] as const;

function isPerformanceMetric(metric: unknown): metric is PerformanceAlert['metric'] {
  return typeof metric === 'string' && (PERFORMANCE_METRICS as readonly string[]).includes(metric);
}

function hasValidMetric(
  row: Record<string, unknown>
): row is Record<string, unknown> & { metric: PerformanceAlert['metric'] } {
  return isPerformanceMetric(row.metric);
}

// ─── Preferences ──────────────────────────────────────────────────────────────

export function getAlertPreferences(): AlertPreferences {
  const db = getDatabase();
  const row = db.prepare(
    'SELECT * FROM alert_preferences WHERE id = ?'
  ).get(PREFS_ROW_ID) as Record<string, unknown> | undefined;

  if (!row) {
    return {
      enabledChannels: [],
      thresholdSeverity: 'critical',
      batchAlerts: true,
      batchIntervalMs: 300000,
    };
  }

  const parseChannels = (v: unknown): AlertPreferences['enabledChannels'] => {
    try {
      const arr = JSON.parse(v as string) as unknown[];
      return arr.filter(
        (c): c is 'email' | 'slack' | 'sms' =>
          c === 'email' || c === 'slack' || c === 'sms'
      );
    } catch {
      return [];
    }
  };

  return {
    enabledChannels: parseChannels(row.enabled_channels),
    emailAddress: (row.email_address as string) || undefined,
    slackWebhookUrl: (row.slack_webhook_url as string) || undefined,
    phoneNumber: (row.phone_number as string) || undefined,
    thresholdSeverity: row.threshold_severity === 'warning' ? 'warning' : 'critical',
    batchAlerts: Boolean(row.batch_alerts),
    batchIntervalMs: Number(row.batch_interval_ms) || 300000,
  };
}

export function updateAlertPreferences(partial: Partial<AlertPreferences>): AlertPreferences {
  const existing = getAlertPreferences();
  const merged: AlertPreferences = {
    enabledChannels:    partial.enabledChannels    ?? existing.enabledChannels,
    emailAddress:       partial.emailAddress       ?? existing.emailAddress,
    slackWebhookUrl:    partial.slackWebhookUrl    ?? existing.slackWebhookUrl,
    phoneNumber:        partial.phoneNumber        ?? existing.phoneNumber,
    thresholdSeverity:  partial.thresholdSeverity  ?? existing.thresholdSeverity,
    batchAlerts:        partial.batchAlerts        ?? existing.batchAlerts,
    batchIntervalMs:    partial.batchIntervalMs    ?? existing.batchIntervalMs,
  };

  const db = getDatabase();
  db.prepare(`
    INSERT INTO alert_preferences (id, enabled_channels, email_address, slack_webhook_url,
      phone_number, threshold_severity, batch_alerts, batch_interval_ms, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(id) DO UPDATE SET
      enabled_channels   = excluded.enabled_channels,
      email_address      = excluded.email_address,
      slack_webhook_url  = excluded.slack_webhook_url,
      phone_number       = excluded.phone_number,
      threshold_severity = excluded.threshold_severity,
      batch_alerts       = excluded.batch_alerts,
      batch_interval_ms  = excluded.batch_interval_ms,
      updated_at         = excluded.updated_at
  `).run(
    PREFS_ROW_ID,
    JSON.stringify(merged.enabledChannels),
    merged.emailAddress    ?? null,
    merged.slackWebhookUrl ?? null,
    merged.phoneNumber     ?? null,
    merged.thresholdSeverity,
    merged.batchAlerts ? 1 : 0,
    merged.batchIntervalMs,
  );

  return merged;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function sendAlertNotification(
  alert: PerformanceAlert,
  preferences: AlertPreferences,
  batchedAlerts?: PerformanceAlert[],
): Promise<AlertNotification[]> {
  const allAlerts = batchedAlerts ? [alert, ...batchedAlerts] : [alert];
  const db = getDatabase();
  const results: AlertNotification[] = [];

  for (const channel of preferences.enabledChannels) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    let status: 'sent' | 'failed' = 'failed';
    let errorMessage: string | undefined;

    try {
      if (channel === 'email' && preferences.emailAddress) {
        await dispatchEmail(alert, preferences.emailAddress, allAlerts);
        status = 'sent';
      } else if (channel === 'slack' && preferences.slackWebhookUrl) {
        await dispatchSlack(alert, preferences.slackWebhookUrl, allAlerts);
        status = 'sent';
      } else if (channel === 'sms' && preferences.phoneNumber) {
        await dispatchSms(alert, preferences.phoneNumber);
        status = 'sent';
      } else {
        errorMessage = `Missing configuration for channel: ${channel}`;
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[alert-service] ${channel} dispatch failed:`, err);
    }

    const recipient =
      channel === 'email' ? (preferences.emailAddress || 'not-configured') :
      channel === 'slack' ? (preferences.slackWebhookUrl || 'not-configured') :
      (preferences.phoneNumber || 'not-configured');

    db.prepare(`
      INSERT INTO alert_notifications
        (id, timestamp, metric, severity, value, threshold, message, recipient, channel, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      Date.now(),
      alert.metric,
      alert.severity,
      alert.value,
      alert.threshold,
      alert.message,
      recipient,
      channel,
      status,
      errorMessage ?? null,
    );

    results.push({ id, timestamp: Date.now(), alert, recipient, channel, status, errorMessage });
  }

  // Prune oldest notifications
  db.exec(`
    DELETE FROM alert_notifications
    WHERE id NOT IN (SELECT id FROM alert_notifications ORDER BY timestamp DESC LIMIT ${MAX_NOTIFICATIONS})
  `);

  return results;
}

export function getAlertNotificationHistory(limit = 50): AlertNotification[] {
  const db = getDatabase();
  const safeLimit = Math.max(1, Math.min(MAX_NOTIFICATIONS, Math.floor(limit)));
  const rows = db.prepare(
    'SELECT * FROM alert_notifications ORDER BY timestamp DESC LIMIT ?'
  ).all(safeLimit) as Record<string, unknown>[];

  return rows
    .filter(hasValidMetric)
    .map((row) => ({
    id: row.id as string,
    timestamp: Number(row.timestamp),
    alert: {
      metric:    row.metric,
      severity:  row.severity  as 'critical' | 'warning',
      value:     Number(row.value),
      threshold: Number(row.threshold),
      message:   row.message   as string,
    },
    recipient:    row.recipient    as string,
    channel:      row.channel      as 'email' | 'slack' | 'sms',
    status:       row.status       as 'sent' | 'failed',
    errorMessage: (row.error_message as string) || undefined,
  }));
}

export function getAlertStats(): {
  totalAlerts: number;
  criticalCount: number;
  warningCount: number;
  sentCount: number;
  failedCount: number;
  byChannel: Record<'email' | 'slack' | 'sms', number>;
} {
  const db = getDatabase();
  const rows = db.prepare(
    'SELECT severity, status, channel FROM alert_notifications'
  ).all() as Array<{ severity: string; status: string; channel: string }>;

  return {
    totalAlerts:   rows.length,
    criticalCount: rows.filter((r) => r.severity === 'critical').length,
    warningCount:  rows.filter((r) => r.severity === 'warning').length,
    sentCount:     rows.filter((r) => r.status   === 'sent').length,
    failedCount:   rows.filter((r) => r.status   === 'failed').length,
    byChannel: {
      email: rows.filter((r) => r.channel === 'email').length,
      slack: rows.filter((r) => r.channel === 'slack').length,
      sms:   rows.filter((r) => r.channel === 'sms').length,
    },
  };
}

// ─── Channel dispatchers ──────────────────────────────────────────────────────

async function dispatchEmail(
  alert: PerformanceAlert,
  emailAddress: string,
  allAlerts: PerformanceAlert[],
): Promise<void> {
  const subject = `PHCL Alert [${alert.severity.toUpperCase()}]: ${alert.metric}`;
  const lines = allAlerts.map(
    (a) => `• ${a.metric}: ${a.message} (current: ${a.value}, threshold: ${a.threshold})`
  ).join('\n');

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[EMAIL] To: ${emailAddress}\nSubject: ${subject}\n${lines}`);
    return;
  }
  // Production: inject SendGrid / Nodemailer here via process.env.SENDGRID_API_KEY
}

async function dispatchSlack(
  alert: PerformanceAlert,
  webhookUrl: string,
  allAlerts: PerformanceAlert[],
): Promise<void> {
  const color = alert.severity === 'critical' ? '#dc2626' : '#ea580c';
  const payload = {
    attachments: [{
      color,
      title: `${alert.severity.toUpperCase()}: ${alert.metric}`,
      text: allAlerts.map((a) => `*${a.metric}*: ${a.message} — ${a.value} (threshold ${a.threshold})`).join('\n'),
      footer: 'PHCL Super Performance Monitor',
    }],
  };

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[SLACK] Webhook: ${webhookUrl}\n`, JSON.stringify(payload, null, 2));
    return;
  }
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Slack returned ${res.status}`);
}

async function dispatchSms(alert: PerformanceAlert, phoneNumber: string): Promise<void> {
  const msg = `PHCL [${alert.severity.toUpperCase()}] ${alert.metric}: ${alert.message}. Value: ${alert.value}, Threshold: ${alert.threshold}`;

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[SMS] To: ${phoneNumber}\n${msg}`);
    return;
  }
  // Production: inject Twilio here via process.env.TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN
}
