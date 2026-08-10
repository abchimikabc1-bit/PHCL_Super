// src/app/login/page.tsx
'use client';

import Logo from '@/components/logo';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { loginWithEmail, registerWithEmail, resetUserPassword, subscribeToAuth } from '@/lib/auth';
import { createUserProfile } from '@/lib/user-profile';
import { useLanguage } from '@/hooks/use-language';

export default function LoginPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const isSw = language === 'sw';

  // Lugha na maneno ya ukurasa
  const copy = {
    title: isSw ? 'Secure Command Hub' : 'Secure Command Hub',
    loginTab: isSw ? 'Ingia (Login)' : 'Sign In',
    registerTab: isSw ? 'Jisajili (Register)' : 'Sign Up',
    fullNameLabel: isSw ? 'Jina Kamili' : 'Full Name',
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
    lengthCheck: isSw ? 'Herufi 8 au zaidi' : 'At least 8 characters',
    upperCheck: isSw ? 'Herufi kubwa (A-Z)' : 'One uppercase letter (A-Z)',
    lowerCheck: isSw ? 'Herufi ndogo (a-z)' : 'One lowercase letter (a-z)',
    numberCheck: isSw ? 'Namba (0-9)' : 'One number (0-9)',
    specialCheck: isSw ? 'Alama maalum (!@#$%^&*)' : 'One special character (!@#$%^&*)',
    authSuccess: isSw ? 'Umeingia kwa mafanikio makubwa!' : 'Authenticated successfully!',
    regSuccess: isSw ? 'Akaunti na Profile vimeundwa salama!' : 'Account and Profile created successfully!',
    resetSuccess: isSw ? 'Kiungo cha kurejesha neno la siri kimetumwa kwenye barua pepe yako.' : 'Password reset link sent to your email.',
    processing: isSw ? 'Inashughulikia...' : 'Processing...',
    tooManyAttempts: isSw ? 'Majaribio mengi yamefeli! Umefungiwa kuingia kwa muda na kuhamishiwa kwenye kurejesha neno la siri.' : 'Too many failed attempts! You have been locked out temporarily and redirected to password reset.',
  };

  const [isLogin, setIsLogin] = useState(true);
  const [isResetMode, setIsResetMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Siri za kujisajili upande wa mteja
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0); // Kikagua majaribio yaliyofeli

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
      hasLength: password.length >= 8,
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
    const unsubscribe = subscribeToAuth((user) => {
      if (user) {
        router.replace('/admin/dashboard');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    if (!isLogin && !isPasswordStrong) {
      toast.error(isSw ? 'Tafadhali weka neno la siri thabiti linalokidhi vigezo vyote!' : 'Please enter a strong password that meets all requirements!');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isLogin) {
        // Kuingia (Sign In)
        await loginWithEmail(email.trim(), password);
        toast.success(copy.authSuccess);
        setFailedAttempts(0); // Tunasafisha hesabu ya kufeli akifanikiwa kuingia
        router.push('/admin/dashboard');
      } else {
        // Kujisajili (Register)
        const user = await registerWithEmail(email.trim(), password);
        
        // Tunatengeneza profile ya mtumiaji kiotomatiki kwenye Firestore
        await createUserProfile(user.uid, email.trim(), fullName.trim(), phone.trim());
        
        toast.success(copy.regSuccess);
        router.push('/admin/dashboard');
      }
    } catch (error) {
      if (isLogin) {
        // Kila anapokosea tunaongeza hesabu ya failedAttempts
        setFailedAttempts((prev) => {
          const next = prev + 1;
          if (next >= 3) {
            toast.error(copy.tooManyAttempts);
            setIsResetMode(true); // Tunamhamishia kwenye kurejesha nenosiri kiotomatiki!
          }
          return next;
        });
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
      setFailedAttempts(0); // Tunasafisha mambo baada ya kuanzisha mchakato wa kurejesha nenosiri
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
        {/* Logo and Brand - Tumepachika nembo yetu ya kweli hapa! */}
<div className="flex flex-col items-center justify-center text-center mb-6">
  <Logo width={60} height={60} showText={true} />
  <p className="text-xs text-slate-400 mt-2">{copy.title}</p>
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
                    <label className="block text-slate-300 font-bold mb-1">{copy.fullNameLabel}</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={{ minHeight: '44px' }}
                      className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                      placeholder="Juma Rashid"
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
                      placeholder="0754 000 000"
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

              <button
                type="submit"
                disabled={isSubmitting || (!isLogin && !isPasswordStrong)}
                className={`w-full rounded-xl py-3 text-sm font-bold transition shadow-lg ${
                  isSubmitting || (!isLogin && !isPasswordStrong)
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
