'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface SlotsProps {
  darkMode: boolean;
}

export function Slots({ darkMode }: SlotsProps) {
  const symbols = ['🍎', '🍊', '🍋', '🍒', '💎', '🌟'];
  const [reels, setReels] = useState(['🍎', '🍎', '🍎']);
  const [balance, setBalance] = useState(1000);
  const [message, setMessage] = useState('');
  const [spinning, setSpinning] = useState(false);

  const spin = () => {
    if (balance < 10) {
      setMessage('Not enough balance!');
      return;
    }
    setSpinning(true);
    setBalance(prev => prev - 10);
    
    setTimeout(() => {
      const newReels = [symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)]];
      setReels(newReels);
      
      if (newReels[0] === newReels[1] && newReels[1] === newReels[2]) {
        setBalance(prev => prev + 100);
        setMessage('JACKPOT!!! 🎉');
      } else if (newReels[0] === newReels[1] || newReels[1] === newReels[2]) {
        setBalance(prev => prev + 30);
        setMessage('Two match - Small win!');
      } else {
        setMessage('Try again!');
      }
      setSpinning(false);
    }, 1000);
  };

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-pink-50'} rounded-lg p-8`}>
      <h2 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-pink-900'}`}>Slots Game</h2>
      <div className="flex justify-center gap-4 mb-6">
        {reels.map((reel, i) => (
          <div key={i} className={`p-6 rounded-lg border-4 text-5xl text-center ${darkMode ? 'bg-gray-700 border-pink-500' : 'bg-white border-pink-400'} w-24 h-24 flex items-center justify-center`}>
            {reel}
          </div>
        ))}
      </div>
      <div className={`text-center mb-6 p-4 rounded ${darkMode ? 'bg-gray-700' : 'bg-pink-100'}`}>
        <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-pink-900'}`}>Balance: {balance}</p>
        <p className={`text-sm ${message.includes('JACKPOT') ? 'text-green-500' : 'text-gray-600'}`}>{message}</p>
      </div>
      <button onClick={spin} disabled={spinning} className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700 disabled:opacity-50 text-white font-bold rounded-lg transition-all active:scale-95">
        {spinning ? 'Spinning...' : 'Spin (10 pts)'}
      </button>
    </div>
  );
}
