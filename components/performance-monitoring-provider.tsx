'use client';

import { usePerformanceAnalytics } from '@/hooks/use-performance-analytics';

interface PerformanceMonitoringProviderProps {
  enabled?: boolean;
}

/**
 * Global performance monitoring bootstrap.
 * Mount once in the app shell to collect real user metrics.
 */
export function PerformanceMonitoringProvider({
  enabled = true,
}: PerformanceMonitoringProviderProps) {
  usePerformanceAnalytics({
    enabled,
    autoSend: true,
    logToConsole: false,
  });

  return null;
}
