import 'server-only';

import { randomUUID } from 'node:crypto';

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

const PERFORMANCE_METRICS = [
  'lcp',
  'fid',
  'cls',
  'ttfb',
  'imageBandwidth',
  'imageLoadTime',
] as const;

type AlertChannel =
  AlertNotification['channel'];

type DispatchFailureCode =
  | 'CHANNEL_NOT_CONFIGURED'
  | 'EMAIL_PROVIDER_NOT_CONFIGURED'
  | 'SMS_PROVIDER_NOT_CONFIGURED'
  | 'SLACK_DISPATCH_FAILED'
  | 'DISPATCH_FAILED';

function isPerformanceMetric(
  metric: unknown,
): metric is PerformanceAlert['metric'] {
  return (
    typeof metric === 'string' &&
    (
      PERFORMANCE_METRICS as readonly string[]
    ).includes(metric)
  );
}

function hasValidMetric(
  row: Record<string, unknown>,
): row is Record<string, unknown> & {
  metric: PerformanceAlert['metric'];
} {
  return isPerformanceMetric(
    row.metric,
  );
}

function maskEmail(
  emailAddress: string,
): string {
  const normalized =
    emailAddress.trim();

  const atIndex =
    normalized.lastIndexOf('@');

  if (
    atIndex <= 0 ||
    atIndex ===
      normalized.length - 1
  ) {
    return 'Email configured';
  }

  const local =
    normalized.slice(
      0,
      atIndex,
    );

  const domain =
    normalized.slice(
      atIndex + 1,
    );

  const visible =
    local.slice(
      0,
      Math.min(2, local.length),
    );

  return `${visible}***@${domain}`;
}

function maskPhoneNumber(
  phoneNumber: string,
): string {
  const normalized =
    phoneNumber.trim();

  const digits =
    normalized.replace(
      /\D/g,
      '',
    );

  if (digits.length < 4) {
    return 'SMS number configured';
  }

  const suffix =
    digits.slice(-3);

  const prefix =
    normalized.startsWith('+')
      ? '+'
      : '';

  return `${prefix}***${suffix}`;
}

function getSafeRecipientLabel(
  channel: AlertChannel,
  preferences: AlertPreferences,
): string {
  if (channel === 'email') {
    return preferences.emailAddress
      ? maskEmail(
          preferences.emailAddress,
        )
      : 'Email not configured';
  }

  if (channel === 'slack') {
    return preferences.slackWebhookUrl
      ? 'Slack webhook configured'
      : 'Slack webhook not configured';
  }

  return preferences.phoneNumber
    ? maskPhoneNumber(
        preferences.phoneNumber,
      )
    : 'SMS number not configured';
}

function normalizeStoredRecipient(
  channel: AlertChannel,
  recipient: unknown,
): string {
  if (
    typeof recipient !== 'string' ||
    recipient.trim().length === 0
  ) {
    return channel === 'slack'
      ? 'Slack destination'
      : channel === 'email'
        ? 'Email destination'
        : 'SMS destination';
  }

  const value =
    recipient.trim();

  /*
   * Historical rows may contain raw
   * destinations from the legacy
   * implementation. Never expose them
   * through the service contract.
   */
  if (channel === 'slack') {
    return value ===
      'not-configured'
      ? 'Slack webhook not configured'
      : 'Slack webhook configured';
  }

  if (channel === 'email') {
    return value ===
      'not-configured'
      ? 'Email not configured'
      : maskEmail(value);
  }

  return value ===
    'not-configured'
    ? 'SMS number not configured'
    : maskPhoneNumber(value);
}

function normalizeStoredError(
  value: unknown,
): string | undefined {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0
  ) {
    return undefined;
  }

  const normalized =
    value.trim();

  const allowedCodes =
    new Set<DispatchFailureCode>([
      'CHANNEL_NOT_CONFIGURED',
      'EMAIL_PROVIDER_NOT_CONFIGURED',
      'SMS_PROVIDER_NOT_CONFIGURED',
      'SLACK_DISPATCH_FAILED',
      'DISPATCH_FAILED',
    ]);

  if (
    allowedCodes.has(
      normalized as DispatchFailureCode,
    )
  ) {
    return normalized;
  }

  /*
   * Legacy rows may contain provider
   * messages or internal error details.
   * Do not return those details.
   */
  return 'DISPATCH_FAILED';
}

function getFailureCode(
  error: unknown,
  channel: AlertChannel,
): DispatchFailureCode {
  if (
    error instanceof Error
  ) {
    if (
      error.message ===
      'EMAIL_PROVIDER_NOT_CONFIGURED'
    ) {
      return 'EMAIL_PROVIDER_NOT_CONFIGURED';
    }

    if (
      error.message ===
      'SMS_PROVIDER_NOT_CONFIGURED'
    ) {
      return 'SMS_PROVIDER_NOT_CONFIGURED';
    }

    if (
      error.message ===
      'SLACK_DISPATCH_FAILED'
    ) {
      return 'SLACK_DISPATCH_FAILED';
    }
  }

  return channel === 'slack'
    ? 'SLACK_DISPATCH_FAILED'
    : 'DISPATCH_FAILED';
}

// ─── Preferences ─────────────────────────────────────────

export function getAlertPreferences(): AlertPreferences {
  const db =
    getDatabase();

  const row =
    db.prepare(
      'SELECT * FROM alert_preferences WHERE id = ?',
    ).get(
      PREFS_ROW_ID,
    ) as
      | Record<string, unknown>
      | undefined;

  if (!row) {
    return {
      enabledChannels: [],
      thresholdSeverity:
        'critical',
      batchAlerts: true,
      batchIntervalMs:
        300000,
    };
  }

  const parseChannels = (
    value: unknown,
  ): AlertPreferences['enabledChannels'] => {
    try {
      if (
        typeof value !== 'string'
      ) {
        return [];
      }

      const parsed =
        JSON.parse(
          value,
        ) as unknown;

      if (
        !Array.isArray(parsed)
      ) {
        return [];
      }

      return parsed.filter(
        (
          channel,
        ): channel is AlertChannel =>
          channel === 'email' ||
          channel === 'slack' ||
          channel === 'sms',
      );
    } catch {
      return [];
    }
  };

  return {
    enabledChannels:
      parseChannels(
        row.enabled_channels,
      ),

    emailAddress:
      typeof row.email_address ===
        'string' &&
      row.email_address.trim()
        ? row.email_address
        : undefined,

    slackWebhookUrl:
      typeof row.slack_webhook_url ===
        'string' &&
      row.slack_webhook_url.trim()
        ? row.slack_webhook_url
        : undefined,

    phoneNumber:
      typeof row.phone_number ===
        'string' &&
      row.phone_number.trim()
        ? row.phone_number
        : undefined,

    thresholdSeverity:
      row.threshold_severity ===
      'warning'
        ? 'warning'
        : 'critical',

    batchAlerts:
      Boolean(
        row.batch_alerts,
      ),

    batchIntervalMs:
      Number(
        row.batch_interval_ms,
      ) || 300000,
  };
}

export function updateAlertPreferences(
  partial: Partial<AlertPreferences>,
): AlertPreferences {
  const existing =
    getAlertPreferences();

  const merged: AlertPreferences = {
    enabledChannels:
      partial.enabledChannels ??
      existing.enabledChannels,

    emailAddress:
      partial.emailAddress ??
      existing.emailAddress,

    slackWebhookUrl:
      partial.slackWebhookUrl ??
      existing.slackWebhookUrl,

    phoneNumber:
      partial.phoneNumber ??
      existing.phoneNumber,

    thresholdSeverity:
      partial.thresholdSeverity ??
      existing.thresholdSeverity,

    batchAlerts:
      partial.batchAlerts ??
      existing.batchAlerts,

    batchIntervalMs:
      partial.batchIntervalMs ??
      existing.batchIntervalMs,
  };

  const db =
    getDatabase();

  db.prepare(`
    INSERT INTO alert_preferences (
      id,
      enabled_channels,
      email_address,
      slack_webhook_url,
      phone_number,
      threshold_severity,
      batch_alerts,
      batch_interval_ms,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(id) DO UPDATE SET
      enabled_channels = excluded.enabled_channels,
      email_address = excluded.email_address,
      slack_webhook_url = excluded.slack_webhook_url,
      phone_number = excluded.phone_number,
      threshold_severity = excluded.threshold_severity,
      batch_alerts = excluded.batch_alerts,
      batch_interval_ms = excluded.batch_interval_ms,
      updated_at = excluded.updated_at
  `).run(
    PREFS_ROW_ID,
    JSON.stringify(
      merged.enabledChannels,
    ),
    merged.emailAddress ?? null,
    merged.slackWebhookUrl ?? null,
    merged.phoneNumber ?? null,
    merged.thresholdSeverity,
    merged.batchAlerts ? 1 : 0,
    merged.batchIntervalMs,
  );

  return merged;
}

// ─── Notifications ───────────────────────────────────────

export async function sendAlertNotification(
  alert: PerformanceAlert,
  preferences: AlertPreferences,
  batchedAlerts?: PerformanceAlert[],
): Promise<AlertNotification[]> {
  const allAlerts =
    batchedAlerts
      ? [
          alert,
          ...batchedAlerts,
        ]
      : [alert];

  const db =
    getDatabase();

  const results:
    AlertNotification[] = [];

  for (
    const channel of
    preferences.enabledChannels
  ) {
    const id =
      randomUUID();

    const timestamp =
      Date.now();

    let status:
      | 'sent'
      | 'failed' =
      'failed';

    let errorMessage:
      | DispatchFailureCode
      | undefined;

    try {
      if (channel === 'email') {
        if (
          !preferences.emailAddress
        ) {
          errorMessage =
            'CHANNEL_NOT_CONFIGURED';
        } else {
          await dispatchEmail(
            alert,
            preferences.emailAddress,
            allAlerts,
          );

          status = 'sent';
        }
      } else if (
        channel === 'slack'
      ) {
        if (
          !preferences.slackWebhookUrl
        ) {
          errorMessage =
            'CHANNEL_NOT_CONFIGURED';
        } else {
          await dispatchSlack(
            alert,
            preferences.slackWebhookUrl,
            allAlerts,
          );

          status = 'sent';
        }
      } else {
        if (
          !preferences.phoneNumber
        ) {
          errorMessage =
            'CHANNEL_NOT_CONFIGURED';
        } else {
          await dispatchSms(
            alert,
            preferences.phoneNumber,
          );

          status = 'sent';
        }
      }
    } catch (error) {
      errorMessage =
        getFailureCode(
          error,
          channel,
        );

      /*
       * Never log destination values,
       * provider payloads, webhook URLs,
       * phone numbers, email addresses,
       * or raw provider errors.
       */
      console.error(
        `[alert-service] ${channel} dispatch failed: ${errorMessage}`,
      );
    }

    const recipient =
      getSafeRecipientLabel(
        channel,
        preferences,
      );

    db.prepare(`
      INSERT INTO alert_notifications (
        id,
        timestamp,
        metric,
        severity,
        value,
        threshold,
        message,
        recipient,
        channel,
        status,
        error_message
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      timestamp,
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

    results.push({
      id,
      timestamp,
      alert,
      recipient,
      channel,
      status,
      errorMessage,
    });
  }

  db.exec(`
    DELETE FROM alert_notifications
    WHERE id NOT IN (
      SELECT id
      FROM alert_notifications
      ORDER BY timestamp DESC
      LIMIT ${MAX_NOTIFICATIONS}
    )
  `);

  return results;
}

export function getAlertNotificationHistory(
  limit = 50,
): AlertNotification[] {
  const db =
    getDatabase();

  const safeLimit =
    Math.max(
      1,
      Math.min(
        MAX_NOTIFICATIONS,
        Number.isFinite(limit)
          ? Math.floor(limit)
          : 50,
      ),
    );

  const rows =
    db.prepare(
      'SELECT * FROM alert_notifications ORDER BY timestamp DESC LIMIT ?',
    ).all(
      safeLimit,
    ) as Record<
      string,
      unknown
    >[];

  return rows
    .filter(
      hasValidMetric,
    )
    .map((row) => {
      const channel:
        AlertChannel =
        row.channel === 'slack'
          ? 'slack'
          : row.channel === 'sms'
            ? 'sms'
            : 'email';

      return {
        id:
          typeof row.id ===
            'string'
            ? row.id
            : 'unknown',

        timestamp:
          Number(
            row.timestamp,
          ),

        alert: {
          metric:
            row.metric,

          severity:
            row.severity ===
            'warning'
              ? 'warning'
              : 'critical',

          value:
            Number(
              row.value,
            ),

          threshold:
            Number(
              row.threshold,
            ),

          message:
            typeof row.message ===
              'string'
              ? row.message
              : '',
        },

        recipient:
          normalizeStoredRecipient(
            channel,
            row.recipient,
          ),

        channel,

        status:
          row.status === 'sent'
            ? 'sent'
            : 'failed',

        errorMessage:
          normalizeStoredError(
            row.error_message,
          ),
      };
    });
}

export function getAlertStats(): {
  totalAlerts: number;
  criticalCount: number;
  warningCount: number;
  sentCount: number;
  failedCount: number;
  byChannel: Record<
    AlertChannel,
    number
  >;
} {
  const db =
    getDatabase();

  const rows =
    db.prepare(
      'SELECT severity, status, channel FROM alert_notifications',
    ).all() as Array<{
      severity: string;
      status: string;
      channel: string;
    }>;

  return {
    totalAlerts:
      rows.length,

    criticalCount:
      rows.filter(
        (row) =>
          row.severity ===
          'critical',
      ).length,

    warningCount:
      rows.filter(
        (row) =>
          row.severity ===
          'warning',
      ).length,

    sentCount:
      rows.filter(
        (row) =>
          row.status ===
          'sent',
      ).length,

    failedCount:
      rows.filter(
        (row) =>
          row.status ===
          'failed',
      ).length,

    byChannel: {
      email:
        rows.filter(
          (row) =>
            row.channel ===
            'email',
        ).length,

      slack:
        rows.filter(
          (row) =>
            row.channel ===
            'slack',
        ).length,

      sms:
        rows.filter(
          (row) =>
            row.channel ===
            'sms',
        ).length,
    },
  };
}

// ─── Channel dispatchers ─────────────────────────────────

async function dispatchEmail(
  alert: PerformanceAlert,
  _emailAddress: string,
  _allAlerts: PerformanceAlert[],
): Promise<void> {
  /*
   * Email delivery is intentionally
   * fail-closed until a production
   * provider is implemented.
   *
   * Never mark an alert as sent merely
   * because configuration exists.
   */
  void alert;
  void _emailAddress;
  void _allAlerts;

  throw new Error(
    'EMAIL_PROVIDER_NOT_CONFIGURED',
  );
}

async function dispatchSlack(
  alert: PerformanceAlert,
  webhookUrl: string,
  allAlerts: PerformanceAlert[],
): Promise<void> {
  const payload = {
    attachments: [
      {
        color:
          alert.severity ===
          'critical'
            ? '#dc2626'
            : '#ea580c',

        title:
          `${alert.severity.toUpperCase()}: ${alert.metric}`,

        text:
          allAlerts
            .map(
              (item) =>
                `*${item.metric}*: ${item.message} — ${item.value} (threshold ${item.threshold})`,
            )
            .join('\n'),

        footer:
          'PHCL Super Performance Monitor',
      },
    ],
  };

  /*
   * Never print the webhook URL,
   * destination or full payload.
   */
  if (
    process.env.NODE_ENV !==
    'production'
  ) {
    console.info(
      '[alert-service] Slack dispatch simulated in non-production.',
    );

    return;
  }

  let response: Response;

  try {
    response =
      await fetch(
        webhookUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body:
            JSON.stringify(
              payload,
            ),
          signal:
            AbortSignal.timeout(
              10_000,
            ),
        },
      );
  } catch {
    throw new Error(
      'SLACK_DISPATCH_FAILED',
    );
  }

  if (!response.ok) {
    throw new Error(
      'SLACK_DISPATCH_FAILED',
    );
  }
}

async function dispatchSms(
  alert: PerformanceAlert,
  _phoneNumber: string,
): Promise<void> {
  /*
   * SMS delivery is intentionally
   * fail-closed until a production
   * provider is implemented.
   */
  void alert;
  void _phoneNumber;

  throw new Error(
    'SMS_PROVIDER_NOT_CONFIGURED',
  );
}