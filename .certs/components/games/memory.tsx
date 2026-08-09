'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface MemoryProps {
  darkMode: boolean;
}

export function Memory({ darkMode }: MemoryProps) {
  const [cards, setCards] = useState(Array(12).fill(0).map((_, i) => ({ id: i, revealed: false, matched: false, symbol: '🎮🎲🎯🎪🎨🎭'[i % 6] })));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);

  const flipCard = (index: number) => {
    if (flipped.length === 2 || cards[index].revealed) return;
    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      if (cards[newFlipped[0]].symbol === cards[newFlipped[1]].symbol) {
        setMatches(prev => prev + 1);
        setCards(prev => prev.map((c, i) => i === newFlipped[0] || i === newFlipped[1] ? {...c, matched: true, revealed: true} : c));
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
    }
  };

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-cyan-50'} rounded-lg p-8`}>
      <h2 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-cyan-900'}`}>Memory Game</h2>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {cards.map((card, i) => (
          <button key={i} onClick={() => flipCard(i)} className={`p-4 rounded-lg font-bold text-2xl transition-all active:scale-95 ${cards[i].matched || flipped.includes(i) ? `${darkMode ? 'bg-cyan-600' : 'bg-cyan-400'} text-white` : `${darkMode ? 'bg-gray-700' : 'bg-white'}`} border-2 ${darkMode ? 'border-cyan-500' : 'border-cyan-300'}`}>
            {cards[i].matched || flipped.includes(i) ? card.symbol : '?'}
          </button>
        ))}
      </div>
      <div className={`text-center p-4 rounded ${darkMode ? 'bg-gray-700' : 'bg-cyan-100'}`}>
        <p className="font-bold text-lg">Matches: {matches}/6</p>
        {matches === 6 && <p className="text-green-500 font-bold">You Won!</p>}
      </div>
    </div>
  );
}
