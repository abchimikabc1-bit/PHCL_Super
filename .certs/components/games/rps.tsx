'use client';

import { useState } from 'react';

interface RpsProps {
  darkMode: boolean;
}

export function RockPaperScissors({ darkMode }: RpsProps) {
  const [playerChoice, setPlayerChoice] = useState('');
  const [botChoice, setBotChoice] = useState('');
  const [result, setResult] = useState('');
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const choices = ['rock', 'paper', 'scissors'];

  const play = (choice: string) => {
    const bot = choices[Math.floor(Math.random() * 3)];
    setPlayerChoice(choice);
    setBotChoice(bot);

    if (choice === bot) {
      setResult('Draw!');
    } else if ((choice === 'rock' && bot === 'scissors') || (choice === 'paper' && bot === 'rock') || (choice === 'scissors' && bot === 'paper')) {
      setResult('You win!');
      setPlayerScore(prev => prev + 1);
    } else {
      setResult('Bot wins!');
      setBotScore(prev => prev + 1);
    }
  };

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-green-50'} rounded-lg p-8 max-w-2xl mx-auto`}>
      <h2 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-green-900'}`}>Rock Paper Scissors</h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {['rock', 'paper', 'scissors'].map(choice => (
          <button key={choice} onClick={() => play(choice)} className={`p-4 rounded-lg font-bold text-xl transition-all ${playerChoice === choice ? 'ring-4 ring-yellow-400' : ''} ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-green-100'}`}>
            {choice === 'rock' ? '🪨' : choice === 'paper' ? '📄' : '✂️'}
          </button>
        ))}
      </div>
      {result && (
        <div className={`text-center p-6 rounded mb-6 ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
          <p className={`text-2xl font-bold mb-2 ${result.includes('You win') ? 'text-green-500' : result.includes('Bot') ? 'text-red-500' : 'text-gray-500'}`}>{result}</p>
          <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>You: {playerChoice.toUpperCase()} vs Bot: {botChoice.toUpperCase()}</p>
        </div>
      )}
      <div className={`text-center p-4 rounded ${darkMode ? 'bg-gray-700' : 'bg-green-100'}`}>
        <p className="font-bold text-lg">You: {playerScore} - Bot: {botScore}</p>
      </div>
    </div>
  );
}
