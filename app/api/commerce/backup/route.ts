import 'server-only';

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * ============================================================
 * PHCL SUPER — RETIRED LEGACY COMMERCE BACKUP ENDPOINT
 * ============================================================
 *
 * SECURITY STATUS:
 *
 * The legacy commerce backup endpoint previously exported and
 * imported a combined commerce snapshot.
 *
 * That snapshot could include data belonging to independent
 * authoritative domains such as:
 *
 * - financial / wallet state
 * - ledger records
 * - orders
 * - admin settings
 * - currency configuration
 * - language configuration
 * - workflow metadata
 * - audit information
 *
 * A shared browser/API-restorable snapshot is no longer permitted
 * to act as an authority for those domains.
 *
 * PHCL backup and recovery must instead be implemented per
 * authoritative subsystem with:
 *
 * - authenticated administrative access
 * - explicit authorization
 * - immutable financial ledger protection
 * - Firestore / infrastructure backup controls
 * - controlled restore workflows
 * - audit logging
 * - integrity and version validation
 *
 * This legacy endpoint is intentionally retired.
 *
 * Do not restore export/import behavior here.
 */

const retiredResponse = (): NextResponse =>
  NextResponse.json(
    {
      success: false,
      error: 'This endpoint is no longer available.',
    },
    {
      status: 410,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );

export async function GET(): Promise<NextResponse> {
  return retiredResponse();
}

export async function POST(): Promise<NextResponse> {
  return retiredResponse();
}

export async function PUT(): Promise<NextResponse> {
  return retiredResponse();
}

export async function PATCH(): Promise<NextResponse> {
  return retiredResponse();
}

export async function DELETE(): Promise<NextResponse> {
  return retiredResponse();
}