/**
 * Core Web Vitals & Performance Analytics
 * Tracks LCP, FID, CLS, TTFB and other performance metrics
 * Integrates with analytics platforms for production monitoring
 */

/**
 * Core Web Vitals metrics as defined by Google
 */
export interface CoreWebVitals {
  lcp: {
    name: 'Largest Contentful Paint';
    value: number; // milliseconds
    rating: 'good' | 'needs-improvement' | 'poor';
  };
  fid: {
    name: 'First Input Delay';
    value: number; // milliseconds
    rating: 'good' | 'needs-improvement' | 'poor';
  };
  cls: {
    name: 'Cumulative Layout Shift';
    value: number; // 0 to infinity
    rating: 'good' | 'needs-improvement' | 'poor';
  };
  ttfb: {
    name: 'Time to First Byte';
    value: number; // milliseconds
    rating: 'good' | 'needs-improvement' | 'poor';
  };
}

/**
 * Image-specific performance metrics
 */
export interface ImageMetrics {
  totalImages: number;
  lazyLoadedImages: number;
  priorityImages: number;
  averageLoadTime: number; // milliseconds
  totalImageBandwidth: number; // bytes
  compressedImageBandwidth: number; // bytes
  bandwidthSavings: number; // percentage
}

/**
 * Complete performance report
 */
export interface PerformanceReport {
  timestamp: number;
  url: string;
  device: 'mobile' | 'tablet' | 'desktop';
  coreWebVitals: CoreWebVitals;
  imageMetrics: ImageMetrics;
  navigationTiming: {
    dns: number;
    tcp: number;
    ttfb: number;
    domInteractive: number;
    domComplete: number;
    pageLoadTime: number;
  };
}

export type PerformanceAlertSeverity = 'warning' | 'critical';

export interface PerformanceAlert {
  metric: 'lcp' | 'fid' | 'cls' | 'ttfb' | 'imageBandwidth' | 'imageLoadTime';
  severity: PerformanceAlertSeverity;
  message: string;
  value: number;
  threshold: number;
}

const createFallbackMetric = <T extends CoreWebVitals[keyof CoreWebVitals]>(
  name: T['name']
): T => ({
  name,
  value: 0,
  rating: 'needs-improvement',
} as T);

export function normalizeCoreWebVitals(vitals: Partial<CoreWebVitals>): CoreWebVitals {
  return {
    lcp: vitals.lcp ?? createFallbackMetric('Largest Contentful Paint'),
    fid: vitals.fid ?? createFallbackMetric('First Input Delay'),
    cls: vitals.cls ?? createFallbackMetric('Cumulative Layout Shift'),
    ttfb: vitals.ttfb ?? createFallbackMetric('Time to First Byte'),
  };
}

/**
 * Thresholds for Core Web Vitals (Google standards)
 */
const WEB_VITALS_THRESHOLDS = {
  lcp: {
    good: 2500,           // 2.5 seconds
    'needs-improvement': 4000, // 4 seconds
  },
  fid: {
    good: 100,            // 100ms
    'needs-improvement': 300, // 300ms
  },
  cls: {
    good: 0.1,            // 0.1
    'needs-improvement': 0.25, // 0.25
  },
  ttfb: {
    good: 800,            // 800ms
    'needs-improvement': 1800, // 1.8 seconds
  },
} as const;

/**
 * Get rating for metric value
 */
function getRating(
  value: number,
  good: number,
  needsImprovement: number
): 'good' | 'needs-improvement' | 'poor' {
  if (value <= good) return 'good';
  if (value <= needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Track Largest Contentful Paint (LCP)
 * Measures loading performance perceived by user
 */
export function trackLCP(callback: (lcp: CoreWebVitals['lcp']) => void): void {
  if (typeof window === 'undefined') return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      const lcpEntry = lastEntry as PerformanceEntry & {
        renderTime?: number;
        loadTime?: number;
      };

      const value = Math.round(lcpEntry.renderTime ?? lcpEntry.loadTime ?? 0);
      const rating = getRating(
        value,
        WEB_VITALS_THRESHOLDS.lcp.good,
        WEB_VITALS_THRESHOLDS.lcp['needs-improvement']
      );

      callback({
        name: 'Largest Contentful Paint',
        value,
        rating,
      });
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });

    // Cleanup after 5 seconds (LCP finalizes quickly)
    setTimeout(() => observer.disconnect(), 5000);
  } catch (e) {
    // PerformanceObserver not supported
  }
}

/**
 * Track First Input Delay (FID)
 * Measures responsiveness to user interaction
 */
export function trackFID(callback: (fid: CoreWebVitals['fid']) => void): void {
  if (typeof window === 'undefined') return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const firstEntry = entries[0];
      const fidEntry = firstEntry as PerformanceEntry & {
        processingDuration?: number;
      };

      const value = Math.round(fidEntry.processingDuration ?? 0);
      const rating = getRating(
        value,
        WEB_VITALS_THRESHOLDS.fid.good,
        WEB_VITALS_THRESHOLDS.fid['needs-improvement']
      );

      callback({
        name: 'First Input Delay',
        value,
        rating,
      });

      observer.disconnect(); // Only need first interaction
    });

    observer.observe({ entryTypes: ['first-input'] });
  } catch (e) {
    // PerformanceObserver not supported
  }
}

/**
 * Track Cumulative Layout Shift (CLS)
 * Measures visual stability
 */
export function trackCLS(callback: (cls: CoreWebVitals['cls']) => void): void {
  if (typeof window === 'undefined') return;

  try {
    let clsValue = 0;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          // Ignore shifts caused by user input
          clsValue += (entry as any).value;

          const rating = getRating(
            clsValue,
            WEB_VITALS_THRESHOLDS.cls.good,
            WEB_VITALS_THRESHOLDS.cls['needs-improvement']
          );

          callback({
            name: 'Cumulative Layout Shift',
            value: Math.round(clsValue * 1000) / 1000, // 3 decimals
            rating,
          });
        }
      }
    });

    observer.observe({ entryTypes: ['layout-shift'] });

    // Report final value when page is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        observer.disconnect();
      }
    });
  } catch (e) {
    // PerformanceObserver not supported
  }
}

/**
 * Track Time To First Byte (TTFB)
 * Measures server response time
 */
export function trackTTFB(callback: (ttfb: CoreWebVitals['ttfb']) => void): void {
  if (typeof window === 'undefined') return;

  try {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (navigation) {
      const value = Math.round(navigation.responseStart - navigation.fetchStart);
      const rating = getRating(
        value,
        WEB_VITALS_THRESHOLDS.ttfb.good,
        WEB_VITALS_THRESHOLDS.ttfb['needs-improvement']
      );

      callback({
        name: 'Time to First Byte',
        value,
        rating,
      });
    }
  } catch (e) {
    // Navigation Timing not available
  }
}

/**
 * Track all Core Web Vitals at once
 */
export function trackAllCoreWebVitals(
  callback: (vitals: Partial<CoreWebVitals>) => void
): void {
  const vitals: Partial<CoreWebVitals> = {};

  trackLCP((lcp) => {
    vitals.lcp = lcp;
    callback({ ...vitals });
  });

  trackFID((fid) => {
    vitals.fid = fid;
    callback({ ...vitals });
  });

  trackCLS((cls) => {
    vitals.cls = cls;
    callback({ ...vitals });
  });

  trackTTFB((ttfb) => {
    vitals.ttfb = ttfb;
    callback({ ...vitals });
  });
}

/**
 * Get Navigation Timing metrics
 */
export function getNavigationTiming(): PerformanceReport['navigationTiming'] | null {
  if (typeof window === 'undefined') return null;

  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (!nav) return null;

    return {
      dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
      tcp: Math.round(nav.connectEnd - nav.connectStart),
      ttfb: Math.round(nav.responseStart - nav.fetchStart),
      domInteractive: Math.round(nav.domInteractive - nav.fetchStart),
      domComplete: Math.round(nav.domComplete - nav.fetchStart),
      pageLoadTime: Math.round(nav.loadEventEnd - nav.fetchStart),
    };
  } catch (e) {
    return null;
  }
}

/**
 * Detect device type based on viewport
 */
export function detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';

  const width = window.innerWidth;

  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Generate comprehensive performance report
 */
export async function generatePerformanceReport(
  vitals: Partial<CoreWebVitals>,
  imageMetrics?: ImageMetrics
): Promise<PerformanceReport> {
  const navigationTiming = getNavigationTiming();

  return {
    timestamp: Date.now(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    device: detectDeviceType(),
    coreWebVitals: normalizeCoreWebVitals(vitals),
    imageMetrics: imageMetrics || {
      totalImages: 0,
      lazyLoadedImages: 0,
      priorityImages: 0,
      averageLoadTime: 0,
      totalImageBandwidth: 0,
      compressedImageBandwidth: 0,
      bandwidthSavings: 0,
    },
    navigationTiming: navigationTiming || {
      dns: 0,
      tcp: 0,
      ttfb: 0,
      domInteractive: 0,
      domComplete: 0,
      pageLoadTime: 0,
    },
  };
}

/**
 * Send performance report to analytics service
 * Integrate with Google Analytics, Datadog, or custom endpoint
 */
export async function sendPerformanceReport(
  report: PerformanceReport,
  endpoint: string = '/api/analytics/performance'
): Promise<void> {
  try {
    // Use sendBeacon if available (more reliable than fetch)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, JSON.stringify(report));
    } else {
      // Fallback to fetch
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
        keepalive: true, // Ensures request completes even if page unloads
      });
    }
  } catch (error) {
    // Silently fail - don't impact user experience
    console.debug('Failed to send performance report:', error);
  }
}

/**
 * Get performance summary for logging
 */
export function getPerformanceSummary(vitals: Partial<CoreWebVitals>): string {
  const entries: string[] = [];

  if (vitals.lcp) {
    entries.push(`LCP: ${vitals.lcp.value}ms (${vitals.lcp.rating})`);
  }
  if (vitals.fid) {
    entries.push(`FID: ${vitals.fid.value}ms (${vitals.fid.rating})`);
  }
  if (vitals.cls) {
    entries.push(`CLS: ${vitals.cls.value} (${vitals.cls.rating})`);
  }
  if (vitals.ttfb) {
    entries.push(`TTFB: ${vitals.ttfb.value}ms (${vitals.ttfb.rating})`);
  }

  return `📊 Web Vitals: ${entries.join(' | ')}`;
}

/**
 * Performance thresholds for logging/alerting
 */
export const PERFORMANCE_THRESHOLDS = {
  lcp: { good: 2500, warning: 4000 },
  fid: { good: 100, warning: 300 },
  cls: { good: 0.1, warning: 0.25 },
  ttfb: { good: 800, warning: 1800 },
} as const;

const IMAGE_ALERT_THRESHOLDS = {
  loadTimeWarning: 300,
  loadTimeCritical: 800,
  bandwidthSavingsWarning: 20,
  bandwidthSavingsCritical: 10,
} as const;

export function generatePerformanceAlerts(report: PerformanceReport): PerformanceAlert[] {
  const alerts: PerformanceAlert[] = [];

  const pushAlert = (
    metric: PerformanceAlert['metric'],
    severity: PerformanceAlertSeverity,
    message: string,
    value: number,
    threshold: number
  ) => {
    alerts.push({ metric, severity, message, value, threshold });
  };

  const lcpValue = report.coreWebVitals.lcp.value;
  if (lcpValue > PERFORMANCE_THRESHOLDS.lcp.warning) {
    pushAlert('lcp', 'critical', 'Largest Contentful Paint is too slow', lcpValue, PERFORMANCE_THRESHOLDS.lcp.warning);
  } else if (lcpValue > PERFORMANCE_THRESHOLDS.lcp.good) {
    pushAlert('lcp', 'warning', 'Largest Contentful Paint needs improvement', lcpValue, PERFORMANCE_THRESHOLDS.lcp.good);
  }

  const fidValue = report.coreWebVitals.fid.value;
  if (fidValue > PERFORMANCE_THRESHOLDS.fid.warning) {
    pushAlert('fid', 'critical', 'First Input Delay is too high', fidValue, PERFORMANCE_THRESHOLDS.fid.warning);
  } else if (fidValue > PERFORMANCE_THRESHOLDS.fid.good) {
    pushAlert('fid', 'warning', 'First Input Delay needs improvement', fidValue, PERFORMANCE_THRESHOLDS.fid.good);
  }

  const clsValue = report.coreWebVitals.cls.value;
  if (clsValue > PERFORMANCE_THRESHOLDS.cls.warning) {
    pushAlert('cls', 'critical', 'Layout shifts are hurting visual stability', clsValue, PERFORMANCE_THRESHOLDS.cls.warning);
  } else if (clsValue > PERFORMANCE_THRESHOLDS.cls.good) {
    pushAlert('cls', 'warning', 'Layout stability needs improvement', clsValue, PERFORMANCE_THRESHOLDS.cls.good);
  }

  const ttfbValue = report.coreWebVitals.ttfb.value;
  if (ttfbValue > PERFORMANCE_THRESHOLDS.ttfb.warning) {
    pushAlert('ttfb', 'critical', 'Server response time is too slow', ttfbValue, PERFORMANCE_THRESHOLDS.ttfb.warning);
  } else if (ttfbValue > PERFORMANCE_THRESHOLDS.ttfb.good) {
    pushAlert('ttfb', 'warning', 'Server response time needs improvement', ttfbValue, PERFORMANCE_THRESHOLDS.ttfb.good);
  }

  const averageImageLoad = report.imageMetrics.averageLoadTime;
  if (averageImageLoad > IMAGE_ALERT_THRESHOLDS.loadTimeCritical) {
    pushAlert('imageLoadTime', 'critical', 'Image load time is too slow', averageImageLoad, IMAGE_ALERT_THRESHOLDS.loadTimeCritical);
  } else if (averageImageLoad > IMAGE_ALERT_THRESHOLDS.loadTimeWarning) {
    pushAlert('imageLoadTime', 'warning', 'Image load time needs improvement', averageImageLoad, IMAGE_ALERT_THRESHOLDS.loadTimeWarning);
  }

  const savings = report.imageMetrics.bandwidthSavings;
  if (savings < IMAGE_ALERT_THRESHOLDS.bandwidthSavingsCritical) {
    pushAlert('imageBandwidth', 'critical', 'Image compression savings are too low', savings, IMAGE_ALERT_THRESHOLDS.bandwidthSavingsCritical);
  } else if (savings < IMAGE_ALERT_THRESHOLDS.bandwidthSavingsWarning) {
    pushAlert('imageBandwidth', 'warning', 'Image compression savings could be better', savings, IMAGE_ALERT_THRESHOLDS.bandwidthSavingsWarning);
  }

  return alerts;
}
