import { NextResponse } from 'next/server';

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
  try {
    const ids = Object.values(COINGECKO_ID_BY_CODE).join(',');
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          source: 'fallback',
          error: `CoinGecko returned status ${response.status}`,
          rates: {},
          fetchedAt: Date.now(),
        },
        { status: 502 }
      );
    }

    const data = (await response.json()) as Record<string, { usd?: number }>;
    const rates: Record<string, number> = {};

    Object.entries(COINGECKO_ID_BY_CODE).forEach(([code, id]) => {
      const usd = data?.[id]?.usd;
      if (Number.isFinite(usd) && (usd as number) > 0) {
        rates[code] = Number(usd);
      }
    });

    return NextResponse.json(
      {
        success: true,
        source: 'coingecko',
        rates,
        fetchedAt: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        source: 'fallback',
        error: error instanceof Error ? error.message : 'Failed to fetch live rates',
        rates: {},
        fetchedAt: Date.now(),
      },
      { status: 500 }
    );
  }
}