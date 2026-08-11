import { NextResponse } from 'next/server';
import { USD_TO_TZS, PI_GCV_USD } from '@/components/currency';

const COINGECKO_ID_BY_CODE: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  XRP: 'ripple',
  ADA: 'cardano',
  SOL: 'solana',
  DOGE: 'dogecoin',
  LINK: 'chainlink',
  MATIC: 'matic-network',
  BCH: 'bitcoin-cash',
  LTC: 'litecoin',
  XMR: 'monero',
  ZEC: 'zcash',
  USDC: 'usd-coin',
};

export async function GET() {
  const base = {
    usdToTzs: USD_TO_TZS,
    piToUsd: PI_GCV_USD,
    fetchedAt: Date.now(),
  };

  try {
    const ids = Object.values(COINGECKO_ID_BY_CODE).join(',');
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          success: true,
          source: 'fallback',
          error: `CoinGecko status ${response.status}`,
          rates: {},
          ...base,
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        }
      );
    }

    const data = (await response.json()) as Record<string, { usd?: number }>;
    const rates: Record<string, number> = {};

    for (const [code, id] of Object.entries(COINGECKO_ID_BY_CODE)) {
      const usd = data?.[id]?.usd;
      if (typeof usd === 'number' && Number.isFinite(usd) && usd > 0) {
        rates[code] = usd;
      }
    }

    return NextResponse.json(
      {
        success: true,
        source: 'coingecko',
        rates,
        ...base,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: true,
        source: 'fallback',
        error: error instanceof Error ? error.message : 'Failed to fetch live rates',
        rates: {},
        ...base,
      },
      { status: 200 }
    );
  }
}