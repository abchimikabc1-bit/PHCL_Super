// app/components/admin-banner.tsx
import React from 'react';

/**
 * Simple admin banner displayed at the top of the navigation bar when the user
 * has admin privileges. For now it is a placeholder showing a premium styled
 * banner with a glass‑morphism background.
 */
export default function AdminBanner() {
  return (
    <div className="absolute inset-x-0 top-0 h-6 bg-white/10 backdrop-blur-md text-center text-xs text-amber-300">
      ADMIN MODE
    </div>
  );
}
