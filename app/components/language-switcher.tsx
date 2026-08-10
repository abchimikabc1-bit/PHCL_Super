// app/components/language-switcher.tsx
import React, { useState } from 'react';

export default function LanguageSwitcher() {
  const [lang, setLang] = useState<'en' | 'sw'>('en');
  const toggle = () => setLang(prev => (prev === 'en' ? 'sw' : 'en'));
  return (
    <button
      onClick={toggle}
      className="rounded px-2 py-1 text-xs text-amber-100 hover:bg-amber-200/10"
      aria-label="Toggle language"
    >
      {lang.toUpperCase()}
    </button>
  );
}
