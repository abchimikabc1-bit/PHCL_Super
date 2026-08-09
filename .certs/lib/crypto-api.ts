// Real-time crypto price fetching from CoinGecko API (free, no auth required)

export interface RealCryptoPrice {
  id: string;
  symbol: string;
  name: string;
  priceUSD: number;
  priceTZS: number;
  change24h: number;
  high24h: number;
  low24h: number;
  marketCap: number;
  volume24h: number;
}

const TZS_RATE = 2650; // 1 USD = 2650 TZS (approximate)
const COINGECKO_API = "https://api.coingecko.com/api/v3";

const cryptoMap: Record<string, string> = {
  "pi-network": "pi-network",
  bitcoin: "bitcoin",
  ethereum: "ethereum",
  tether: "tether",
  "binance-coin": "binancecoin",
  ripple: "ripple",
  cardano: "cardano",
  solana: "solana",
  dogecoin: "dogecoin",
  litecoin: "litecoin",
  polkadot: "polkadot",
};

const cryptoNames: Record<string, string> = {
  "pi-network": "Pi Network",
  bitcoin: "Bitcoin",
  ethereum: "Ethereum",
  tether: "Tether",
  "binance-coin": "Binance Coin",
  ripple: "XRP",
  cardano: "Cardano",
  solana: "Solana",
  dogecoin: "Dogecoin",
  litecoin: "Litecoin",
  polkadot: "Polkadot",
};

export async function fetchRealCryptoPrices(): Promise<RealCryptoPrice[]> {
  try {
    const ids = Object.values(cryptoMap).join(",");
    
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_high_low_24h=true`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch crypto prices");
    }

    const data = await response.json();
    
    const prices: RealCryptoPrice[] = Object.entries(cryptoMap).map(([id, geckoId]) => {
      const cryptoData = data[geckoId];
      
      if (!cryptoData) {
        throw new Error(`No data for ${id}`);
      }

      const priceUSD = cryptoData.usd || 0;
      const priceTZS = priceUSD * TZS_RATE;
      const change24h = cryptoData.usd_24h_change || 0;
      const high24h = cryptoData.usd_24h_high || priceUSD;
      const low24h = cryptoData.usd_24h_low || priceUSD;
      const marketCap = cryptoData.usd_market_cap || 0;
      const volume24h = cryptoData.usd_24h_vol || 0;

      return {
        id,
        symbol: id === "pi-network" ? "π" : id.toUpperCase().slice(0, 3),
        name: cryptoNames[id] || id,
        priceUSD,
        priceTZS,
        change24h,
        high24h,
        low24h,
        marketCap,
        volume24h,
      };
    });

    return prices;
  } catch (error) {
    console.log("[v0] Error fetching crypto prices:", error);
    // Return empty array on error - page will handle gracefully
    return [];
  }
}

export async function fetchSingleCryptoPrice(id: string): Promise<RealCryptoPrice | null> {
  try {
    const geckoId = cryptoMap[id];
    if (!geckoId) return null;

    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${geckoId}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_high_low_24h=true`,
      { cache: "no-store" }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const cryptoData = data[geckoId];

    if (!cryptoData) return null;

    const priceUSD = cryptoData.usd || 0;
    const priceTZS = priceUSD * TZS_RATE;
    const change24h = cryptoData.usd_24h_change || 0;
    const high24h = cryptoData.usd_24h_high || priceUSD;
    const low24h = cryptoData.usd_24h_low || priceUSD;
    const marketCap = cryptoData.usd_market_cap || 0;
    const volume24h = cryptoData.usd_24h_vol || 0;

    return {
      id,
      symbol: id === "pi-network" ? "π" : id.toUpperCase().slice(0, 3),
      name: cryptoNames[id] || id,
      priceUSD,
      priceTZS,
      change24h,
      high24h,
      low24h,
      marketCap,
      volume24h,
    };
  } catch (error) {
    console.log("[v0] Error fetching single crypto price:", error);
    return null;
  }
}
