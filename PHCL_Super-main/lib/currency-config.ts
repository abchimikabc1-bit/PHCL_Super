"use client";

export type Currency = "usd" | "tzs" | "ntzs" | "pi" | "btc" | "eth" | "bnb" | "xrp" | "ada" | "sol" | "doge" | "ltc" | "polkadot" | "usdt";

export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  price: number;
  priceUSD: number;
  priceTZS: number;
  change24h: number;
  high24h: number;
  low24h: number;
  icon: string;
  color: string;
}

export const CURRENCY_CONFIG: Record<
  Currency,
  {
    symbol: string;
    code: string;
    textColor: string;
    bgColor: string;
    chartColor: string;
  }
> = {
  usd: {
    symbol: "$",
    code: "USD",
    textColor: "text-black font-bold",
    bgColor: "bg-gray-100",
    chartColor: "#000000",
  },
  tzs: {
    symbol: "TSh ",
    code: "TZS",
    textColor: "text-black font-bold",
    bgColor: "bg-black",
    chartColor: "#000000",
  },
  ntzs: {
    symbol: "nTSh ",
    code: "nTZS",
    textColor: "text-cyan-700 font-bold",
    bgColor: "bg-cyan-100",
    chartColor: "#0891b2",
  },
  pi: {
    symbol: "Π ",
    code: "PI",
    textColor: "text-purple-600 font-bold",
    bgColor: "bg-purple-100",
    chartColor: "#9333ea",
  },
  btc: {
    symbol: "₿",
    code: "BTC",
    textColor: "text-yellow-600 font-bold",
    bgColor: "bg-yellow-100",
    chartColor: "#fbbf24",
  },
  eth: {
    symbol: "Ξ",
    code: "ETH",
    textColor: "text-blue-600 font-bold",
    bgColor: "bg-blue-100",
    chartColor: "#3b82f6",
  },
  bnb: {
    symbol: "⬡",
    code: "BNB",
    textColor: "text-yellow-600 font-bold",
    bgColor: "bg-yellow-100",
    chartColor: "#f59e0b",
  },
  xrp: {
    symbol: "✕",
    code: "XRP",
    textColor: "text-blue-500 font-bold",
    bgColor: "bg-blue-50",
    chartColor: "#0ea5e9",
  },
  ada: {
    symbol: "₳",
    code: "ADA",
    textColor: "text-indigo-600 font-bold",
    bgColor: "bg-indigo-100",
    chartColor: "#6366f1",
  },
  sol: {
    symbol: "◎",
    code: "SOL",
    textColor: "text-pink-600 font-bold",
    bgColor: "bg-pink-100",
    chartColor: "#ec4899",
  },
  doge: {
    symbol: "Ð",
    code: "DOGE",
    textColor: "text-yellow-700 font-bold",
    bgColor: "bg-yellow-50",
    chartColor: "#b45309",
  },
  ltc: {
    symbol: "Ł",
    code: "LTC",
    textColor: "text-gray-600 font-bold",
    bgColor: "bg-gray-200",
    chartColor: "#4b5563",
  },
  polkadot: {
    symbol: "●",
    code: "DOT",
    textColor: "text-pink-500 font-bold",
    bgColor: "bg-pink-50",
    chartColor: "#f472b6",
  },
  usdt: {
    symbol: "₮",
    code: "USDT",
    textColor: "text-green-600 font-bold",
    bgColor: "bg-green-100",
    chartColor: "#22c55e",
  },
} as const;

export const LIVE_CRYPTOS: CryptoPrice[] = [
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    price: 65420.50,
    priceUSD: 65420.50,
    priceTZS: 173364825,
    change24h: 2.8,
    high24h: 66100,
    low24h: 64500,
    icon: "₿",
    color: "#fbbf24",
  },
  {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    price: 3450.75,
    priceUSD: 3450.75,
    priceTZS: 9144488,
    change24h: 3.2,
    high24h: 3520,
    low24h: 3350,
    icon: "Ξ",
    color: "#3b82f6",
  },
  {
    id: "tether",
    symbol: "USDT",
    name: "Tether (USDT)",
    price: 1.0,
    priceUSD: 1.0,
    priceTZS: 2621.5,
    change24h: 0.05,
    high24h: 1.01,
    low24h: 0.99,
    icon: "₮",
    color: "#22c55e",
  },
  {
    id: "pi-network",
    symbol: "PI",
    name: "Pi Network",
    price: 314159,
    priceUSD: 314159,
    priceTZS: 823567818.5,
    change24h: 4.5,
    high24h: 25.50,
    low24h: 23.80,
    icon: "Π",
    color: "#9333ea",
  },
  {
    id: "binance-coin",
    symbol: "BNB",
    name: "Binance Coin",
    price: 625.45,
    priceUSD: 625.45,
    priceTZS: 1657443.75,
    change24h: 2.3,
    high24h: 640,
    low24h: 610,
    icon: "⬡",
    color: "#f59e0b",
  },
  {
    id: "ripple",
    symbol: "XRP",
    name: "XRP",
    price: 2.48,
    priceUSD: 2.48,
    priceTZS: 6572,
    change24h: 1.5,
    high24h: 2.55,
    low24h: 2.40,
    icon: "✕",
    color: "#0ea5e9",
  },
  {
    id: "cardano",
    symbol: "ADA",
    name: "Cardano",
    price: 0.98,
    priceUSD: 0.98,
    priceTZS: 2597,
    change24h: 4.2,
    high24h: 1.02,
    low24h: 0.94,
    icon: "₳",
    color: "#6366f1",
  },
  {
    id: "solana",
    symbol: "SOL",
    name: "Solana",
    price: 198.75,
    priceUSD: 198.75,
    priceTZS: 526687.5,
    change24h: 3.8,
    high24h: 205,
    low24h: 190,
    icon: "◎",
    color: "#ec4899",
  },
];

export function getCurrencyDisplay(amount: number, currency: Currency): string {
  const config = CURRENCY_CONFIG[currency];
  return `${config.symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  
  // Convert to USD first
  const conversionRates: Record<Currency, number> = {
    usd: 1,
    tzs: 1 / 2621.5,
    ntzs: 1 / 2621.5,
    pi: 314159,
    btc: 65420.50,
    eth: 3450.75,
    bnb: 625.45,
    xrp: 2.48,
    ada: 0.98,
    sol: 198.75,
    doge: 0.32,
    ltc: 185.50,
    polkadot: 8.45,
    usdt: 1,
  };
  
  const amountInUSD = amount * conversionRates[from];
  return amountInUSD / conversionRates[to];
}
