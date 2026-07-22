import fs from 'node:fs';
import path from 'node:path';

type RumReportRow = {
  id: number;
  timestamp: number;
  url: string;
  device: 'mobile' | 'tablet' | 'desktop';
  lcp_value: number | null;
  lcp_rating: string | null;
  fid_value: number | null;
  fid_rating: string | null;
  cls_value: number | null;
  cls_rating: string | null;
  ttfb_value: number | null;
  ttfb_rating: string | null;
  total_images: number;
  lazy_loaded_images: number;
  priority_images: number;
  avg_image_load_time: number;
  total_image_bandwidth: number;
  compressed_image_bandwidth: number;
  bandwidth_savings: number;
  nav_dns: number;
  nav_tcp: number;
  nav_ttfb: number;
  nav_dom_interactive: number;
  nav_dom_complete: number;
  nav_page_load: number;
  created_at: number;
};

type AlertPreferencesRow = {
  id: number;
  enabled_channels: string;
  email_address: string | null;
  slack_webhook_url: string | null;
  phone_number: string | null;
  threshold_severity: 'critical' | 'warning';
  batch_alerts: number;
  batch_interval_ms: number;
  updated_at: number;
};

type AlertNotificationRow = {
  id: string;
  timestamp: number;
  metric: string;
  severity: string;
  value: string;
  threshold: string;
  message: string;
  recipient: string;
  channel: string;
  status: string;
  error_message: string | null;
  created_at: number;
};

type RuntimeStore = {
  rum_reports: RumReportRow[];
  alert_preferences: AlertPreferencesRow[];
  alert_notifications: AlertNotificationRow[];
};

const STORAGE_DIR = path.join(process.cwd(), '.data');
const STORE_FILE = path.join(STORAGE_DIR, 'runtime-store.json');
const DB_GLOBAL_KEY = '__phclRuntimeStore';

type GlobalWithStore = typeof globalThis & {
  [DB_GLOBAL_KEY]?: RuntimeStore;
};

const defaultState = (): RuntimeStore => ({
  rum_reports: [],
  alert_preferences: [
    {
      id: 1,
      enabled_channels: '[]',
      email_address: null,
      slack_webhook_url: null,
      phone_number: null,
      threshold_severity: 'critical',
      batch_alerts: 1,
      batch_interval_ms: 300000,
      updated_at: Math.floor(Date.now() / 1000),
    },
  ],
  alert_notifications: [],
});

const ensureStorageDir = () => {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
};

const loadState = (): RuntimeStore => {
  ensureStorageDir();

  try {
    if (!fs.existsSync(STORE_FILE)) {
      const initial = defaultState();
      fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }

    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<RuntimeStore>;

    return {
      rum_reports: Array.isArray(parsed.rum_reports) ? parsed.rum_reports : [],
      alert_preferences: Array.isArray(parsed.alert_preferences) && parsed.alert_preferences.length > 0
        ? parsed.alert_preferences
        : defaultState().alert_preferences,
      alert_notifications: Array.isArray(parsed.alert_notifications) ? parsed.alert_notifications : [],
    };
  } catch {
    const fallback = defaultState();
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(fallback, null, 2), 'utf8');
    } catch {
      // ignore write failures during fallback initialization
    }
    return fallback;
  }
};

const saveState = (state: RuntimeStore) => {
  ensureStorageDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(state, null, 2), 'utf8');
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

class PreparedStatement {
  constructor(private readonly sql: string, private readonly state: RuntimeStore) {}

  get(...params: unknown[]): Record<string, unknown> | undefined {
    const sql = this.sql.trim().toLowerCase();

    if (sql.startsWith('select * from alert_preferences where id = ?')) {
      const id = Number(params[0] ?? 1);
      const row = this.state.alert_preferences.find((entry) => entry.id === id);
      return row ? clone(row) : undefined;
    }

    if (sql.startsWith('select * from alert_notifications order by timestamp desc limit ?')) {
      const limit = Math.max(1, Math.floor(Number(params[0] ?? 50)));
      return clone(
        [...this.state.alert_notifications]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit)[0]
      );
    }

    if (sql.startsWith('select * from rum_reports order by id desc limit ?')) {
      const limit = Math.max(1, Math.floor(Number(params[0] ?? 50)));
      return clone(
        [...this.state.rum_reports]
          .sort((a, b) => b.id - a.id)
          .slice(0, limit)[0]
      );
    }

    return undefined;
  }

  all(...params: unknown[]): Record<string, unknown>[] {
    const sql = this.sql.trim().toLowerCase();

    if (sql.startsWith('select * from alert_notifications order by timestamp desc limit ?')) {
      const limit = Math.max(1, Math.floor(Number(params[0] ?? 50)));
      return clone(
        [...this.state.alert_notifications]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit)
      );
    }

    if (sql.startsWith('select severity, status, channel from alert_notifications')) {
      return clone(
        [...this.state.alert_notifications].map((row) => ({
          severity: row.severity,
          status: row.status,
          channel: row.channel,
        }))
      );
    }

    if (sql.startsWith('select * from rum_reports order by id desc limit ?')) {
      const limit = Math.max(1, Math.floor(Number(params[0] ?? 50)));
      return clone(
        [...this.state.rum_reports]
          .sort((a, b) => b.id - a.id)
          .slice(0, limit)
      );
    }

    return [];
  }

  run(...params: unknown[]) {
    const sql = this.sql.trim().toLowerCase();

    if (sql.startsWith('insert into alert_preferences')) {
      const [id, enabledChannels, emailAddress, slackWebhookUrl, phoneNumber, thresholdSeverity, batchAlerts, batchIntervalMs] = params;
      const row: AlertPreferencesRow = {
        id: Number(id ?? 1),
        enabled_channels: String(enabledChannels ?? '[]'),
        email_address: emailAddress == null ? null : String(emailAddress),
        slack_webhook_url: slackWebhookUrl == null ? null : String(slackWebhookUrl),
        phone_number: phoneNumber == null ? null : String(phoneNumber),
        threshold_severity: thresholdSeverity === 'warning' ? 'warning' : 'critical',
        batch_alerts: Number(batchAlerts ?? 1) ? 1 : 0,
        batch_interval_ms: Math.max(0, Number(batchIntervalMs ?? 300000)),
        updated_at: Math.floor(Date.now() / 1000),
      };

      const idx = this.state.alert_preferences.findIndex((entry) => entry.id === row.id);
      if (idx >= 0) this.state.alert_preferences[idx] = row;
      else this.state.alert_preferences.push(row);
      saveState(this.state);
      return { changes: 1 };
    }

    if (sql.startsWith('insert into alert_notifications')) {
      const [id, timestamp, metric, severity, value, threshold, message, recipient, channel, status, errorMessage] = params;
      const row: AlertNotificationRow = {
        id: String(id),
        timestamp: Number(timestamp ?? Date.now()),
        metric: String(metric),
        severity: String(severity),
        value: String(value),
        threshold: String(threshold),
        message: String(message),
        recipient: String(recipient),
        channel: String(channel),
        status: String(status),
        error_message: errorMessage == null ? null : String(errorMessage),
        created_at: Math.floor(Date.now() / 1000),
      };

      this.state.alert_notifications.push(row);
      saveState(this.state);
      return { changes: 1 };
    }

    if (sql.startsWith('insert into rum_reports')) {
      const [
        timestamp,
        url,
        device,
        lcp_value,
        lcp_rating,
        fid_value,
        fid_rating,
        cls_value,
        cls_rating,
        ttfb_value,
        ttfb_rating,
        total_images,
        lazy_loaded_images,
        priority_images,
        avg_image_load_time,
        total_image_bandwidth,
        compressed_image_bandwidth,
        bandwidth_savings,
        nav_dns,
        nav_tcp,
        nav_ttfb,
        nav_dom_interactive,
        nav_dom_complete,
        nav_page_load,
      ] = params;

      const nextId = this.state.rum_reports.reduce((max, row) => Math.max(max, row.id), 0) + 1;
      const row: RumReportRow = {
        id: nextId,
        timestamp: Number(timestamp ?? Date.now()),
        url: String(url ?? ''),
        device: device === 'mobile' || device === 'tablet' ? device : 'desktop',
        lcp_value: lcp_value == null ? null : Number(lcp_value),
        lcp_rating: lcp_rating == null ? null : String(lcp_rating),
        fid_value: fid_value == null ? null : Number(fid_value),
        fid_rating: fid_rating == null ? null : String(fid_rating),
        cls_value: cls_value == null ? null : Number(cls_value),
        cls_rating: cls_rating == null ? null : String(cls_rating),
        ttfb_value: ttfb_value == null ? null : Number(ttfb_value),
        ttfb_rating: ttfb_rating == null ? null : String(ttfb_rating),
        total_images: Number(total_images ?? 0),
        lazy_loaded_images: Number(lazy_loaded_images ?? 0),
        priority_images: Number(priority_images ?? 0),
        avg_image_load_time: Number(avg_image_load_time ?? 0),
        total_image_bandwidth: Number(total_image_bandwidth ?? 0),
        compressed_image_bandwidth: Number(compressed_image_bandwidth ?? 0),
        bandwidth_savings: Number(bandwidth_savings ?? 0),
        nav_dns: Number(nav_dns ?? 0),
        nav_tcp: Number(nav_tcp ?? 0),
        nav_ttfb: Number(nav_ttfb ?? 0),
        nav_dom_interactive: Number(nav_dom_interactive ?? 0),
        nav_dom_complete: Number(nav_dom_complete ?? 0),
        nav_page_load: Number(nav_page_load ?? 0),
        created_at: Math.floor(Date.now() / 1000),
      };

      this.state.rum_reports.push(row);
      saveState(this.state);
      return { changes: 1 };
    }

    return { changes: 0 };
  }
}

class RuntimeDatabase {
  constructor(private readonly state: RuntimeStore) {}

  prepare(sql: string) {
    return new PreparedStatement(sql, this.state);
  }

  exec(sql: string) {
    const normalized = sql.trim().toLowerCase();

    if (normalized.includes('delete from alert_notifications')) {
      const limitMatch = sql.match(/limit\s+(\d+)/i);
      const limit = limitMatch ? Math.max(0, Number(limitMatch[1])) : 500;
      this.state.alert_notifications = [...this.state.alert_notifications]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
      saveState(this.state);
      return;
    }

    if (normalized.includes('delete from rum_reports')) {
      const limitMatch = sql.match(/limit\s+(\d+)/i);
      const limit = limitMatch ? Math.max(0, Number(limitMatch[1])) : 250;
      this.state.rum_reports = [...this.state.rum_reports]
        .sort((a, b) => b.id - a.id)
        .slice(0, limit);
      saveState(this.state);
      return;
    }

    // PRAGMA / schema statements are no-ops for file-backed storage.
  }
}

const globalForDb = globalThis as GlobalWithStore;

export const getDatabase = (): RuntimeDatabase => {
  if (!globalForDb[DB_GLOBAL_KEY]) {
    globalForDb[DB_GLOBAL_KEY] = loadState();
  }

  return new RuntimeDatabase(globalForDb[DB_GLOBAL_KEY]!);
};
