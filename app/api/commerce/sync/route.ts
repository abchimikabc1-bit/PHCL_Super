import 'server-only';

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * ============================================================
 * PHCL SUPER — RETIRED LEGACY COMMERCE SYNC ENDPOINT
 * ============================================================
 *
 * SECURITY:
 *
 * The legacy /api/commerce/sync endpoint previously exposed a
 * shared commerce snapshot and accepted browser-controlled state.
 *
 * That architecture is no longer permitted for PHCL authoritative
 * commerce or financial data.
 *
 * Authoritative domains must use dedicated authenticated APIs for:
 *
 * - customer identity
 * - orders
 * - financial ledger
 * - wallet state
 * - stock
 * - admin configuration
 * - currency configuration
 * - language configuration
 * - workflow state
 * - audit records
 *
 * This endpoint is intentionally retired.
 *
 * Do not restore shared snapshot GET/POST behavior here.
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