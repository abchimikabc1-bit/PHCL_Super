import React from 'react';

export const CRYPTO_COLORS = {
  'pi': '#9D4EDD',           // Purple
  'btc': '#F7931A',          // Orange
  'eth': '#627EEA',          // Blue
  'usdt': '#26A17B',         // Green
  'bnb': '#F3BA2F',          // Yellow
  'xrp': '#23292F',          // Dark Blue
  'ada': '#0033AD',          // Deep Blue
  'sol': '#9945FF',          // Violet
  'doge': '#BA9F33',         // Gold
  'ltc': '#345D9D',          // Steel Blue
  'dot': '#E6007A',          // Pink
};

interface PriceBarData {
  id: string;
  symbol: string;
  priceUSD: number;
  change24h: number;
  color: string;
}

interface PriceBarsProps {
  data: PriceBarData[];
  language: string;
}

export function PriceBars({ data, language }: PriceBarsProps) {
  // Find max price for scaling
  const maxPrice = Math.max(...data.map(d => d.priceUSD));
  const minHeight = 30; // Minimum bar height in pixels
  const maxHeight = 400; // Maximum bar height in pixels

  return (
    <div className="w-full overflow-x-auto pb-8">
      <div className="flex items-end justify-center gap-6 min-w-max px-8 py-8 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg">
        {data.map((crypto) => {
          // Calculate bar height proportional to price
          const barHeight = minHeight + ((crypto.priceUSD / maxPrice) * (maxHeight - minHeight));
          const isPositive = crypto.change24h >= 0;
          
          return (
            <div key={crypto.id} className="flex flex-col items-center gap-3">
              {/* Price Value Display */}
              <div className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap ${
                isPositive ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
              }`}>
                ${crypto.priceUSD.toFixed(2)}
              </div>

              {/* Vertical Bar */}
              <div
                className="rounded-t-lg shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-y-110 relative group"
                style={{
                  height: `${barHeight}px`,
                  width: '48px',
                  backgroundColor: crypto.color,
                  opacity: 0.9,
                  cursor: 'pointer',
                }}
              >
                {/* Hover Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 py-2 rounded text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div>{crypto.symbol.toUpperCase()}</div>
                  <div className="text-xs text-gray-300 font-normal">{language === 'en' ? 'Price: $' : 'Bei: $'}{crypto.priceUSD.toFixed(4)}</div>
                </div>
              </div>

              {/* Symbol & Change */}
              <div className="text-center">
                <div className="text-sm font-bold text-gray-900">
                  {crypto.symbol.toUpperCase()}
                </div>
                <div className={`text-xs font-semibold flex items-center justify-center gap-1 ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isPositive ? '▲' : '▼'} {Math.abs(crypto.change24h).toFixed(2)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
