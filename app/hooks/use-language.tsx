// app/hooks/use-language.tsx
import { useState, useEffect } from 'react';

/**
 * Simple language hook used across the demo app.
 * It stores the selected language in localStorage so the choice persists
 * across page reloads.
 */
export function useLanguage() {
  const [language, setLanguage] = useState<'en' | 'sw'>('en');

  useEffect(() => {
    const stored = localStorage.getItem('lang');
    if (stored === 'sw' || stored === 'en') {
      setLanguage(stored);
    }
  }, []);

  const toggle = () => {
    const newLang = language === 'en' ? 'sw' : 'en';
    setLanguage(newLang);
    localStorage.setItem('lang', newLang);
  };

  return { language, toggle };
}
