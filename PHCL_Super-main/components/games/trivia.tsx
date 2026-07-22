'use client';

import { useState } from 'react';

interface TriviaProps {
  darkMode: boolean;
}

export function Trivia({ darkMode }: TriviaProps) {
  const questions = [
    { q: 'What year was Bitcoin created?', options: ['2007', '2008', '2009', '2010'], correct: 2 },
    { q: 'Who created Bitcoin?', options: ['Vitalik Buterin', 'Satoshi Nakamoto', 'Charles Hoskinson', 'Ian Grigg'], correct: 1 },
    { q: 'What is the max supply of Bitcoin?', options: ['10M', '21M', '50M', 'Unlimited'], correct: 1 },
  ];
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState(-1);

  const selectAnswer = (idx: number) => {
    setSelected(idx);
    setAnswered(true);
    if (idx === questions[current].correct) setScore(prev => prev + 1);
  };

  const nextQuestion = () => {
    if (current < questions.length - 1) {
      setCurrent(prev => prev + 1);
      setAnswered(false);
      setSelected(-1);
    }
  };

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-purple-50'} rounded-lg p-8 max-w-2xl mx-auto`}>
      <h2 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-purple-900'}`}>Crypto Trivia</h2>
      <p className={`text-lg mb-6 font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{questions[current].q}</p>
      <div className="space-y-3 mb-6">
        {questions[current].options.map((opt, i) => (
          <button key={i} onClick={() => !answered && selectAnswer(i)} disabled={answered} className={`w-full p-4 rounded-lg font-bold text-left transition-all ${selected === i ? (i === questions[current].correct ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : `${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-purple-100'}`}`}>
            {opt}
          </button>
        ))}
      </div>
      <div className={`text-center p-4 rounded mb-6 ${darkMode ? 'bg-gray-700' : 'bg-purple-100'}`}>
        <p className="font-bold">Score: {score}/{questions.length}</p>
      </div>
      {answered && <button onClick={nextQuestion} className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg">{current === questions.length - 1 ? 'Finish' : 'Next'}</button>}
    </div>
  );
}
