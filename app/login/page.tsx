// src/app/login/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { loginWithEmail, registerWithEmail, resetUserPassword, subscribeToAuth } from '@/lib/auth';
import { createUserProfile } from '@/lib/user-profile';
import { useLanguage } from '@/hooks/use-language';

const NAME_REGEX = /^[A-Za-z][A-Za-z\s'-]{1,39}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(?:\+255|0)(?:6|7)\d{8}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,12}$/;
const CUSTOMER_AUTH_GUARD_KEY = 'phcl_customer_auth_guard';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60;

type AuthGuardState = {
  attempts: number;
  lockedUntil: number;
};

function readAuthGuardState(): AuthGuardState {
  if (typeof window === 'undefined') return { attempts: 0, lockedUntil: 0 };
  try {
    const raw = window.localStorage.getItem(CUSTOMER_AUTH_GUARD_KEY);
    if (!raw) return { attempts: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw) as Partial<AuthGuardState>;
    return {
      attempts: Number.isFinite(Number(parsed.attempts)) ? Math.max(0, Number(parsed.attempts)) : 0,
      lockedUntil: Number.isFinite(Number(parsed.lockedUntil)) ? Math.max(0, Number(parsed.lockedUntil)) : 0,
    };
  } catch {
    return { attempts: 0, lockedUntil: 0 };
  }
}

function writeAuthGuardState(state: AuthGuardState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CUSTOMER_AUTH_GUARD_KEY, JSON.stringify(state));
}

function normalizePhone(value: string): string {
  const compact = value.replace(/\s+/g, '');
  if (compact.startsWith('255')) return `+${compact}`;
  return compact;
}

export default function LoginPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const isSw = language === 'sw';

  // Lugha na maneno ya ukurasa
  const copy = {
    title: isSw ? 'Secure Command Hub' : 'Secure Command Hub',
    loginTab: isSw ? 'Ingia (Login)' : 'Sign In',
    registerTab: isSw ? 'Jisajili (Register)' : 'Sign Up',
    firstNameLabel: isSw ? 'Jina la Kwanza' : 'First Name',
    middleNameLabel: isSw ? 'Jina la Kati' : 'Middle Name',
    lastNameLabel: isSw ? 'Jina la Mwisho' : 'Last Name',
    phoneLabel: isSw ? 'Namba ya Simu' : 'Phone Number',
    emailLabel: isSw ? 'Barua Pepe (Email)' : 'Email Address',
    passwordLabel: isSw ? 'Neno la Siri (Password)' : 'Password',
    loginBtn: isSw ? 'Ingia Salama 🔒' : 'Secure Sign In 🔒',
    registerBtn: isSw ? 'Unda Akaunti Salama 👤' : 'Create Secure Account 👤',
    forgotPasswordBtn: isSw ? 'Umesahau neno la siri?' : 'Forgot Password?',
    resetTitle: isSw ? 'Rejesha Neno la Siri' : 'Reset Password',
    resetDesc: isSw ? 'Andika email yako ili utumiwe kiungo cha kurejesha neno la siri.' : 'Enter your email to receive a password reset link.',
    sendResetBtn: isSw ? 'Tuma Kiungo cha Kurejesha' : 'Send Reset Link',
    backToLogin: isSw ? 'Rudi Kwenye Kuingia' : 'Back to Login',
    strengthTitle: isSw ? 'Nguvu ya Neno la Siri (Zito Kabisa):' : 'Password Strength Metrics:',
    lengthCheck: isSw ? 'Herufi 8 hadi 12' : '8 to 12 characters',
    upperCheck: isSw ? 'Herufi kubwa (A-Z)' : 'One uppercase letter (A-Z)',
    lowerCheck: isSw ? 'Herufi ndogo (a-z)' : 'One lowercase letter (a-z)',
    numberCheck: isSw ? 'Namba (0-9)' : 'One number (0-9)',
    specialCheck: isSw ? 'Alama maalum (!@#$%^&*)' : 'One special character (!@#$%^&*)',
    authSuccess: isSw ? 'Umeingia kwa mafanikio makubwa!' : 'Authenticated successfully!',
    regSuccess: isSw ? 'Akaunti na Profile vimeundwa salama!' : 'Account and Profile created successfully!',
    resetSuccess: isSw ? 'Kiungo cha kurejesha neno la siri kimetumwa kwenye barua pepe yako.' : 'Password reset link sent to your email.',
    processing: isSw ? 'Inashughulikia...' : 'Processing...',
    tooManyAttempts: isSw ? 'Majaribio mengi yamefeli! Umefungiwa kwa dakika 15 na kuhamishiwa kurejesha neno la siri.' : 'Too many failed attempts! You are locked for 15 minutes and redirected to password reset.',
  };

  const [isLogin, setIsLogin] = useState(true);
  const [isResetMode, setIsResetMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Siri za kujisajili upande wa mteja
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Uthibitishaji wa Nguvu ya Neno la siri (Password Strength Validator)
  const [strength, setStrength] = useState({
    hasLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false,
  });

  useEffect(() => {
    setStrength({
      hasLength: password.length >= 8 && password.length <= 12,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  }, [password]);

  const isPasswordStrong =
    strength.hasLength &&
    strength.hasUpper &&
    strength.hasLower &&
    strength.hasNumber &&
    strength.hasSpecial;

  // Kufuatilia kama mtumiaji tayari ameshaingia ili kumpeleka dashboard
  useEffect(() => {
    const state = readAuthGuardState();
    setFailedAttempts(state.attempts);
    const initialRemaining = Math.max(0, Math.ceil((state.lockedUntil - Date.now()) / 1000));
    setLockoutRemaining(initialRemaining);

    const timer = window.setInterval(() => {
      const now = Date.now();
      const current = readAuthGuardState();
      const remaining = Math.max(0, Math.ceil((current.lockedUntil - now) / 1000));
      setLockoutRemaining(remaining);
      setFailedAttempts(current.attempts);

      if (remaining === 0 && current.lockedUntil > 0) {
        writeAuthGuardState({ attempts: 0, lockedUntil: 0 });
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      if (user) {
        router.replace('/marketplace');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = normalizePhone(phone.trim());
    const cleanFirst = firstName.trim();
    const cleanMiddle = middleName.trim();
    const cleanLast = lastName.trim();

    if (lockoutRemaining > 0 && isLogin) {
      toast.error(`${copy.tooManyAttempts} (${lockoutRemaining}s)`);
      setIsResetMode(true);
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      toast.error(isSw ? 'Tafadhali weka email sahihi.' : 'Please enter a valid email address.');
      return;
    }

    if (!password) {
      toast.error(isSw ? 'Password inahitajika.' : 'Password is required.');
      return;
    }

    if (!isLogin && !isPasswordStrong) {
      toast.error(isSw ? 'Tafadhali weka neno la siri thabiti linalokidhi vigezo vyote!' : 'Please enter a strong password that meets all requirements!');
      return;
    }

    if (!isLogin) {
      if (!NAME_REGEX.test(cleanFirst) || !NAME_REGEX.test(cleanMiddle) || !NAME_REGEX.test(cleanLast)) {
        toast.error(isSw ? 'Majina matatu lazima yawe sahihi (first, middle, last).' : 'All three names must be valid (first, middle, last).');
        return;
      }
      if (!PHONE_REGEX.test(cleanPhone)) {
        toast.error(isSw ? 'Namba ya simu si sahihi. Tumia +2557XXXXXXXX au 07XXXXXXXX.' : 'Phone number is invalid. Use +2557XXXXXXXX or 07XXXXXXXX.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isLogin) {
        // Kuingia (Sign In)
        await loginWithEmail(cleanEmail, password);
        toast.success(copy.authSuccess);
        writeAuthGuardState({ attempts: 0, lockedUntil: 0 });
        setFailedAttempts(0);
        setLockoutRemaining(0);
        router.push('/marketplace');
      } else {
        // Kujisajili (Register)
        const user = await registerWithEmail(cleanEmail, password);
        
        // Tunatengeneza profile ya mtumiaji kiotomatiki kwenye Firestore
        await createUserProfile(user.uid, cleanEmail, `${cleanFirst} ${cleanMiddle} ${cleanLast}`, cleanPhone);
        
        toast.success(copy.regSuccess);
        router.push('/marketplace');
      }
    } catch (error) {
      if (isLogin) {
        const previous = readAuthGuardState();
        const nextAttempts = previous.attempts + 1;
        const lockUntil = nextAttempts >= MAX_FAILED_ATTEMPTS ? Date.now() + LOCKOUT_SECONDS * 1000 : 0;
        writeAuthGuardState({ attempts: nextAttempts, lockedUntil: lockUntil });
        setFailedAttempts(nextAttempts);
        setLockoutRemaining(Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000)));
        if (lockUntil > 0) {
          toast.error(copy.tooManyAttempts);
          setIsResetMode(true);
        }
      }
      toast.error(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      await resetUserPassword(email.trim());
      toast.success(copy.resetSuccess);
      setIsResetMode(false);
      writeAuthGuardState({ attempts: 0, lockedUntil: 0 });
      setFailedAttempts(0);
      setLockoutRemaining(0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send reset link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[#1c1607] text-white flex items-center justify-center px-4">
      {/* Background Neon Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_35%)]" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl global-glass">
        {/* Logo and Brand */}
        <div className="text-center mb-6">
          <span className="text-3xl">👑</span>
          <h2 className="mt-2 text-2xl font-black text-amber-100 tracking-wide">PHCL Super</h2>
          <p className="text-xs text-slate-400 mt-1">{copy.title}</p>
        </div>

        {isResetMode ? (
          /* PASSWORD RESET FLOW */
          <form onSubmit={handlePasswordReset} className="space-y-4 text-xs">
            <div className="text-center">
              <h3 className="text-sm font-bold text-amber-200">{copy.resetTitle}</h3>
              <p className="mt-1 text-slate-400 leading-relaxed">{copy.resetDesc}</p>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">{copy.emailLabel}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ minHeight: '44px' }}
                className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                placeholder="name@domain.com"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 py-3 text-sm font-bold text-slate-950 hover:bg-amber-300 transition"
            >
              {isSubmitting ? copy.processing : copy.sendResetBtn}
            </button>

            <button
              type="button"
              onClick={() => setIsResetMode(false)}
              className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              &larr; {copy.backToLogin}
            </button>
          </form>
        ) : (
          /* LOGIN & REGISTER FLOW */
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex rounded-xl border border-white/10 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${isLogin ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {copy.loginTab}
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${!isLogin ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {copy.registerTab}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Sehemu za Usajili Pekee (Only for Registration) */}
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">{copy.firstNameLabel}</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      style={{ minHeight: '44px' }}
                      className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                      placeholder="Juma"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">{copy.middleNameLabel}</label>
                    <input
                      type="text"
                      required
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      style={{ minHeight: '44px' }}
                      className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                      placeholder="Rashid"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">{copy.lastNameLabel}</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      style={{ minHeight: '44px' }}
                      className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                      placeholder="Mushi"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">{copy.phoneLabel}</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{ minHeight: '44px' }}
                      className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                      placeholder="+2557XXXXXXXX"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-slate-300 font-bold mb-1">{copy.emailLabel}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ minHeight: '44px' }}
                  className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  placeholder="name@domain.com"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300 font-bold">{copy.passwordLabel}</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setIsResetMode(true)}
                      className="text-[10px] text-amber-300/80 hover:text-amber-200 hover:underline"
                    >
                      {copy.forgotPasswordBtn}
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ minHeight: '44px' }}
                  className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  placeholder="••••••••"
                />
              </div>

              {/* Password Strength Indicators (Only for Registration) */}
              {!isLogin && (
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4 space-y-2">
                  <p className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">{copy.strengthTitle}</p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-medium">
                    <span className={strength.hasLength ? 'text-emerald-400' : 'text-slate-500'}>
                      {strength.hasLength ? '✓' : '✕'} {copy.lengthCheck}
                    </span>
                    <span className={strength.hasUpper ? 'text-emerald-400' : 'text-slate-500'}>
                      {strength.hasUpper ? '✓' : '✕'} {copy.upperCheck}
                    </span>
                    <span className={strength.hasLower ? 'text-emerald-400' : 'text-slate-500'}>
                      {strength.hasLower ? '✓' : '✕'} {copy.lowerCheck}
                    </span>
                    <span className={strength.hasNumber ? 'text-emerald-400' : 'text-slate-500'}>
                      {strength.hasNumber ? '✓' : '✕'} {copy.numberCheck}
                    </span>
                    <span className={`col-span-2 ${strength.hasSpecial ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {strength.hasSpecial ? '✓' : '✕'} {copy.specialCheck}
                    </span>
                  </div>
                </div>
              )}

              {isLogin && failedAttempts > 0 && (
                <p className="text-[11px] text-amber-300">
                  {isSw ? 'Majaribio yaliyoshindikana:' : 'Failed attempts:'} {failedAttempts}/{MAX_FAILED_ATTEMPTS}
                  {lockoutRemaining > 0 ? ` • ${isSw ? 'imefungwa kwa sekunde' : 'locked for'} ${lockoutRemaining}s` : ''}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || (!isLogin && !isPasswordStrong) || (isLogin && lockoutRemaining > 0)}
                className={`w-full rounded-xl py-3 text-sm font-bold transition shadow-lg ${
                  isSubmitting || (!isLogin && !isPasswordStrong) || (isLogin && lockoutRemaining > 0)
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 hover:bg-amber-300'
                }`}
              >
                {isSubmitting ? copy.processing : isLogin ? copy.loginBtn : copy.registerBtn}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
