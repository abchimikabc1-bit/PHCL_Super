import { NextResponse } from 'next/server';
import { getLiveCryptoUsdRates } from '@/lib/live-crypto-rates';

export async function GET() {
  const result = await getLiveCryptoUsdRates();
  const status = result.success ? 200 : 502;

  return NextResponse.json(result, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}