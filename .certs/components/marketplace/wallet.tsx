'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Send, Copy, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface WalletProps {
  darkMode: boolean;
  balance: number;
  cryptoPrices: {
    btc: number;
    eth: number;
    pi: number;
    usdt: number;
    bnb: number;
    xrp: number;
  };
}

export function Wallet({ darkMode, balance, cryptoPrices }: WalletProps) {
  const [displayBalance, setDisplayBalance] = useState(balance);
  const [selectedCrypto, setSelectedCrypto] = useState('pi');
  const [transactions, setTransactions] = useState([
    { type: 'received', amount: 50, crypto: 'PI', date: '2 hours ago', from: 'User123' },
    { type: 'sent', amount: 25, crypto: 'BTC', date: '5 hours ago', to: 'User456' },
    { type: 'received', amount: 100, crypto: 'ETH', date: '1 day ago', from: 'User789' },
    { type: 'sent', amount: 150, crypto: 'USDT', date: '2 days ago', to: 'Merchant Inc' },
  ]);
  
  const [liveBalances, setLiveBalances] = useState({
    pi: 45.25,
    btc: 0.0245,
    eth: 0.85,
    usdt: 1250.00,
  });

  // Live balance updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveBalances(prev => ({
        pi: prev.pi + (Math.random() - 0.5) * 2,
        btc: prev.btc + (Math.random() - 0.5) * 0.002,
        eth: prev.eth + (Math.random() - 0.5) * 0.05,
        usdt: prev.usdt + (Math.random() - 0.5) * 50,
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const convertToUSD = (amount: number, crypto: string) => {
    const rates: Record<string, number> = {
      pi: cryptoPrices.pi,
      btc: cryptoPrices.btc,
      eth: cryptoPrices.eth,
      usdt: cryptoPrices.usdt,
    };
    return (amount * (rates[crypto] || 0)).toFixed(2);
  };

  const totalUSD = 
    liveBalances.pi * cryptoPrices.pi +
    liveBalances.btc * cryptoPrices.btc +
    liveBalances.eth * cryptoPrices.eth +
    liveBalances.usdt;

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-gradient-to-br from-purple-50 to-blue-50'} rounded-lg p-6`}>
      {/* Main Balance Card */}
      <div className={`bg-gradient-to-br from-purple-600 to-indigo-700 rounded-lg p-8 text-white mb-6 shadow-lg`}>
        <p className="text-sm opacity-90 mb-2">Total Wallet Balance</p>
        <h1 className="text-4xl font-bold mb-2">${totalUSD.toFixed(2)}</h1>
        <p className="text-sm opacity-80">Across all cryptocurrencies</p>
        
        <div className="flex gap-4 mt-4">
          <button 
            onClick={() => {
              const amount = selectedCrypto === 'pi' ? 5 : selectedCrypto === 'btc' ? 0.001 : 0.1;
              setLiveBalances(prev => ({
                ...prev,
                [selectedCrypto]: Math.max(0, prev[selectedCrypto as keyof typeof prev] - amount)
              }));
              setTransactions(prev => [{
                type: 'sent',
                amount,
                crypto: selectedCrypto.toUpperCase(),
                date: 'just now',
                to: 'User' + Math.floor(Math.random() * 9000)
              }, ...prev]);
            }}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-all active:scale-95"
          >
            Send
          </button>
          <button 
            onClick={() => {
              const amount = selectedCrypto === 'pi' ? 10 : selectedCrypto === 'btc' ? 0.005 : 0.25;
              setLiveBalances(prev => ({
                ...prev,
                [selectedCrypto]: prev[selectedCrypto as keyof typeof prev] + amount
              }));
              setTransactions(prev => [{
                type: 'received',
                amount,
                crypto: selectedCrypto.toUpperCase(),
                date: 'just now',
                from: 'User' + Math.floor(Math.random() * 9000)
              }, ...prev]);
            }}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-all active:scale-95"
          >
            Receive
          </button>
          <button 
            onClick={() => {
              const cryptos = ['pi', 'btc', 'eth', 'usdt'];
              const otherCryptos = cryptos.filter(c => c !== selectedCrypto);
              const targetCrypto = otherCryptos[Math.floor(Math.random() * otherCryptos.length)];
              
              const fromAmount = liveBalances[selectedCrypto as keyof typeof liveBalances] * 0.5;
              setLiveBalances(prev => ({
                ...prev,
                [selectedCrypto]: prev[selectedCrypto as keyof typeof prev] - fromAmount,
                [targetCrypto]: prev[targetCrypto as keyof typeof prev] + (fromAmount * 1.05)
              }));
              setTransactions(prev => [{
                type: 'sent',
                amount: fromAmount,
                crypto: selectedCrypto.toUpperCase(),
                date: 'just now',
                to: `Swap to ${targetCrypto.toUpperCase()}`
              }, ...prev]);
            }}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-all active:scale-95"
          >
            Swap
          </button>
        </div>
      </div>

      {/* Crypto Balances */}
      <div className="mb-6">
        <h3 className={`text-lg font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Your Assets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { symbol: 'pi', icon: 'Π', label: 'Pi Network', color: 'from-purple-500 to-purple-600', amount: liveBalances.pi },
            { symbol: 'btc', icon: '₿', label: 'Bitcoin', color: 'from-yellow-500 to-amber-600', amount: liveBalances.btc },
            { symbol: 'eth', icon: 'Ξ', label: 'Ethereum', color: 'from-blue-500 to-blue-600', amount: liveBalances.eth },
            { symbol: 'usdt', icon: '₮', label: 'USDT', color: 'from-green-500 to-emerald-600', amount: liveBalances.usdt },
          ].map((crypto) => (
            <div key={crypto.symbol} className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selectedCrypto === crypto.symbol
                ? darkMode ? 'bg-gray-700 border-blue-500 shadow-lg' : 'bg-white border-blue-500 shadow-lg'
                : darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
            }`} onClick={() => setSelectedCrypto(crypto.symbol)}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${crypto.color}`}>
                    <span className="text-white text-lg font-bold">{crypto.icon}</span>
                  </div>
                  <div>
                    <p className={`font-bold ${darkMode ? 'text-white' : ''}`}>{crypto.label}</p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{crypto.amount.toFixed(4)} {crypto.symbol.toUpperCase()}</p>
                  </div>
                </div>
                <TrendingUp className="text-green-500" size={20} />
              </div>
              <p className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                ≈ ${convertToUSD(crypto.amount, crypto.symbol)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h3 className={`text-lg font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Recent Transactions</h3>
        <div className="space-y-2">
          {transactions.map((tx, i) => (
            <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${
              darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center gap-3 flex-1">
                <div className={`p-2 rounded-full ${
                  tx.type === 'received' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-red-100 text-red-600'
                }`}>
                  {tx.type === 'received' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </div>
                <div className="flex-1">
                  <p className={`font-bold ${darkMode ? 'text-white' : ''}`}>
                    {tx.type === 'received' ? 'Received' : 'Sent'} {tx.crypto}
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {tx.type === 'received' ? `from ${tx.from}` : `to ${tx.to}`} • {tx.date}
                  </p>
                </div>
              </div>
              <p className={`font-bold text-lg ${tx.type === 'received' ? 'text-green-600' : 'text-red-600'}`}>
                {tx.type === 'received' ? '+' : '-'}{tx.amount}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
