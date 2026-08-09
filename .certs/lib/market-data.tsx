import { TrendingUp, TrendingDown } from "lucide-react";

export const MARKET_DATA = [
  { symbol: "BTC", name: "Bitcoin", price: 45200, change24h: 2.5, volume: 28500000000, marketCap: 890000000000, high24h: 46800, low24h: 43200 },
  { symbol: "ETH", name: "Ethereum", price: 2850, change24h: -1.2, volume: 14200000000, marketCap: 342000000000, high24h: 2950, low24h: 2750 },
  { symbol: "USDT", name: "Tether", price: 1.0, change24h: 0.01, volume: 50000000000, marketCap: 95000000000, high24h: 1.01, low24h: 0.99 },
  { symbol: "PI", name: "Pi Network", price: 42.5, change24h: 5.8, volume: 125000000, marketCap: 2100000000, high24h: 44.2, low24h: 40.1 },
  { symbol: "XRP", name: "Ripple", price: 2.45, change24h: 3.2, volume: 2500000000, marketCap: 135000000000, high24h: 2.58, low24h: 2.35 },
  { symbol: "ADA", name: "Cardano", price: 0.98, change24h: -2.1, volume: 1200000000, marketCap: 35000000000, high24h: 1.05, low24h: 0.92 },
];

export function PriceChangeIndicator({ change24h }: { change24h: number }) {
  const isPositive = change24h >= 0;
  return (
    <div className={`flex items-center gap-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
      {isPositive ? (
        <TrendingUp className="w-4 h-4" />
      ) : (
        <TrendingDown className="w-4 h-4" />
      )}
      <span className="font-semibold">{Math.abs(change24h)}%</span>
    </div>
  );
}
