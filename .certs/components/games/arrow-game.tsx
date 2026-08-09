'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';

interface ArrowGameProps {
  darkMode: boolean;
}

export function ArrowGame({ darkMode }: ArrowGameProps) {
  const [score, setScore] = useState(0);
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 80 });
  const [obstacles, setObstacles] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [gameActive, setGameActive] = useState(false);
  const [level, setLevel] = useState(1);
  const obstacleIdRef = useRef(0);
  const gameLoopRef = useRef<NodeJS.Timeout>();

  const handleStart = () => {
    setGameActive(true);
    setScore(0);
    setPlayerPos({ x: 50, y: 80 });
    setObstacles([]);
    setLevel(1);
  };

  const handleReset = () => {
    setGameActive(false);
    setScore(0);
    setPlayerPos({ x: 50, y: 80 });
    setObstacles([]);
    setLevel(1);
  };

  useEffect(() => {
    if (!gameActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
      }
      
      setPlayerPos(prev => {
        let newX = prev.x;
        if (e.key === 'ArrowLeft') newX = Math.max(5, prev.x - 8);
        if (e.key === 'ArrowRight') newX = Math.min(95, prev.x + 8);
        return { ...prev, x: newX };
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameActive]);

  useEffect(() => {
    if (!gameActive) return;

    gameLoopRef.current = setInterval(() => {
      setObstacles(prev => {
        const updated = prev.map(obs => ({ ...obs, y: obs.y + 3 })).filter(obs => obs.y < 100);

        // Collision detection
        updated.forEach(obs => {
          if (Math.abs(obs.x - playerPos.x) < 10 && Math.abs(obs.y - playerPos.y) < 10) {
            setGameActive(false);
          }
        });

        // Add new obstacles
        if (Math.random() < 0.02 + (level * 0.005)) {
          updated.push({
            id: obstacleIdRef.current++,
            x: Math.random() * 90 + 5,
            y: 0,
          });
        }

        setScore(prev => prev + (updated.length > 0 ? 1 : 0));
        if (score > 0 && score % 100 === 0) setLevel(prev => prev + 1);

        return updated;
      });
    }, 50);

    return () => clearInterval(gameLoopRef.current);
  }, [gameActive, playerPos, level, score]);

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-indigo-50'} rounded-lg p-6`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-indigo-900'}`}>Arrow Navigation Game</h2>
        <div className="flex gap-4">
          <div className={`px-4 py-2 rounded-lg font-bold text-lg ${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'}`}>
            Score: {score}
          </div>
          <div className={`px-4 py-2 rounded-lg font-bold text-lg ${darkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'}`}>
            Level: {level}
          </div>
        </div>
      </div>

      <div className={`relative w-full h-96 border-4 rounded-lg overflow-hidden ${darkMode ? 'bg-gray-900 border-indigo-600' : 'bg-white border-indigo-400'}`}>
        {/* Player */}
        <div
          className="absolute bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full transition-all"
          style={{
            width: '40px',
            height: '40px',
            left: `${playerPos.x}%`,
            top: `${playerPos.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Obstacles */}
        {obstacles.map(obs => (
          <div
            key={obs.id}
            className="absolute bg-red-500 rounded"
            style={{
              width: '30px',
              height: '30px',
              left: `${obs.x}%`,
              top: `${obs.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}

        {!gameActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <button
              onClick={handleStart}
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-xl rounded-lg shadow-lg"
            >
              {score === 0 ? 'Start Game' : 'Game Over - Restart'}
            </button>
          </div>
        )}
      </div>

      <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-indigo-100'}`}>
        <p className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-indigo-900'}`}>Controls:</p>
        <div className="flex gap-4 justify-center">
          <div className="flex items-center gap-2">
            <ArrowLeft className={darkMode ? 'text-gray-300' : 'text-indigo-700'} size={20} />
            <span className={darkMode ? 'text-gray-300' : 'text-indigo-700'}>Move Left</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowRight className={darkMode ? 'text-gray-300' : 'text-indigo-700'} size={20} />
            <span className={darkMode ? 'text-gray-300' : 'text-indigo-700'}>Move Right</span>
          </div>
        </div>
      </div>
    </div>
  );
}
