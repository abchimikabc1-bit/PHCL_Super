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

type CartItemRow = Record<string, unknown>;
type CommerceOrderRow = Record<string, unknown>;
type WalletSnapshotRow = Record<string, unknown> | null;
type WalletLedgerRow = Record<string, unknown>;
type OrderStatusMapRow = Record<string, unknown>;
type OrderStatusAuditRow = Record<string, unknown>;
type CustomerOverrideMapRow = Record<string, unknown>;
type DeliveredAtMapRow = Record<string, unknown>;
type AdminSessionRow = Record<string, unknown>;
type AdminSettingsRow = Record<string, unknown> | null;
type AdminSettingsAuditRow = Record<string, unknown>;
type CurrencyConfigRow = Record<string, unknown> | null;
type CurrencyAuditRow = Record<string, unknown>;
type LanguageConfigRow = Record<string, unknown> | null;
type LanguageAuditRow = Record<string, unknown>;
type ProductStockConfigRow = Record<string, unknown> | null;
type ProductStockAuditRow = Record<string, unknown>;

type RuntimeStore = {
  commerce_revision: number;
  commerce_updated_at: string;
  rum_reports: RumReportRow[];
  alert_preferences: AlertPreferencesRow[];
  alert_notifications: AlertNotificationRow[];
  cart_items: CartItemRow[];
  commerce_orders: CommerceOrderRow[];
  wallet_snapshot: WalletSnapshotRow;
  wallet_ledger: WalletLedgerRow[];
  order_status_map: OrderStatusMapRow;
  order_status_audit: OrderStatusAuditRow[];
  customer_override_map: CustomerOverrideMapRow;
  delivered_at_map: DeliveredAtMapRow;
  admin_sessions: AdminSessionRow;
  admin_settings: AdminSettingsRow;
  admin_settings_audit: AdminSettingsAuditRow[];
  currency_config: CurrencyConfigRow;
  currency_audit: CurrencyAuditRow[];
  language_config: LanguageConfigRow;
  language_audit: LanguageAuditRow[];
  product_stock_config: ProductStockConfigRow;
  product_stock_audit: ProductStockAuditRow[];
};

const STORAGE_DIR = path.join(process.cwd(), '.data');
const STORE_FILE = path.join(STORAGE_DIR, 'runtime-store.json');
const DB_GLOBAL_KEY = '__phclRuntimeStore';

type GlobalWithStore = typeof globalThis & {
  [DB_GLOBAL_KEY]?: RuntimeStore;
};

const defaultState = (): RuntimeStore => ({
  commerce_revision: 0,
  commerce_updated_at: new Date(0).toISOString(),
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
  cart_items: [],
  commerce_orders: [],
  wallet_snapshot: null,
  wallet_ledger: [],
  order_status_map: {},
  order_status_audit: [],
  customer_override_map: {},
  delivered_at_map: {},
  admin_sessions: {},
  admin_settings: null,
  admin_settings_audit: [],
  currency_config: null,
  currency_audit: [],
  language_config: null,
  language_audit: [],
  product_stock_config: null,
  product_stock_audit: [],
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
      commerce_revision: Number.isFinite(Number(parsed.commerce_revision)) ? Number(parsed.commerce_revision) : 0,
      commerce_updated_at: typeof parsed.commerce_updated_at === 'string' ? parsed.commerce_updated_at : new Date(0).toISOString(),
      rum_reports: Array.isArray(parsed.rum_reports) ? parsed.rum_reports : [],
      alert_preferences: Array.isArray(parsed.alert_preferences) && parsed.alert_preferences.length > 0
        ? parsed.alert_preferences
        : defaultState().alert_preferences,
      alert_notifications: Array.isArray(parsed.alert_notifications) ? parsed.alert_notifications : [],
      cart_items: Array.isArray(parsed.cart_items) ? parsed.cart_items : [],
      commerce_orders: Array.isArray(parsed.commerce_orders) ? parsed.commerce_orders : [],
      wallet_snapshot: parsed.wallet_snapshot && typeof parsed.wallet_snapshot === 'object'
        ? (parsed.wallet_snapshot as WalletSnapshotRow)
        : null,
      wallet_ledger: Array.isArray(parsed.wallet_ledger) ? parsed.wallet_ledger : [],
      order_status_map: parsed.order_status_map && typeof parsed.order_status_map === 'object'
        ? (parsed.order_status_map as OrderStatusMapRow)
        : {},
      order_status_audit: Array.isArray(parsed.order_status_audit) ? parsed.order_status_audit : [],
      customer_override_map: parsed.customer_override_map && typeof parsed.customer_override_map === 'object'
        ? (parsed.customer_override_map as CustomerOverrideMapRow)
        : {},
      delivered_at_map: parsed.delivered_at_map && typeof parsed.delivered_at_map === 'object'
        ? (parsed.delivered_at_map as DeliveredAtMapRow)
        : {},
      admin_sessions: parsed.admin_sessions && typeof parsed.admin_sessions === 'object'
        ? (parsed.admin_sessions as AdminSessionRow)
        : {},
      admin_settings: parsed.admin_settings && typeof parsed.admin_settings === 'object'
        ? (parsed.admin_settings as AdminSettingsRow)
        : null,
      admin_settings_audit: Array.isArray(parsed.admin_settings_audit) ? parsed.admin_settings_audit : [],
      currency_config: parsed.currency_config && typeof parsed.currency_config === 'object'
        ? (parsed.currency_config as CurrencyConfigRow)
        : null,
      currency_audit: Array.isArray(parsed.currency_audit) ? parsed.currency_audit : [],
      language_config: parsed.language_config && typeof parsed.language_config === 'object'
        ? (parsed.language_config as LanguageConfigRow)
        : null,
      language_audit: Array.isArray(parsed.language_audit) ? parsed.language_audit : [],
      product_stock_config: parsed.product_stock_config && typeof parsed.product_stock_config === 'object'
        ? (parsed.product_stock_config as ProductStockConfigRow)
        : null,
      product_stock_audit: Array.isArray(parsed.product_stock_audit) ? parsed.product_stock_audit : [],
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

export const getRuntimeStoreState = (): RuntimeStore => {
  if (!globalForDb[DB_GLOBAL_KEY]) {
    globalForDb[DB_GLOBAL_KEY] = loadState();
  }

  return clone(globalForDb[DB_GLOBAL_KEY]!);
};

export const updateRuntimeStoreState = (mutator: (state: RuntimeStore) => void): RuntimeStore => {
  if (!globalForDb[DB_GLOBAL_KEY]) {
    globalForDb[DB_GLOBAL_KEY] = loadState();
  }

  mutator(globalForDb[DB_GLOBAL_KEY]!);
  saveState(globalForDb[DB_GLOBAL_KEY]!);
  return clone(globalForDb[DB_GLOBAL_KEY]!);
};
