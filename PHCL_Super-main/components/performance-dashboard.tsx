'use client';

import { usePerformanceAnalytics, useImagePerformance } from '@/hooks/use-performance-analytics';
import { CoreWebVitals } from '@/lib/performance-analytics';

interface PerformanceDashboardProps {
  showDetails?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
}

/**
 * Performance Dashboard Component
 * Displays Core Web Vitals and performance metrics
 * Can be embedded in any page or shown as overlay
 */
export function PerformanceDashboard({
  showDetails = true,
  autoHide = false,
  autoHideDelay = 5000,
}: PerformanceDashboardProps) {
  const { vitals, report, isLoading } = usePerformanceAnalytics({
    enabled: true,
    logToConsole: true,
    autoSend: true,
  });

  const { metrics } = useImagePerformance();

  if (!showDetails && isLoading) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="rounded-lg border border-purple-500/30 bg-slate-900/95 backdrop-blur-md p-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-purple-300">⚡ Performance Metrics</h3>
          {isLoading && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs text-amber-400">Measuring...</span>
            </div>
          )}
        </div>

        {/* Core Web Vitals Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* LCP */}
          <MetricCard
            label="LCP"
            value={vitals.lcp?.value}
            unit="ms"
            rating={vitals.lcp?.rating}
            description="Load"
          />

          {/* FID */}
          <MetricCard
            label="FID"
            value={vitals.fid?.value}
            unit="ms"
            rating={vitals.fid?.rating}
            description="Interaction"
          />

          {/* CLS */}
          <MetricCard
            label="CLS"
            value={vitals.cls?.value}
            unit=""
            rating={vitals.cls?.rating}
            description="Stability"
          />

          {/* TTFB */}
          <MetricCard
            label="TTFB"
            value={vitals.ttfb?.value}
            unit="ms"
            rating={vitals.ttfb?.rating}
            description="Server"
          />
        </div>

        {/* Image Metrics */}
        {metrics.totalImages > 0 && (
          <div className="mb-3 pt-3 border-t border-slate-700/50">
            <p className="text-xs text-slate-400 mb-2">📷 Images</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total:</span>
                <span className="text-amber-300 font-semibold">{metrics.totalImages}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Lazy Loaded:</span>
                <span className="text-cyan-300 font-semibold">
                  {metrics.lazyLoadedImages} ({Math.round((metrics.lazyLoadedImages / metrics.totalImages) * 100)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Avg Load:</span>
                <span className="text-purple-300 font-semibold">{metrics.averageLoadTime.toFixed(0)}ms</span>
              </div>
            </div>
          </div>
        )}

        {/* Device & URL */}
        {report && (
          <div className="pt-3 border-t border-slate-700/50 text-xs text-slate-500 space-y-1">
            <p>Device: <span className="text-slate-400 capitalize">{report.device}</span></p>
            <p>Page Load: <span className="text-slate-400">{report.navigationTiming.pageLoadTime}ms</span></p>
          </div>
        )}

        {/* Footer */}
        <p className="mt-3 text-xs text-slate-600 text-center">
          Google Core Web Vitals
        </p>
      </div>
    </div>
  );
}

/**
 * Individual metric card
 */
interface MetricCardProps {
  label: string;
  value?: number;
  unit: string;
  rating?: 'good' | 'needs-improvement' | 'poor';
  description: string;
}

function MetricCard({
  label,
  value,
  unit,
  rating = 'needs-improvement',
  description,
}: MetricCardProps) {
  const getColor = (r?: string) => {
    switch (r) {
      case 'good':
        return 'text-green-400';
      case 'needs-improvement':
        return 'text-amber-400';
      case 'poor':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const getBgColor = (r?: string) => {
    switch (r) {
      case 'good':
        return 'bg-green-500/10';
      case 'needs-improvement':
        return 'bg-amber-500/10';
      case 'poor':
        return 'bg-red-500/10';
      default:
        return 'bg-slate-700/20';
    }
  };

  return (
    <div className={`rounded p-2 ${getBgColor(rating)}`}>
      <p className="text-xs text-slate-500 mb-1">{description}</p>
      <p className={`text-sm font-bold ${getColor(rating)}`}>
        {value !== undefined ? `${value}${unit}` : '—'}
      </p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

/**
 * Performance Report Modal Component
 */
export function PerformanceReportModal() {
  const { vitals, report } = usePerformanceAnalytics({
    enabled: true,
  });

  if (!report) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-slate-900/80 border border-slate-700 p-4">
        <h2 className="text-lg font-bold text-white mb-4">Performance Report</h2>

        {/* Core Web Vitals */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-amber-300 mb-3">Core Web Vitals</h3>
          <div className="space-y-2 text-sm">
            {vitals.lcp && (
              <div className="flex justify-between">
                <span className="text-slate-400">Largest Contentful Paint</span>
                <span className={`font-semibold ${getMetricColor(vitals.lcp.rating)}`}>
                  {vitals.lcp.value}ms
                </span>
              </div>
            )}
            {vitals.fid && (
              <div className="flex justify-between">
                <span className="text-slate-400">First Input Delay</span>
                <span className={`font-semibold ${getMetricColor(vitals.fid.rating)}`}>
                  {vitals.fid.value}ms
                </span>
              </div>
            )}
            {vitals.cls && (
              <div className="flex justify-between">
                <span className="text-slate-400">Cumulative Layout Shift</span>
                <span className={`font-semibold ${getMetricColor(vitals.cls.rating)}`}>
                  {vitals.cls.value}
                </span>
              </div>
            )}
            {vitals.ttfb && (
              <div className="flex justify-between">
                <span className="text-slate-400">Time to First Byte</span>
                <span className={`font-semibold ${getMetricColor(vitals.ttfb.rating)}`}>
                  {vitals.ttfb.value}ms
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Timing */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-cyan-300 mb-3">Navigation Timing</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">DNS Lookup</span>
              <span className="text-slate-300 font-mono">{report.navigationTiming.dns}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">TCP Connection</span>
              <span className="text-slate-300 font-mono">{report.navigationTiming.tcp}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">DOM Interactive</span>
              <span className="text-slate-300 font-mono">{report.navigationTiming.domInteractive}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Page Load</span>
              <span className="text-amber-300 font-bold font-mono">{report.navigationTiming.pageLoadTime}ms</span>
            </div>
          </div>
        </div>

        {/* Device Info */}
        <div className="text-sm text-slate-400">
          <p>Device: <span className="text-slate-300 capitalize font-semibold">{report.device}</span></p>
          <p>URL: <span className="text-slate-300 text-xs break-all">{report.url}</span></p>
          <p>Timestamp: <span className="text-slate-300 font-mono">{new Date(report.timestamp).toISOString()}</span></p>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper to get color based on rating
 */
function getMetricColor(rating?: string): string {
  switch (rating) {
    case 'good':
      return 'text-green-400';
    case 'needs-improvement':
      return 'text-amber-400';
    case 'poor':
      return 'text-red-400';
    default:
      return 'text-slate-400';
  }
}
