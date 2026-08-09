import { NextRequest, NextResponse } from 'next/server';
import {
  sendAlertNotification,
  getAlertNotificationHistory,
  getAlertStats,
  getAlertPreferences,
} from '@/lib/alert-service';
import { generatePerformanceAlerts } from '@/lib/performance-analytics';

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action');

    if (action === 'history') {
      const limit = Math.max(1, Math.min(100, Number(request.nextUrl.searchParams.get('limit') || 50)));
      const history = getAlertNotificationHistory(limit);
      return NextResponse.json({
        success: true,
        notifications: history,
      });
    }

    if (action === 'stats') {
      const stats = getAlertStats();
      return NextResponse.json({
        success: true,
        stats,
      });
    }

    const stats = getAlertStats();
    const recentNotifications = getAlertNotificationHistory(10);

    return NextResponse.json({
      success: true,
      stats,
      recentNotifications,
    });
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch alerts',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as any;
    const { performanceReport } = body;

    if (!performanceReport) {
      return NextResponse.json(
        { success: false, error: 'Missing performanceReport in request body' },
        { status: 400 }
      );
    }

    // Generate alerts from performance report
    const alerts = generatePerformanceAlerts(performanceReport);
    const prefs = getAlertPreferences();

    if (prefs.enabledChannels.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No alert channels configured',
        alerts,
        notifications: [],
      });
    }

    // Filter alerts by severity preference
    const filteredAlerts = alerts.filter((alert) => {
      if (prefs.thresholdSeverity === 'critical') {
        return alert.severity === 'critical';
      }
      return true; // Include both critical and warning
    });

    const notifications = [];

    for (const alert of filteredAlerts) {
      const sent = await sendAlertNotification(alert, prefs);
      notifications.push(...sent);
    }

    return NextResponse.json({
      success: true,
      alertsGenerated: alerts.length,
      alertsSent: filteredAlerts.length,
      notifications,
    });
  } catch (error) {
    console.error('Failed to send alerts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send alerts',
      },
      { status: 500 }
    );
  }
}
