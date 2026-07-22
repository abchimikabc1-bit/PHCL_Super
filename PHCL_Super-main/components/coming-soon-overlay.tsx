'use client';

import React, { useEffect, useState } from 'react';

interface ComingSoonOverlayProps {
  isVisible?: boolean;
  showAnimatedLoader?: boolean;
}

export function ComingSoonOverlay({
  isVisible = true,
  showAnimatedLoader = true,
}: ComingSoonOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-900/95 via-blue-900/95 to-slate-900/95 backdrop-blur-sm">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        {/* Logo */}
        <div className="mb-8">
          <div className="inline-block">
            <div className="text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
              PHCL
            </div>
            <div className="text-2xl text-purple-300 font-semibold tracking-wide">Super</div>
          </div>
        </div>

        {/* Main Message */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 animate-fade-in">
          Coming Soon
        </h1>

        <p className="text-lg md:text-xl text-purple-200 mb-8 max-w-md mx-auto animate-fade-in delay-200">
          We&apos;re preparing something amazing for you. Stay tuned!
        </p>

        {/* Animated Loader */}
        {showAnimatedLoader && (
          <div className="mb-12">
            <div className="flex items-center justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full animate-bounce"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Loading Bar */}
        <div className="w-64 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full animate-loading" />
        </div>

        {/* Status Text */}
        <p className="mt-8 text-sm text-purple-300 animate-pulse">
          Loading premium features...
        </p>

        {/* Footer */}
        <div className="mt-16 text-xs text-slate-400">
          <p>Pi Hub Company Limited (PiHCL) 🇹🇿</p>
          <p className="mt-1">© 2026 PHCL Super. All rights reserved.</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes loading {
          0% {
            width: 0%;
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
          }
          50% {
            width: 100%;
            box-shadow: 0 0 20px rgba(236, 72, 153, 0.5);
          }
          100% {
            width: 0%;
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
          opacity: 0;
        }

        .animate-fade-in.delay-200 {
          animation-delay: 0.2s;
        }

        .animate-loading {
          animation: loading 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Simplified loader for transitions
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center gap-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
          style={{
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

// Page transition loader
export function PageLoader() {
  return (
    <div className="fixed inset-0 z-40 bg-white/20 backdrop-blur-sm flex items-center justify-center animate-fade-in">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4 mx-auto" />
        <p className="text-purple-600 font-semibold">Loading...</p>
      </div>
    </div>
  );
}
