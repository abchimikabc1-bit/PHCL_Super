'use client';

import { useEffect, useState } from 'react';

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Hide splash screen immediately after 100ms
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100">
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-2xl mx-auto mb-4">
          <div className="text-3xl font-bold text-white">π</div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">PHCL Super</h1>
      </div>
    </div>
  );
}

export default SplashScreen;
