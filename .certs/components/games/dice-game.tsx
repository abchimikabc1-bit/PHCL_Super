'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface DiceGameProps {
  darkMode: boolean;
}

export function DiceGame({ darkMode }: DiceGameProps) {
  const [dice1, setDice1] = useState(1);
  const [dice2, setDice2] = useState(1);
  const [score, setScore] = useState(0);
  const [rolls, setRolls] = useState(0);

  const rollDice = () => {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    setDice1(d1);
    setDice2(d2);
    setScore(prev => prev + d1 + d2);
    setRolls(prev => prev + 1);
  };

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-yellow-50'} rounded-lg p-8`}>
      <h2 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-yellow-900'}`}>Dice Game</h2>
      <div className="flex justify-center gap-8 mb-8">
        <div className={`p-8 rounded-lg border-4 ${darkMode ? 'bg-gray-700 border-yellow-500' : 'bg-white border-yellow-400'}`}>
          <p className="text-6xl text-center">{dice1}</p>
        </div>
        <div className={`p-8 rounded-lg border-4 ${darkMode ? 'bg-gray-700 border-yellow-500' : 'bg-white border-yellow-400'}`}>
          <p className="text-6xl text-center">{dice2}</p>
        </div>
      </div>
      <div className={`text-center mb-6 p-4 rounded ${darkMode ? 'bg-gray-700' : 'bg-yellow-100'}`}>
        <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Total Score: <span className="text-3xl font-bold text-yellow-500">{score}</span></p>
        <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Rolls: {rolls}</p>
      </div>
      <div className="flex gap-4 justify-center">
        <button onClick={rollDice} className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all active:scale-95">
          Roll Dice
        </button>
        <button onClick={() => { setDice1(1); setDice2(1); setScore(0); setRolls(0); }} className="px-8 py-3 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-lg flex items-center gap-2 transition-all">
          <RotateCcw size={20} /> Reset
        </button>
      </div>
    </div>
  );
}
