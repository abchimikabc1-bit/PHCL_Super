'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Trophy } from 'lucide-react';

interface ArrowRunnerProps {
  darkMode: boolean;
}

export function ArrowRunner({ darkMode }: ArrowRunnerProps) {
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [playerLane, setPlayerLane] = useState(1);
  const [gameActive, setGameActive] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [highScore, setHighScore] = useState(0);
  const [obstacles, setObstacles] = useState<Array<{ id: number; lane: number; pos: number }>>([]);
  const gameLoopRef = useRef<NodeJS.Timeout>();
  const obstacleIdRef = useRef(0);

  const handleStart = () => {
    setGameActive(true);
    setScore(0);
    setDistance(0);
    setPlayerLane(1);
    setSpeed(5);
    setObstacles([]);
  };

  const handleReset = useCallback(() => {
    setHighScore((prev) => Math.max(prev, score));
    setGameActive(false);
    setScore(0);
    setDistance(0);
    setPlayerLane(1);
    setSpeed(5);
    setObstacles([]);
  }, [score]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameActive) return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPlayerLane(prev => Math.max(0, prev - 1));
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPlayerLane(prev => Math.min(2, prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameActive]);

  useEffect(() => {
    if (!gameActive) return;

    gameLoopRef.current = setInterval(() => {
      setDistance((prevDistance) => {
        const nextDistance = prevDistance + speed;
        setSpeed(Math.min(12, 5 + Math.floor(nextDistance / 500) * 0.5));
        return nextDistance;
      });

      setObstacles(prev => {
        let updated = prev.map(obs => ({ ...obs, pos: obs.pos + speed })).filter(obs => obs.pos < 600);

        // Collision detection
        updated.forEach(obs => {
          if (obs.lane === playerLane && obs.pos > 400 && obs.pos < 450) {
            handleReset();
          }
        });

        // Score points for avoiding obstacles
        updated.forEach(obs => {
          if (obs.pos > 450 && obs.lane === playerLane) {
            setScore(prev => prev + 10);
          }
        });

        // Add new obstacles
        if (Math.random() < 0.03) {
          updated.push({
            id: obstacleIdRef.current++,
            lane: Math.floor(Math.random() * 3),
            pos: 0,
          });
        }

        return updated;
      });
    }, 50);

    return () => clearInterval(gameLoopRef.current);
  }, [gameActive, playerLane, speed, handleReset]);

  const lanes = [0, 1, 2];

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-lime-50'} rounded-lg p-6`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-lime-900'}`}>Arrow Runner</h2>
        <div className="flex gap-4">
          <div className={`px-4 py-2 rounded-lg font-bold text-lg ${darkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white'}`}>
            Score: {score}
          </div>
          <div className={`px-4 py-2 rounded-lg font-bold text-lg flex items-center gap-2 ${darkMode ? 'bg-yellow-600 text-white' : 'bg-yellow-500 text-white'}`}>
            <Trophy size={20} /> High: {highScore}
          </div>
        </div>
      </div>

      <div className={`relative w-full h-96 border-4 rounded-lg overflow-hidden ${darkMode ? 'bg-gray-900 border-lime-600' : 'bg-white border-lime-400'}`}>
        {/* Game Track */}
        <div className="absolute inset-0 flex">
          {lanes.map(lane => (
            <div
              key={lane}
              className={`flex-1 border-r ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}
            />
          ))}
        </div>

        {/* Player */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <div className="relative w-1/3">
            <div
              className="absolute left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg transition-all"
              style={{
                marginLeft: `${(playerLane - 1) * 50}%`,
              }}
            />
          </div>
        </div>

        {/* Obstacles */}
        {obstacles.map(obs => (
          <div
            key={obs.id}
            className="absolute w-1/3 flex justify-center"
            style={{
              top: `${obs.pos}px`,
              left: 0,
              right: 0,
              marginLeft: `${obs.lane * 33.33}%`,
            }}
          >
            <div className="w-11/12 h-8 bg-red-500 rounded-lg shadow-lg" />
          </div>
        ))}

        {!gameActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
            <button
              onClick={handleStart}
              className="px-8 py-4 bg-gradient-to-r from-lime-500 to-green-600 hover:from-lime-600 hover:to-green-700 text-white font-bold text-xl rounded-lg shadow-lg mb-4"
            >
              {score === 0 ? 'Start Race' : 'Game Over - Try Again'}
            </button>
            {highScore > 0 && (
              <p className="text-white font-bold">Distance: {distance}m</p>
            )}
          </div>
        )}
      </div>

      <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-lime-100'}`}>
        <p className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-lime-900'}`}>Controls & Info:</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <div className="flex items-center gap-2">
            <ArrowLeft className={darkMode ? 'text-gray-300' : 'text-lime-700'} size={20} />
            <span className={darkMode ? 'text-gray-300' : 'text-lime-700'}>Left Lane</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowRight className={darkMode ? 'text-gray-300' : 'text-lime-700'} size={20} />
            <span className={darkMode ? 'text-gray-300' : 'text-lime-700'}>Right Lane</span>
          </div>
          <span className={`font-bold ${darkMode ? 'text-gray-300' : 'text-lime-700'}`}>Speed: {speed.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
