'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface TradingProps {
  darkMode: boolean;
}

export function Trading({ darkMode }: TradingProps) {
  const initialData = [
    { name: 'Bitcoin', symbol: 'BTC', basePrice: 65420.50, icon: '₿', color: 'from-yellow-400 to-yellow-600' },
    { name: 'Ethereum', symbol: 'ETH', basePrice: 3450.75, icon: 'Ξ', color: 'from-blue-400 to-blue-600' },
    { name: 'Pi Network', symbol: 'PI', basePrice: 24.75, icon: 'Π', color: 'from-purple-400 to-purple-600' },
    { name: 'USDT', symbol: 'USDT', basePrice: 1.00, icon: '₮', color: 'from-green-400 to-green-600' },
  ];

  const [cryptoData, setCryptoData] = useState(initialData.map(c => ({
    ...c,
    price: c.basePrice,
    change: 0,
    trend: 'neutral'
  })));

  const [isUpdating, setIsUpdating] = useState(false);

  const updatePrices = () => {
    setIsUpdating(true);
    setTimeout(() => {
      setCryptoData(prevData => prevData.map(crypto => {
        const randomChange = (Math.random() - 0.5) * 10;
        const newPrice = Math.max(crypto.basePrice * 0.95, crypto.basePrice + (crypto.basePrice * randomChange / 100));
        const change = ((newPrice - crypto.basePrice) / crypto.basePrice) * 100;
        
        return {
          ...crypto,
          price: newPrice,
          change: parseFloat(change.toFixed(2)),
          trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
        };
      }));
      setIsUpdating(false);
    }, 500);
  };

  useEffect(() => {
    updatePrices();
    const interval = setInterval(() => {
      updatePrices();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-blue-50'} rounded-lg p-8`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : ''}`}>Live Trading Dashboard</h2>
        <button
          onClick={updatePrices}
          disabled={isUpdating}
          className={`px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <RefreshCw size={20} className={isUpdating ? 'animate-spin' : ''} />
          Update Rates
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <button className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold shadow-lg rounded-md transition-all">Buy</button>
        <button className="px-4 py-3 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-semibold shadow-lg rounded-md transition-all">Sell</button>
        <button className="px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold shadow-lg rounded-md transition-all">Trade</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cryptoData.map((crypto, i) => (
          <div key={i} className={`border-2 rounded-lg p-6 transition-all ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} ${crypto.trend === 'up' ? 'border-green-500 shadow-lg shadow-green-500/20' : crypto.trend === 'down' ? 'border-red-500 shadow-lg shadow-red-500/20' : ''}`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${crypto.color}`}>
                  <span className="text-2xl">{crypto.icon}</span>
                </div>
                <div>
                  <p className={`font-bold text-lg ${darkMode ? 'text-white' : ''}`}>{crypto.name}</p>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{crypto.symbol}</p>
                </div>
              </div>
              <div className={`flex items-center gap-1 font-bold text-lg ${crypto.trend === 'up' ? 'text-green-500' : crypto.trend === 'down' ? 'text-red-500' : 'text-gray-500'}`}>
                {crypto.trend === 'up' ? <TrendingUp size={24} /> : crypto.trend === 'down' ? <TrendingDown size={24} /> : <span>─</span>}
                <span>{crypto.change > 0 ? '+' : ''}{crypto.change.toFixed(2)}%</span>
              </div>
            </div>
            
            <p className={`text-3xl font-bold mb-4 ${darkMode ? 'text-white' : ''}`}>${crypto.price.toFixed(crypto.symbol === 'USDT' ? 4 : 2)}</p>
            
            <div className={`text-xs mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Base: ${crypto.basePrice.toFixed(2)}
            </div>
            
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold rounded-md transition-all text-sm">Buy</button>
              <button className="flex-1 px-3 py-2 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-bold rounded-md transition-all text-sm">Sell</button>
            </div>
          </div>
        ))}
      </div>

      <div className={`mt-6 p-4 rounded-lg text-sm ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-blue-700'}`}>
        <p>Live prices update automatically every 5 seconds. Click "Update Rates" to refresh immediately.</p>
      </div>
    </div>
  );
}
