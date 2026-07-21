import { NextRequest, NextResponse } from 'next/server';
import type { CommerceStatePayload } from '@/lib/commerce-sync';
import {
  COMMERCE_BACKUP_VERSION,
  createCommerceBackupDocument,
  validateCommerceBackupDocument,
} from '@/lib/commerce-backup';
import { getServerCommerceSnapshot, saveServerCommerceSnapshot } from '@/lib/server-commerce-store';

export async function GET() {
  try {
    const snapshot = getServerCommerceSnapshot();
    return NextResponse.json({ success: true, ...createCommerceBackupDocument(snapshot) });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to export commerce backup' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { snapshot?: CommerceStatePayload; version?: number; checksum?: string; exportedAt?: string };
    let snapshot: CommerceStatePayload | undefined;

    if (body.snapshot && body.version && body.checksum && body.exportedAt) {
      const document = validateCommerceBackupDocument(body);
      if (!document) {
        return NextResponse.json({ success: false, error: 'Backup checksum validation failed' }, { status: 400 });
      }
      if (document.version > COMMERCE_BACKUP_VERSION) {
        return NextResponse.json({ success: false, error: 'Backup version is newer than this server supports' }, { status: 400 });
      }
      snapshot = document.snapshot;
    } else if (body.snapshot) {
      snapshot = body.snapshot;
    }

    if (!snapshot) {
      return NextResponse.json({ success: false, error: 'Missing snapshot payload' }, { status: 400 });
    }

    const savedSnapshot = saveServerCommerceSnapshot(snapshot);
    return NextResponse.json({ success: true, importedAt: new Date().toISOString(), ...createCommerceBackupDocument(savedSnapshot) });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to import commerce backup' },
      { status: 400 }
    );
  }
}