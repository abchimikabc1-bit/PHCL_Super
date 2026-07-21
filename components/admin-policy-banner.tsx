'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export function AdminPolicyBanner() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const syncSettings = () => {
      try {
        const stored = localStorage.getItem('phcl_admin_settings');
        if (stored) {
          const settings = JSON.parse(stored);
          setMaintenanceMode(!!settings.maintenanceMode);
        }
      } catch (err) {
        console.error('Error reading admin settings:', err);
      }
    };

    syncSettings();
    window.addEventListener('storage', syncSettings);
    return () => window.removeEventListener('storage', syncSettings);
  }, []);

  if (!isMounted) {
    return <div style={{ display: 'none' }} />;
  }

  if (!maintenanceMode) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-900/90 to-amber-800/90 backdrop-blur-md border-b border-amber-400/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-300 flex-shrink-0" />
            <p className="text-sm font-semibold text-amber-50">
              Maintenance Mode Active
            </p>
          </div>
          <p className="text-xs text-amber-200">
            Commerce operations are temporarily paused. Browsing available only.
          </p>
        </div>
      </div>
    </div>
  );
}
