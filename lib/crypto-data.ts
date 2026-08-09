// Cryptocurrency market data and pricing information
export const cryptoData = {
  pi: {
    name: 'Pi Network',
    symbol: 'PI',
    currentPrice: null, // Pi Network is not yet listed on major exchanges
    description: 'Emerging digital currency and blockchain project',
    supply: 'Circulating',
    marketCap: 'TBA',
    change24h: 'TBA',
    allTimeHigh: 'TBA',
  },
  btc: {
    name: 'Bitcoin',
    symbol: 'BTC',
    currentPrice: 43500,
    description: 'The first and most well-known cryptocurrency',
    supply: '21 million coins maximum',
    marketCap: '$850 billion',
    change24h: '+2.3%',
    allTimeHigh: '$69000',
  },
  eth: {
    name: 'Ethereum',
    symbol: 'ETH',
    currentPrice: 2800,
    description: 'Smart contracts and decentralized applications platform',
    supply: 'Unlimited (proof of stake)',
    marketCap: '$335 billion',
    change24h: '+1.8%',
    allTimeHigh: '$4900',
  },
  usdt: {
    name: 'Tether',
    symbol: 'USDT',
    currentPrice: 1.0,
    description: 'USD-backed stablecoin for stable trading',
    supply: '95 billion coins',
    marketCap: '$95 billion',
    change24h: '0%',
    allTimeHigh: '$1.05',
  },
  sol: {
    name: 'Solana',
    symbol: 'SOL',
    currentPrice: 155,
    description: 'High-speed blockchain for DeFi and NFTs',
    supply: '573 million coins',
    marketCap: '$75 billion',
    change24h: '+4.2%',
    allTimeHigh: '$260',
  },
  ada: {
    name: 'Cardano',
    symbol: 'ADA',
    currentPrice: 0.95,
    description: 'Proof-of-stake blockchain platform',
    supply: '35 billion coins',
    marketCap: '$33 billion',
    change24h: '+1.5%',
    allTimeHigh: '$3.10',
  },
  xrp: {
    name: 'XRP',
    symbol: 'XRP',
    currentPrice: 2.1,
    description: 'Enterprise blockchain for payments',
    supply: '52 billion coins',
    marketCap: '$120 billion',
    change24h: '+3.1%',
    allTimeHigh: '$3.84',
  },
  dot: {
    name: 'Polkadot',
    symbol: 'DOT',
    currentPrice: 8.2,
    description: 'Multi-chain protocol connecting blockchains',
    supply: '1.3 billion coins',
    marketCap: '$11 billion',
    change24h: '+2.0%',
    allTimeHigh: '$55',
  },
  ltc: {
    name: 'Litecoin',
    symbol: 'LTC',
    currentPrice: 185,
    description: 'Fast and efficient peer-to-peer currency',
    supply: '84 million coins maximum',
    marketCap: '$28 billion',
    change24h: '+1.2%',
    allTimeHigh: '$420',
  },
};

export const tradingPairs = [
  { pair: 'BTC/USDT', volume: '$2.8B', change: '+2.3%' },
  { pair: 'ETH/USDT', volume: '$1.2B', change: '+1.8%' },
  { pair: 'SOL/USDT', volume: '$450M', change: '+4.2%' },
  { pair: 'ADA/USDT', volume: '$280M', change: '+1.5%' },
  { pair: 'XRP/USDT', volume: '$320M', change: '+3.1%' },
  { pair: 'DOT/USDT', volume: '$180M', change: '+2.0%' },
];

export function getCryptoPrice(symbol: string): number | null {
  const crypto = Object.values(cryptoData).find(
    (c) => c.symbol === symbol.toUpperCase()
  );
  return crypto?.currentPrice || null;
}

export function formatCryptoCurrency(
  amount: number,
  symbol: string
): string {
  const price = getCryptoPrice(symbol);
  if (!price) return `${amount} ${symbol}`;
  return `${(amount * price).toFixed(2)} USD`;
}

export function getTradingOpportunities() {
  return tradingPairs.map((pair) => ({
    ...pair,
    recommendation: Math.random() > 0.5 ? 'BUY' : 'HOLD',
  }));
}
