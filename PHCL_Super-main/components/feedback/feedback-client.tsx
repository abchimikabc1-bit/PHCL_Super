'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Star, Send, Sparkles, ShieldCheck } from 'lucide-react';
import { getRegistrations, type CustomerRegistration } from '@/lib/customer-registration';

type FeedbackCategory = 'Marketplace' | 'Exchange' | 'Wallet' | 'Checkout' | 'General';

type FeedbackEntry = {
  id: string;
  name: string;
  email: string;
  category: FeedbackCategory;
  rating: number;
  message: string;
  createdAt: string;
};

const STORAGE_KEY = 'phcl_feedback_entries';
const SESSION_KEY = 'phcl_feedback_session_v1';

const CATEGORY_OPTIONS: FeedbackCategory[] = ['Marketplace', 'Exchange', 'Wallet', 'Checkout', 'General'];

const defaultEntries: FeedbackEntry[] = [
  {
    id: 'seed-1',
    name: 'Amina K.',
    email: 'amina@example.com',
    category: 'Marketplace',
    rating: 5,
    message: 'Marketplace navigation ni ya haraka na bidhaa zinaonekana vizuri kwenye simu.',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'seed-2',
    name: 'Joseph M.',
    email: 'joseph@example.com',
    category: 'Exchange',
    rating: 5,
    message: 'Live exchange and GCV details zinasaidia sana kuamua haraka.',
    createdAt: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
  },
  {
    id: 'seed-3',
    name: 'Neema T.',
    email: 'neema@example.com',
    category: 'Wallet',
    rating: 4,
    message: 'Wallet report ni clear, na support links ziko wazi.',
    createdAt: new Date(Date.now() - 1000 * 60 * 260).toISOString(),
  },
];

function formatTimeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.max(1, Math.floor(diff / (1000 * 60)));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function FeedbackClient() {
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState<FeedbackEntry[]>(defaultEntries);
  const [registrations, setRegistrations] = useState<CustomerRegistration[]>([]);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [sessionEmail, setSessionEmail] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [sessionPhone, setSessionPhone] = useState('');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('Marketplace');
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const existingRegistrations = getRegistrations();
    setRegistrations(existingRegistrations);

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FeedbackEntry[];
        if (Array.isArray(parsed) && parsed.length) {
          setEntries(parsed);
        }
      }

      const sessionRaw = window.localStorage.getItem(SESSION_KEY);
      if (sessionRaw) {
        const parsedSession = JSON.parse(sessionRaw) as { email?: string; fullName?: string; phone?: string };
        if (parsedSession?.email) {
          setIsSignedIn(true);
          setSessionEmail(parsedSession.email);
          setSessionName(parsedSession.fullName || 'Verified customer');
          setSessionPhone(parsedSession.phone || '');
        }
      }
    } catch {
      // fall back to defaults
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, mounted]);

  const stats = useMemo(() => {
    const average = entries.length
      ? (entries.reduce((sum, entry) => sum + entry.rating, 0) / entries.length).toFixed(1)
      : '0.0';
    return {
      count: entries.length,
      average,
    };
  }, [entries]);

  const handleSignIn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSessionError(null);

    const emailValue = sessionEmail.trim().toLowerCase();
    const phoneValue = sessionPhone.trim();
    const nameValue = sessionName.trim();

    if (!emailValue || !phoneValue || !nameValue) {
      setSessionError('Please enter your registered name, email, and phone number.');
      return;
    }

    const match = registrations.find((entry) => {
      const sameEmail = entry.email.trim().toLowerCase() === emailValue;
      const samePhone = entry.phone.replace(/\s+/g, '') === phoneValue.replace(/\s+/g, '');
      const sameName = entry.fullName.trim().toLowerCase() === nameValue.toLowerCase();
      return sameEmail && samePhone && sameName;
    });

    if (!match) {
      setSessionError('No matching customer registration found. Please sign up first or check your details.');
      return;
    }

    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        email: match.email,
        fullName: match.fullName,
        phone: match.phone,
        createdAt: new Date().toISOString(),
      }),
    );
    setIsSignedIn(true);
    setSessionError(null);
  };

  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_KEY);
    }
    setIsSignedIn(false);
    setSessionEmail('');
    setSessionName('');
    setSessionPhone('');
    setSessionError(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isSignedIn) {
      setSessionError('Please sign in with a registered customer profile before submitting feedback.');
      return;
    }

    const cleanedName = name.trim();
    const cleanedMessage = message.trim();

    if (!cleanedName || !cleanedMessage) return;

    const nextEntry: FeedbackEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: cleanedName,
      email: email.trim(),
      category,
      rating,
      message: cleanedMessage,
      createdAt: new Date().toISOString(),
    };

    setEntries((current) => [nextEntry, ...current]);
    setSubmittedAt(nextEntry.createdAt);
    setName('');
    setEmail('');
    setCategory('Marketplace');
    setRating(5);
    setMessage('');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-[#101827] to-[#120f06] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
            <ArrowLeft size={16} />
            Home
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-100">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Feedback Board
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.3)] backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-200">
                <MessageCircle size={22} />
              </div>
              <div>
                <h1 className="text-3xl font-black sm:text-4xl">Share your PHCL Super feedback</h1>
                <p className="mt-1 text-sm text-white/70">Public live page for ratings, comments, and platform suggestions.</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Entries</p>
                <p className="mt-2 text-2xl font-black text-amber-300">{stats.count}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Average</p>
                <p className="mt-2 text-2xl font-black text-amber-300">{stats.average}/5</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Status</p>
                <p className="mt-2 text-sm font-bold text-emerald-300">Live on page</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Privacy</p>
                <p className="mt-2 text-sm font-bold text-white/90">Local device save</p>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-emerald-100">Customer access</p>
                  <p className="text-xs text-emerald-50/80">Sign in with your registered details to leave feedback.</p>
                </div>
                {isSignedIn && (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white transition hover:bg-white/10"
                  >
                    Sign out
                  </button>
                )}
              </div>

              {!isSignedIn ? (
                <form onSubmit={handleSignIn} className="mt-4 grid gap-3 sm:grid-cols-3">
                  <input
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="Registered full name"
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-white/30"
                  />
                  <input
                    value={sessionEmail}
                    onChange={(e) => setSessionEmail(e.target.value)}
                    type="email"
                    placeholder="Registered email"
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-white/30"
                  />
                  <div className="flex gap-2">
                    <input
                      value={sessionPhone}
                      onChange={(e) => setSessionPhone(e.target.value)}
                      placeholder="Registered phone"
                      className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-white/30"
                    />
                    <button
                      type="submit"
                      className="rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-emerald-200"
                    >
                      Enter
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-emerald-50">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold">Signed in as {sessionName}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{sessionEmail}</span>
                </div>
              )}

              {sessionError && <p className="mt-3 text-sm text-red-200">{sessionError}</p>}
              {!isSignedIn && (
                <p className="mt-3 text-xs text-emerald-50/70">
                  If you do not have an account yet, please create one on the{' '}
                  <Link href="/signup" className="font-semibold text-emerald-200 underline">
                    signup page
                  </Link>{' '}
                  first.
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-white/80">Your name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-emerald-300/40"
                    required
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-white/80">Email</span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="Optional email"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-emerald-300/40"
                  />
                </label>
              </div>

              {!isSignedIn && (
                <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                  You must sign in with a registered customer profile before submitting feedback.
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-white/80">Category</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-emerald-300/40"
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-white/80">Rating: {rating}/5</span>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </label>
              </div>

              <label className="space-y-2 block">
                <span className="text-sm font-semibold text-white/80">Your feedback</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what worked well and what we should improve"
                  className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-emerald-300/40"
                  required
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={!isSignedIn}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={16} />
                  Submit feedback
                </button>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  <Sparkles size={16} />
                  Visit marketplace
                </Link>
              </div>

              {submittedAt && (
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  Thanks — your feedback is now live on this page.
                </div>
              )}
            </form>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-md">
              <h2 className="text-xl font-bold text-white">Recent live feedback</h2>
              <div className="mt-5 space-y-4">
                {entries.slice(0, 4).map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-amber-300">{entry.name}</p>
                      <div className="flex items-center gap-1 text-amber-300 text-xs font-semibold">
                        <Star size={12} fill="currentColor" />
                        {entry.rating}/5
                      </div>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/40">{entry.category}</p>
                    <p className="mt-3 text-sm text-white/80">{entry.message}</p>
                    <p className="mt-3 text-xs text-white/40">{formatTimeAgo(entry.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-emerald-400/10 to-transparent p-6 backdrop-blur-md">
              <h2 className="text-xl font-bold text-white">Why this page exists</h2>
              <ul className="mt-4 space-y-3 text-sm text-white/75">
                <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 text-emerald-300" size={16} />Public feedback is visible immediately after submission.</li>
                <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 text-emerald-300" size={16} />The page saves entries locally on the device for QA and demos.</li>
                <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 text-emerald-300" size={16} />You can later connect it to a real backend or database without changing the UI.</li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}