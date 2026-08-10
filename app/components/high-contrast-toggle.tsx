// app/components/high-contrast-toggle.tsx
import React, { useEffect, useState } from 'react';

/**
 * A tiny toggle that switches between light and dark (high‑contrast) themes.
 * The implementation stores the preference in localStorage and toggles a
 * `high‑contrast` class on the document root. The CSS for the class is defined
 * elsewhere (e.g., in a global stylesheet) to provide the premium dark‑mode
 * experience required by the project.
 */
export default function HighContrastToggle() {
  const [enabled, setEnabled] = useState<boolean>(false);

  // Initialise from localStorage / system preference on first render.
  useEffect(() => {
    const stored = localStorage.getItem('highContrast');
    const initial = stored ? stored === 'true' : false;
    setEnabled(initial);
    if (initial) {
      document.documentElement.classList.add('high-contrast');
    }
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    if (next) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    localStorage.setItem('highContrast', String(next));
  };

  return (
    <button
      onClick={toggle}
      className="rounded px-2 py-1 text-xs text-amber-100 hover:bg-amber-200/10"
      aria-label="Toggle high contrast mode"
    >
      {enabled ? 'HC ON' : 'HC OFF'}
    </button>
  );
}
