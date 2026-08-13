'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.push('/welcome');
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-950 px-6 text-white">
      <div className="absolute inset-0">
        <div className="absolute -left-16 top-16 h-40 w-40 rounded-full bg-purple-400/20 blur-3xl animate-pulse" />
        <div className="absolute right-0 top-1/4 h-64 w-64 rounded-full bg-fuchsia-300/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-indigo-300/20 blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-white/10 text-6xl font-black shadow-2xl ring-1 ring-white/20 animate-bounce">
          π
        </div>

        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.4em] text-yellow-200">
          Karibu • Welcome
        </p>
        <h1 className="text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
          WELCOME <span className="bg-gradient-to-r from-yellow-200 via-white to-fuchsia-200 bg-clip-text text-transparent">PHCL</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base text-purple-100 sm:text-lg">
          Crypto trading, wallet management, and marketplace services in one place.
          <br />
          Biashara ya crypto, wallet, na marketplace sehemu moja.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/welcome"
            className="rounded-full bg-white px-7 py-3 font-semibold text-purple-800 shadow-lg transition hover:bg-yellow-100"
          >
            Enter App
          </Link>
          <Link
            href="/"
            className="rounded-full border border-white/30 px-7 py-3 font-semibold text-white transition hover:bg-white/10"
          >
            Open Current Home
          </Link>
        </div>

        <div className="mt-8 flex items-center gap-2 text-sm text-purple-100">
          <span className="h-2 w-2 rounded-full bg-yellow-200 animate-pulse" />
          <span className="h-2 w-2 rounded-full bg-yellow-200 animate-pulse [animation-delay:200ms]" />
          <span className="h-2 w-2 rounded-full bg-yellow-200 animate-pulse [animation-delay:400ms]" />
          <span className="ml-2">Redirecting to welcome page in 5 seconds...</span>
        </div>
      </div>
    </main>
  );
}
