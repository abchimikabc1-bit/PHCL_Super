import { NextRequest, NextResponse } from 'next/server';
import type { CommerceSyncPayload } from '@/lib/commerce-sync';
import { getServerCommerceSnapshot, saveServerCommerceSnapshot } from '@/lib/server-commerce-store';
import { requireAdminSession } from '@/lib/require-admin-session';

export async function GET(request: NextRequest) {
  if (!requireAdminSession(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const snapshot = getServerCommerceSnapshot();
    return NextResponse.json({ success: true, snapshot });
  } catch (error) {
    console.error('Failed to load commerce snapshot:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load commerce snapshot' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!requireAdminSession(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as CommerceSyncPayload;
    const current = getServerCommerceSnapshot();

    if (
      typeof body.expectedRevision === 'number' &&
      body.expectedRevision !== current.revision
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Commerce snapshot revision conflict',
          snapshot: current,
        },
        { status: 409 }
      );
    }

    const snapshot = saveServerCommerceSnapshot(body);
    return NextResponse.json({ success: true, snapshot });
  } catch (error) {
    console.error('Failed to save commerce snapshot:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save commerce snapshot' },
      { status: 400 }
    );
  }
}