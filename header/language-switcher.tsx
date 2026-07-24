'use client';

import { useState } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { LANGUAGE_OPTIONS } from '@/lib/currencies'; // Imebadilishwa hapa!

interface LanguageSwitcherProps {
  darkMode: boolean;
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
}

export function LanguageSwitcher({ darkMode, currentLanguage, onLanguageChange }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const current = LANGUAGE_OPTIONS.find(l => l.code === currentLanguage) || LANGUAGE_OPTIONS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-3 rounded-lg font-bold transition-all shadow-lg ${
          darkMode
            ? 'bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 text-white'
            : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white'
        }`}
      >
        <Globe size={20} />
        <span>{current.flag} {current.name}</span>
        <ChevronDown size={18} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 top-14 w-56 rounded-lg shadow-2xl z-50 grid grid-cols-2 gap-2 p-2 ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}
        >
          {LANGUAGE_OPTIONS.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                onLanguageChange(lang.code);
                setIsOpen(false);
              }}
              className={`px-3 py-2 rounded-md font-semibold text-sm transition-all flex items-center gap-2 ${
                currentLanguage === lang.code
                  ? darkMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
