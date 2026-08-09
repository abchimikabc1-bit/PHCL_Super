import { getDatabase } from '@/lib/db';
import { generatePerformanceAlerts, type PerformanceReport } from '@/lib/performance-analytics';

export interface RumSummary {
  totalReports: number;
  deviceBreakdown: Record<'mobile' | 'tablet' | 'desktop', number>;
  averages: {
    lcp: number;
    fid: number;
    cls: number;
    ttfb: number;
    pageLoadTime: number;
    imageLoadTime: number;
    bandwidthSavings: number;
  };
  ratings: {
    lcpGoodRate: number;
    fidGoodRate: number;
    clsGoodRate: number;
    ttfbGoodRate: number;
  };
  recentReports: Array<{
    timestamp: number;
    device: 'mobile' | 'tablet' | 'desktop';
    url: string;
    lcp: number;
    fid: number;
    cls: number;
    ttfb: number;
  }>;
}

const MAX_REPORTS = 250;

const toPositiveNumber = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : 0;
};

const validRating = (r: unknown): 'good' | 'needs-improvement' | 'poor' =>
  r === 'good' || r === 'needs-improvement' || r === 'poor' ? r : 'needs-improvement';

const validDevice = (d: unknown): 'mobile' | 'tablet' | 'desktop' =>
  d === 'mobile' || d === 'tablet' || d === 'desktop' ? d : 'desktop';

type RumRow = {
  timestamp: number;
  url: string;
  device: string;
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
};

const rowToReport = (row: RumRow): PerformanceReport => ({
  timestamp: row.timestamp,
  url: row.url,
  device: validDevice(row.device),
  coreWebVitals: {
    lcp:  { name: 'Largest Contentful Paint', value: row.lcp_value  ?? 0, rating: validRating(row.lcp_rating)  },
    fid:  { name: 'First Input Delay',         value: row.fid_value  ?? 0, rating: validRating(row.fid_rating)  },
    cls:  { name: 'Cumulative Layout Shift',    value: row.cls_value  ?? 0, rating: validRating(row.cls_rating)  },
    ttfb: { name: 'Time to First Byte',         value: row.ttfb_value ?? 0, rating: validRating(row.ttfb_rating) },
  },
  imageMetrics: {
    totalImages: row.total_images,
    lazyLoadedImages: row.lazy_loaded_images,
    priorityImages: row.priority_images,
    averageLoadTime: row.avg_image_load_time,
    totalImageBandwidth: row.total_image_bandwidth,
    compressedImageBandwidth: row.compressed_image_bandwidth,
    bandwidthSavings: row.bandwidth_savings,
  },
  navigationTiming: {
    dns: row.nav_dns,
    tcp: row.nav_tcp,
    ttfb: row.nav_ttfb,
    domInteractive: row.nav_dom_interactive,
    domComplete: row.nav_dom_complete,
    pageLoadTime: row.nav_page_load,
  },
});

export function savePerformanceReport(report: PerformanceReport): PerformanceReport {
  const db = getDatabase();
  const ts     = toPositiveNumber(report.timestamp) || Date.now();
  const url    = typeof report.url === 'string' ? report.url.slice(0, 400) : '';
  const device = validDevice(report.device);

  db.prepare(`
    INSERT INTO rum_reports (
      timestamp, url, device,
      lcp_value, lcp_rating, fid_value, fid_rating,
      cls_value, cls_rating, ttfb_value, ttfb_rating,
      total_images, lazy_loaded_images, priority_images, avg_image_load_time,
      total_image_bandwidth, compressed_image_bandwidth, bandwidth_savings,
      nav_dns, nav_tcp, nav_ttfb, nav_dom_interactive, nav_dom_complete, nav_page_load
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    ts, url, device,
    toPositiveNumber(report.coreWebVitals?.lcp?.value),
    validRating(report.coreWebVitals?.lcp?.rating),
    toPositiveNumber(report.coreWebVitals?.fid?.value),
    validRating(report.coreWebVitals?.fid?.rating),
    toPositiveNumber(report.coreWebVitals?.cls?.value),
    validRating(report.coreWebVitals?.cls?.rating),
    toPositiveNumber(report.coreWebVitals?.ttfb?.value),
    validRating(report.coreWebVitals?.ttfb?.rating),
    toPositiveNumber(report.imageMetrics?.totalImages),
    toPositiveNumber(report.imageMetrics?.lazyLoadedImages),
    toPositiveNumber(report.imageMetrics?.priorityImages),
    toPositiveNumber(report.imageMetrics?.averageLoadTime),
    toPositiveNumber(report.imageMetrics?.totalImageBandwidth),
    toPositiveNumber(report.imageMetrics?.compressedImageBandwidth),
    toPositiveNumber(report.imageMetrics?.bandwidthSavings),
    toPositiveNumber(report.navigationTiming?.dns),
    toPositiveNumber(report.navigationTiming?.tcp),
    toPositiveNumber(report.navigationTiming?.ttfb),
    toPositiveNumber(report.navigationTiming?.domInteractive),
    toPositiveNumber(report.navigationTiming?.domComplete),
    toPositiveNumber(report.navigationTiming?.pageLoadTime),
  );

  // Keep only the newest MAX_REPORTS records
  db.exec(`
    DELETE FROM rum_reports
    WHERE id NOT IN (SELECT id FROM rum_reports ORDER BY id DESC LIMIT ${MAX_REPORTS})
  `);

  return {
    timestamp: ts, url, device,
    coreWebVitals: {
      lcp:  { name: 'Largest Contentful Paint', value: toPositiveNumber(report.coreWebVitals?.lcp?.value),  rating: validRating(report.coreWebVitals?.lcp?.rating)  },
      fid:  { name: 'First Input Delay',         value: toPositiveNumber(report.coreWebVitals?.fid?.value),  rating: validRating(report.coreWebVitals?.fid?.rating)  },
      cls:  { name: 'Cumulative Layout Shift',    value: toPositiveNumber(report.coreWebVitals?.cls?.value),  rating: validRating(report.coreWebVitals?.cls?.rating)  },
      ttfb: { name: 'Time to First Byte',         value: toPositiveNumber(report.coreWebVitals?.ttfb?.value), rating: validRating(report.coreWebVitals?.ttfb?.rating) },
    },
    imageMetrics: {
      totalImages: toPositiveNumber(report.imageMetrics?.totalImages),
      lazyLoadedImages: toPositiveNumber(report.imageMetrics?.lazyLoadedImages),
      priorityImages: toPositiveNumber(report.imageMetrics?.priorityImages),
      averageLoadTime: toPositiveNumber(report.imageMetrics?.averageLoadTime),
      totalImageBandwidth: toPositiveNumber(report.imageMetrics?.totalImageBandwidth),
      compressedImageBandwidth: toPositiveNumber(report.imageMetrics?.compressedImageBandwidth),
      bandwidthSavings: toPositiveNumber(report.imageMetrics?.bandwidthSavings),
    },
    navigationTiming: {
      dns: toPositiveNumber(report.navigationTiming?.dns),
      tcp: toPositiveNumber(report.navigationTiming?.tcp),
      ttfb: toPositiveNumber(report.navigationTiming?.ttfb),
      domInteractive: toPositiveNumber(report.navigationTiming?.domInteractive),
      domComplete: toPositiveNumber(report.navigationTiming?.domComplete),
      pageLoadTime: toPositiveNumber(report.navigationTiming?.pageLoadTime),
    },
  };
}

export function getPerformanceReports(limit = 50): PerformanceReport[] {
  const db = getDatabase();
  const safeLimit = Math.max(1, Math.min(MAX_REPORTS, Math.floor(limit)));
  const rows = db.prepare(
    'SELECT * FROM rum_reports ORDER BY id DESC LIMIT ?'
  ).all(safeLimit) as RumRow[];
  return rows.map(rowToReport);
}

const avg = (vals: number[]) =>
  vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;

export function getRumSummary(limit = 20): RumSummary {
  const reports = getPerformanceReports(limit);
  const breakdown: RumSummary['deviceBreakdown'] = { mobile: 0, tablet: 0, desktop: 0 };
  const good = { lcp: 0, fid: 0, cls: 0, ttfb: 0 };
  const lcp: number[] = [], fid: number[] = [], cls: number[] = [], ttfb: number[] = [];
  const pageLoad: number[] = [], imgLoad: number[] = [], bwSave: number[] = [];

  for (const r of reports) {
    breakdown[r.device] += 1;
    lcp.push(r.coreWebVitals.lcp.value);
    fid.push(r.coreWebVitals.fid.value);
    cls.push(r.coreWebVitals.cls.value);
    ttfb.push(r.coreWebVitals.ttfb.value);
    pageLoad.push(r.navigationTiming.pageLoadTime);
    imgLoad.push(r.imageMetrics.averageLoadTime);
    bwSave.push(r.imageMetrics.bandwidthSavings);
    if (r.coreWebVitals.lcp.rating  === 'good') good.lcp  += 1;
    if (r.coreWebVitals.fid.rating  === 'good') good.fid  += 1;
    if (r.coreWebVitals.cls.rating  === 'good') good.cls  += 1;
    if (r.coreWebVitals.ttfb.rating === 'good') good.ttfb += 1;
  }

  const n = reports.length;
  return {
    totalReports: n,
    deviceBreakdown: breakdown,
    averages: {
      lcp: avg(lcp), fid: avg(fid), cls: avg(cls), ttfb: avg(ttfb),
      pageLoadTime: avg(pageLoad), imageLoadTime: avg(imgLoad), bandwidthSavings: avg(bwSave),
    },
    ratings: {
      lcpGoodRate:  n ? (good.lcp  / n) * 100 : 0,
      fidGoodRate:  n ? (good.fid  / n) * 100 : 0,
      clsGoodRate:  n ? (good.cls  / n) * 100 : 0,
      ttfbGoodRate: n ? (good.ttfb / n) * 100 : 0,
    },
    recentReports: reports.slice(0, 10).map((r) => ({
      timestamp: r.timestamp,
      device: r.device,
      url: r.url,
      lcp:  r.coreWebVitals.lcp.value,
      fid:  r.coreWebVitals.fid.value,
      cls:  r.coreWebVitals.cls.value,
      ttfb: r.coreWebVitals.ttfb.value,
    })),
  };
}

export function getLatestPerformanceAlertPayload(): ReturnType<typeof generatePerformanceAlerts> {
  const latest = getPerformanceReports(1)[0];
  return latest ? generatePerformanceAlerts(latest) : [];
}
