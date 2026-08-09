'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function GlobalQuickActions() {
  return (
    <div className="fixed right-2 top-[120px] z-[100000] flex flex-col gap-2 sm:right-3 sm:top-[128px]">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ai-orbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ai-gradient-shift {
          0% { filter: hue-rotate(0deg) saturate(1); }
          50% { filter: hue-rotate(10deg) saturate(1.15); }
          100% { filter: hue-rotate(0deg) saturate(1); }
        }
        @keyframes ai-pulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.18), 0 14px 34px rgba(88, 28, 135, 0.62), 0 0 38px rgba(251, 191, 36, 0.35); }
          50% { box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.32), 0 18px 42px rgba(88, 28, 135, 0.72), 0 0 52px rgba(251, 191, 36, 0.48); }
        }
        @keyframes ai-twinkle {
          0%, 100% { opacity: 0.55; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      ` }} />

      <Link
        href="/chat?voice=1"
        className="group relative inline-flex h-16 w-16 items-center justify-center rounded-full border border-amber-200/70 bg-[radial-gradient(circle_at_30%_28%,#fef3c7_0%,#facc15_12%,#9333ea_48%,#3b0764_100%)] text-white transition duration-300 hover:-translate-y-1 hover:scale-105 sm:h-18 sm:w-18"
        style={{ animation: 'ai-pulse 2.4s ease-in-out infinite, ai-gradient-shift 3.8s ease-in-out infinite' }}
        aria-label="Open AI assistant"
      >
        <span className="pointer-events-none absolute inset-1 rounded-full border border-white/20" />
        <span className="pointer-events-none absolute -inset-1.5 rounded-full border border-amber-200/45 opacity-90 sm:-inset-2" style={{ animation: 'ai-orbit 6.5s linear infinite' }} />
        <span className="pointer-events-none absolute -inset-3 rounded-full border border-violet-200/25 sm:-inset-4" style={{ animation: 'ai-orbit 9s linear infinite reverse' }} />
        <span className="pointer-events-none absolute -top-1 right-1.5 text-[9px] text-amber-100/90 sm:-top-1.5 sm:right-2 sm:text-[10px]" style={{ animation: 'ai-twinkle 1.8s ease-in-out infinite' }}>✦</span>
        <span className="pointer-events-none absolute -bottom-1 left-1.5 text-[9px] text-violet-100/90 sm:-bottom-1.5 sm:left-2 sm:text-[10px]" style={{ animation: 'ai-twinkle 2.1s ease-in-out infinite .2s' }}>✦</span>
        <span className="pointer-events-none absolute right-0.5 top-1.5 text-[8px] text-yellow-100/90 sm:right-0 sm:top-2 sm:text-[9px]" style={{ animation: 'ai-twinkle 1.6s ease-in-out infinite .35s' }}>✧</span>

        <span className="relative flex flex-col items-center leading-none">
          <Sparkles size={16} className="mb-0.5 text-amber-100 drop-shadow-[0_0_10px_rgba(254,243,199,0.9)] sm:size-[18px]" />
          <span className="text-[9px] font-black tracking-[0.14em] text-amber-50 sm:text-[10px]">AI</span>
        </span>
      </Link>
    </div>
  );
}
