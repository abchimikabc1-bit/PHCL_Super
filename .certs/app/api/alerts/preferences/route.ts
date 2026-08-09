import { NextRequest, NextResponse } from 'next/server';
import { getAlertPreferences, updateAlertPreferences } from '@/lib/alert-service';

export async function GET() {
  try {
    const prefs = getAlertPreferences();
    return NextResponse.json({
      success: true,
      preferences: {
        enabledChannels: prefs.enabledChannels,
        thresholdSeverity: prefs.thresholdSeverity,
        batchAlerts: prefs.batchAlerts,
        batchIntervalMs: prefs.batchIntervalMs,
        // Don't expose sensitive data like actual email/phone/webhook in response
        hasEmailConfigured: !!prefs.emailAddress,
        hasSlackConfigured: !!prefs.slackWebhookUrl,
        hasSmsConfigured: !!prefs.phoneNumber,
      },
    });
  } catch (error) {
    console.error('Failed to get alert preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve preferences' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Parameters<typeof updateAlertPreferences>[0];
    const prefs = updateAlertPreferences(body);

    return NextResponse.json({
      success: true,
      message: 'Alert preferences updated',
      preferences: {
        enabledChannels: prefs.enabledChannels,
        thresholdSeverity: prefs.thresholdSeverity,
        batchAlerts: prefs.batchAlerts,
        batchIntervalMs: prefs.batchIntervalMs,
        hasEmailConfigured: !!prefs.emailAddress,
        hasSlackConfigured: !!prefs.slackWebhookUrl,
        hasSmsConfigured: !!prefs.phoneNumber,
      },
    });
  } catch (error) {
    console.error('Failed to update alert preferences:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update preferences',
      },
      { status: 400 }
    );
  }
}
