// app/components/notifications-dropdown.tsx
import React, { useState } from 'react';

/**
 * Simple placeholder notifications dropdown used in the Navbar.
 * It shows a bell icon; clicking it toggles a small panel with dummy
 * notification items. The UI follows the premium glass‑morphism style
 * used throughout the project.
 */
export default function NotificationsDropdown() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded px-2 py-1 text-xs text-amber-100 hover:bg-amber-200/10"
        aria-label="Toggle notifications"
      >
        🔔
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-64 bg-white/10 backdrop-blur-md border border-amber-200/20 rounded shadow-lg p-2"
          role="menu"
        >
          <p className="text-xs text-amber-100">No new notifications</p>
        </div>
      )}
    </div>
  );
}
