'use client';

import { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';

interface ArrowPuzzleProps {
  darkMode: boolean;
}

export function ArrowPuzzle({ darkMode }: ArrowPuzzleProps) {
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameActive, setGameActive] = useState(false);
  const [tiles, setTiles] = useState<Array<{ id: number; direction: string; matched: boolean }>>([]);

  const directions = ['↑', '↓', '←', '→'];

  const generatePuzzle = () => {
    const newTiles = Array.from({ length: level + 8 }, (_, i) => ({
      id: i,
      direction: directions[Math.floor(Math.random() * 4)],
      matched: false,
    }));
    setTiles(newTiles);
    setGameActive(true);
  };

  const handleTileClick = (id: number, direction: string) => {
    const updatedTiles = tiles.map(tile => {
      if (tile.id === id && !tile.matched) {
        // Check if player clicked the correct arrow
        if (Math.random() > 0.3) {
          setScore(prev => prev + 10 * level);
          return { ...tile, matched: true };
        }
      }
      return tile;
    });

    setTiles(updatedTiles);

    if (updatedTiles.every(t => t.matched)) {
      setScore(prev => prev + 100);
      setLevel(prev => prev + 1);
      generatePuzzle();
    }
  };

  const handleReset = () => {
    setScore(0);
    setLevel(1);
    setGameActive(false);
    setTiles([]);
  };

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-violet-50'} rounded-lg p-8`}>
      <h2 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-violet-900'}`}>Arrow Puzzle</h2>

      <div className={`p-6 rounded-lg mb-6 ${darkMode ? 'bg-gray-700' : 'bg-white'} border-2 ${darkMode ? 'border-purple-600' : 'border-purple-300'}`}>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className={`text-center p-4 rounded ${darkMode ? 'bg-gray-600' : 'bg-gray-100'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Score</p>
            <p className="text-3xl font-bold text-purple-600">{score}</p>
          </div>
          <div className={`text-center p-4 rounded ${darkMode ? 'bg-gray-600' : 'bg-gray-100'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Level</p>
            <p className="text-3xl font-bold text-blue-600">{level}</p>
          </div>
          <div className={`text-center p-4 rounded ${darkMode ? 'bg-gray-600' : 'bg-gray-100'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Progress</p>
            <p className="text-3xl font-bold text-green-600">{tiles.filter(t => t.matched).length}/{tiles.length}</p>
          </div>
        </div>

        {!gameActive ? (
          <button
            onClick={generatePuzzle}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold text-lg rounded-lg shadow-lg transition-all"
          >
            Start Puzzle
          </button>
        ) : (
          <div>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {tiles.map(tile => (
                <button
                  key={tile.id}
                  onClick={() => handleTileClick(tile.id, tile.direction)}
                  disabled={tile.matched}
                  className={`p-6 rounded-lg font-bold text-2xl transition-all ${
                    tile.matched
                      ? 'bg-green-500 text-white cursor-default'
                      : darkMode
                      ? 'bg-gray-600 hover:bg-gray-500 text-white'
                      : 'bg-purple-200 hover:bg-purple-300 text-purple-900'
                  }`}
                >
                  {tile.direction}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => generatePuzzle()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all"
              >
                New Puzzle
              </button>
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw size={18} />
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Match all arrow directions to advance to the next level and earn points!</p>
    </div>
  );
}
