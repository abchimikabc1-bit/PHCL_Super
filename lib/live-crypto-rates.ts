import { LIVE_CRYPTOS } from '@/lib/currency-config';

export const COINGECKO_ID_BY_CODE: Record<string, string> = {
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
  PI: 'pi-network',
  BNB: 'binancecoin',
};

export type LiveRatesResult = {
  success: boolean;
  source: 'coingecko' | 'fallback';
  rates: Record<string, number>;
  fetchedAt: number;
  error?: string;
};

const getFallbackRates = (): Record<string, number> =>
  LIVE_CRYPTOS.reduce<Record<string, number>>((acc, entry) => {
    if (Number.isFinite(entry.priceUSD) && entry.priceUSD > 0) {
      acc[entry.symbol] = Number(entry.priceUSD);
    }
    return acc;
  }, {});

export async function getLiveCryptoUsdRates(): Promise<LiveRatesResult> {
  const ids = Object.values(COINGECKO_ID_BY_CODE).join(',');
  const fallbackRates = getFallbackRates();
  const fetchedAt = Date.now();
  const apiKey = process.env.COINGECKO_API_KEY?.trim();

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      {
        cache: 'no-store',
        headers: apiKey
          ? {
              accept: 'application/json',
              'x-cg-demo-api-key': apiKey,
            }
          : {
              accept: 'application/json',
            },
      }
    );

    if (!response.ok) {
      return {
        success: false,
        source: 'fallback',
        error: `CoinGecko returned status ${response.status}`,
        rates: fallbackRates,
        fetchedAt,
      };
    }

    const data = (await response.json()) as Record<string, { usd?: number }>;
    const rates: Record<string, number> = {};

    Object.entries(COINGECKO_ID_BY_CODE).forEach(([code, id]) => {
      const usd = data?.[id]?.usd;
      if (Number.isFinite(usd) && (usd as number) > 0) {
        rates[code] = Number(usd);
      }
    });

    if (Object.keys(rates).length === 0) {
      return {
        success: false,
        source: 'fallback',
        error: 'CoinGecko returned no usable rates',
        rates: fallbackRates,
        fetchedAt,
      };
    }

    return {
      success: true,
      source: 'coingecko',
      rates: { ...fallbackRates, ...rates },
      fetchedAt,
    };
  } catch (error) {
    return {
      success: false,
      source: 'fallback',
      error: error instanceof Error ? error.message : 'Failed to fetch live rates',
      rates: fallbackRates,
      fetchedAt,
    };
  }
}
