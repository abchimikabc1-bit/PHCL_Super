/**
 * Performance Analytics API Endpoints
 * Integrate with monitoring and alerting systems
 */

// This file shows how to create API endpoints for performance analytics

/**
 * POST /api/analytics/performance
 * 
 * Endpoint to receive performance reports from client
 * 
 * Example implementation (app/api/analytics/performance/route.ts):
 * 
 * import { NextRequest, NextResponse } from 'next/server';
 * import { PerformanceReport } from '@/lib/performance-analytics';
 * 
 * export async function POST(request: NextRequest) {
 *   try {
 *     const report: PerformanceReport = await request.json();
 *     
 *     // Store in database
 *     // await db.performanceMetrics.create({
 *     //   timestamp: new Date(report.timestamp),
 *     //   url: report.url,
 *     //   device: report.device,
 *     //   lcp: report.coreWebVitals.lcp.value,
 *     //   fid: report.coreWebVitals.fid.value,
 *     //   cls: report.coreWebVitals.cls.value,
 *     //   ttfb: report.coreWebVitals.ttfb.value,
 *     // });
 *     
 *     // Or send to external service (Google Analytics, Datadog, etc)
 *     // await analyticsService.track('performance_report', report);
 *     
 *     return NextResponse.json({ success: true });
 *   } catch (error) {
 *     return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
 *   }
 * }
 */

/**
 * GET /api/analytics/performance
 * 
 * Get performance metrics summary
 * 
 * Query params:
 * - device: 'mobile' | 'tablet' | 'desktop'
 * - timeRange: '1h' | '24h' | '7d' | '30d'
 * - metric: 'lcp' | 'fid' | 'cls' | 'ttfb'
 */

/**
 * Integration Examples
 */

/**
 * Example 1: Using with Google Analytics
 */
export const googleAnalyticsIntegration = `
'use client';
import { usePerformanceAnalytics } from '@/hooks/use-performance-analytics';

export function AnalyticsTracker() {
  const { report } = usePerformanceAnalytics({
    onReport: (report) => {
      // Send to Google Analytics
      if (window.gtag) {
        window.gtag('event', 'page_view', {
          'page_path': report.url,
          'page_title': document.title,
          'lcp_value': report.coreWebVitals.lcp.value,
          'fid_value': report.coreWebVitals.fid.value,
          'cls_value': report.coreWebVitals.cls.value,
          'ttfb_value': report.coreWebVitals.ttfb.value,
        });
      }
    }
  });
  
  return null;
}
`;

/**
 * Example 2: Using with Datadog
 */
export const datadogIntegration = `
'use client';
import { usePerformanceAnalytics } from '@/hooks/use-performance-analytics';

export function DatadogMonitoring() {
  const { report } = usePerformanceAnalytics({
    onReport: (report) => {
      // Send to Datadog
      if (window.DD_RUM) {
        window.DD_RUM.addUserAction('performance_metrics', {
          lcp: report.coreWebVitals.lcp.value,
          fid: report.coreWebVitals.fid.value,
          cls: report.coreWebVitals.cls.value,
          ttfb: report.coreWebVitals.ttfb.value,
          device: report.device,
          url: report.url,
        });
      }
    }
  });
  
  return null;
}
`;

/**
 * Example 3: Displaying Performance Dashboard
 */
export const performanceDashboardUsage = `
'use client';
import { PerformanceDashboard } from '@/components/performance-dashboard';

export default function Layout() {
  return (
    <>
      {/* Your app content */}
      
      {/* Add performance dashboard - fixed position overlay */}
      <PerformanceDashboard 
        showDetails={true}
        autoHide={false}
      />
    </>
  );
}
`;

/**
 * Example 4: Advanced Image Format Integration
 */
export const advancedImageFormatUsage = `
'use client';
import { selectOptimalFormat, convertToModernFormat } from '@/lib/advanced-image-formats';

export async function OptimizedImageContainer() {
  const format = await selectOptimalFormat();
  
  return (
    <picture>
      {format === 'avif' && (
        <source 
          srcSet={convertToModernFormat(imageUrl, 'avif', { width: 600 })}
          type="image/avif"
        />
      )}
      {format === 'webp' && (
        <source 
          srcSet={convertToModernFormat(imageUrl, 'webp', { width: 600 })}
          type="image/webp"
        />
      )}
      <img 
        src={convertToModernFormat(imageUrl, 'original', { width: 600 })}
        alt="description"
      />
    </picture>
  );
}
`;

/**
 * Example 5: Setup for Production
 */
export const productionSetup = `
// app/layout.tsx
import { PerformanceDashboard } from '@/components/performance-dashboard';
import { initializeFormatDetection } from '@/lib/advanced-image-formats';

export default function RootLayout({ children }) {
  // Initialize format detection on app load
  if (typeof window !== 'undefined') {
    initializeFormatDetection();
  }

  return (
    <html>
      <head>
        {/* Preconnect to analytics endpoints */}
        <link rel="preconnect" href="https://analytics.example.com" />
      </head>
      <body>
        {children}
        
        {/* Production monitoring */}
        <PerformanceDashboard showDetails={process.env.NODE_ENV === 'development'} />
      </body>
    </html>
  );
}
`;

/**
 * Monitoring Dashboard Setup
 * Show real-time performance metrics for your users
 */
export const dashboardSetup = `
// app/admin/performance/page.tsx
'use client';
import { useState, useEffect } from 'react';

interface PerformanceMetric {
  timestamp: number;
  device: string;
  lcp: number;
  fid: number;
  cls: number;
  ttfb: number;
}

export default function PerformanceMonitoringPage() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  
  useEffect(() => {
    // Fetch performance metrics from your database
    async function fetchMetrics() {
      const response = await fetch('/api/analytics/performance?timeRange=24h');
      const data = await response.json();
      setMetrics(data);
    }
    
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30s
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Performance Monitoring</h1>
      
      {/* Charts and metrics display */}
      <div className="grid grid-cols-4 gap-4">
        <MetricChart metric="lcp" data={metrics} label="LCP (ms)" />
        <MetricChart metric="fid" data={metrics} label="FID (ms)" />
        <MetricChart metric="cls" data={metrics} label="CLS" />
        <MetricChart metric="ttfb" data={metrics} label="TTFB (ms)" />
      </div>
    </div>
  );
}
`;
