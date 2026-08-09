'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CoreWebVitals,
  PerformanceReport,
  trackAllCoreWebVitals,
  generatePerformanceReport,
  sendPerformanceReport,
  getPerformanceSummary,
} from '@/lib/performance-analytics';

export interface UsePerformanceAnalyticsOptions {
  enabled?: boolean;
  reportEndpoint?: string;
  logToConsole?: boolean;
  autoSend?: boolean;
  onReport?: (report: PerformanceReport) => void;
}

/**
 * Hook for tracking and reporting performance metrics
 * Automatically collects Core Web Vitals and sends to analytics
 */
export function usePerformanceAnalytics(
  options: UsePerformanceAnalyticsOptions = {}
) {
  const {
    enabled = true,
    reportEndpoint = '/api/analytics/performance',
    logToConsole = true,
    autoSend = true,
    onReport,
  } = options;

  const [vitals, setVitals] = useState<Partial<CoreWebVitals>>({});
  const [isReported, setIsReported] = useState(false);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const vitalsRef = useRef<Partial<CoreWebVitals>>({});
  const reportedRef = useRef(false);

  useEffect(() => {
    vitalsRef.current = vitals;
  }, [vitals]);

  const sendReport = useCallback(async () => {
    if (!enabled || reportedRef.current) {
      return;
    }

    const snapshot = vitalsRef.current;
    if (Object.keys(snapshot).length === 0) {
      return;
    }

    try {
      const generatedReport = await generatePerformanceReport(snapshot);
      setReport(generatedReport);
      onReport?.(generatedReport);
      await sendPerformanceReport(generatedReport, reportEndpoint);
      reportedRef.current = true;
      setIsReported(true);
    } catch (error) {
      console.error('Failed to generate performance report:', error);
    }
  }, [enabled, onReport, reportEndpoint]);

  useEffect(() => {
    if (!enabled) return;

    // Track Core Web Vitals
    trackAllCoreWebVitals((updatedVitals) => {
      setVitals(updatedVitals);

      // Log to console if enabled
      if (logToConsole && Object.keys(updatedVitals).length > 0) {
        console.log(getPerformanceSummary(updatedVitals));
      }

      // Auto-send report once full set is ready
      if (autoSend && updatedVitals.lcp && updatedVitals.fid && updatedVitals.cls && updatedVitals.ttfb) {
        void sendReport();
      }
    });

    // Capture a real-user report even if FID never arrives
    const timeoutId = window.setTimeout(() => {
      if (autoSend && !reportedRef.current) {
        void sendReport();
      }
    }, 8000);

    const handlePageHide = () => {
      if (autoSend && !reportedRef.current) {
        void sendReport();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handlePageHide();
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, logToConsole, autoSend, sendReport]);

  return {
    vitals,
    report,
    isReported,
    isLoading: !isReported && enabled,
  };
}

/**
 * Hook for tracking image performance metrics
 */
export interface ImageLoadMetrics {
  totalImages: number;
  lazyLoadedImages: number;
  priorityImages: number;
  averageLoadTime: number;
}

export function useImagePerformance() {
  const [metrics, setMetrics] = useState<ImageLoadMetrics>({
    totalImages: 0,
    lazyLoadedImages: 0,
    priorityImages: 0,
    averageLoadTime: 0,
  });

  const trackImageLoad = (
    lazyLoaded: boolean,
    isPriority: boolean,
    loadTime: number
  ) => {
    setMetrics((prev) => ({
      ...prev,
      totalImages: prev.totalImages + 1,
      lazyLoadedImages: lazyLoaded ? prev.lazyLoadedImages + 1 : prev.lazyLoadedImages,
      priorityImages: isPriority ? prev.priorityImages + 1 : prev.priorityImages,
      averageLoadTime:
        (prev.averageLoadTime * prev.totalImages + loadTime) /
        (prev.totalImages + 1),
    }));
  };

  const reset = () => {
    setMetrics({
      totalImages: 0,
      lazyLoadedImages: 0,
      priorityImages: 0,
      averageLoadTime: 0,
    });
  };

  return {
    metrics,
    trackImageLoad,
    reset,
  };
}

/**
 * Hook for monitoring real user metrics over time
 */
export interface PerformanceTimeSeries {
  timestamp: number;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export function usePerformanceMonitoring(
  metricName: keyof CoreWebVitals
) {
  const [timeSeries, setTimeSeries] = useState<PerformanceTimeSeries[]>([]);

  useEffect(() => {
    trackAllCoreWebVitals((vitals) => {
      const metric = vitals[metricName];
      if (metric) {
        setTimeSeries((prev) => [
          ...prev,
          {
            timestamp: Date.now(),
            value: metric.value,
            rating: metric.rating,
          },
        ]);
      }
    });
  }, [metricName]);

  const average = timeSeries.length
    ? timeSeries.reduce((sum, item) => sum + item.value, 0) / timeSeries.length
    : 0;

  const min = timeSeries.length ? Math.min(...timeSeries.map((s) => s.value)) : 0;
  const max = timeSeries.length ? Math.max(...timeSeries.map((s) => s.value)) : 0;

  return {
    timeSeries,
    average,
    min,
    max,
    count: timeSeries.length,
  };
}
