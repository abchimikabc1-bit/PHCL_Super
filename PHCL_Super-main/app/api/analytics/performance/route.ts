import { NextRequest, NextResponse } from 'next/server';
import { type PerformanceReport, generatePerformanceAlerts } from '@/lib/performance-analytics';
import { getPerformanceReports, getRumSummary, savePerformanceReport } from '@/lib/rum-store';
import { sendAlertNotification, getAlertStats, getAlertPreferences } from '@/lib/alert-service';

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as PerformanceReport;
    const saved = savePerformanceReport(payload);
    const allReports = getPerformanceReports(250);
    const summary = getRumSummary(20);
    const alerts = generatePerformanceAlerts(saved);

    // Trigger notifications for critical/warning alerts if channels are configured
    const prefs = getAlertPreferences();
    const notifications: Awaited<ReturnType<typeof sendAlertNotification>> = [];
    if (prefs.enabledChannels.length > 0 && alerts.length > 0) {
      const filteredAlerts = alerts.filter((a) =>
        prefs.thresholdSeverity === 'critical' ? a.severity === 'critical' : true
      );
      for (const alert of filteredAlerts) {
        try {
          const sent = await sendAlertNotification(alert, prefs);
          notifications.push(...sent);
        } catch (error) {
          console.error('Failed to send alert notification:', error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalReports: allReports.length,
      summary,
      alerts,
      alertsSent: notifications.length,
      notifications: notifications.slice(0, 3), // Include first 3 notifications in response
      report: saved,
    });
  } catch (error) {
    console.error('Performance RUM API error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === 'production'
            ? 'Failed to save performance report'
            : error instanceof Error
              ? error.message
              : 'Failed to save performance report',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = Math.max(1, Math.min(100, Number(limitParam) || 20));

    const summary = getRumSummary(limit);
    const reports = getPerformanceReports(limit);
    const latestReport = reports[0];
    const alertStats = getAlertStats();

    return NextResponse.json({
      success: true,
      summary,
      alerts: latestReport ? generatePerformanceAlerts(latestReport) : [],
      alertStats,
      reports,
    });
  } catch (error) {
    console.error('Performance RUM API error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === 'production'
            ? 'Failed to fetch performance data'
            : error instanceof Error
              ? error.message
              : 'Failed to fetch performance data',
      },
      { status: 500 }
    );
  }
}
