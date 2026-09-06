'use client';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import {
  toast,
} from 'sonner';

import {
  loginWithEmail,
  resetUserPassword,
  subscribeToAuth,
} from '@/lib/auth';

import {
  registerCustomer,
} from '@/lib/customer-registration';

import {
  useLanguage,
} from '@/hooks/use-language';

const CUSTOMER_HOME =
  '/marketplace';

export default function LoginPage() {
  const router =
    useRouter();

  const {
    language,
  } =
    useLanguage();

  const isSw =
    language === 'sw';

  const registrationInProgressRef =
    useRef(false);

  const explicitAuthActionRef =
    useRef(false);

  const copy = {
    title:
      'Secure Customer Access',

    loginTab:
      isSw
        ? 'Ingia (Login)'
        : 'Sign In',

    registerTab:
      isSw
        ? 'Jisajili (Register)'
        : 'Sign Up',

    fullNameLabel:
      isSw
        ? 'Jina Kamili'
        : 'Full Name',

    phoneLabel:
      isSw
        ? 'Namba ya Simu'
        : 'Phone Number',

    countryLabel:
      isSw
        ? 'Nchi'
        : 'Country',

    emailLabel:
      isSw
        ? 'Barua Pepe (Email)'
        : 'Email Address',

    passwordLabel:
      isSw
        ? 'Neno la Siri (Password)'
        : 'Password',

    confirmPasswordLabel:
      isSw
        ? 'Thibitisha Neno la Siri'
        : 'Confirm Password',

    showPassword:
      isSw
        ? 'Onyesha nenosiri'
        : 'Show password',

    hidePassword:
      isSw
        ? 'Ficha nenosiri'
        : 'Hide password',

    passwordsMatch:
      isSw
        ? 'Nenosiri zinafanana.'
        : 'Passwords match.',

    passwordsDoNotMatch:
      isSw
        ? 'Nenosiri hazifanani.'
        : 'Passwords do not match.',

    loginBtn:
      isSw
        ? 'Ingia Salama 🔒'
        : 'Secure Sign In 🔒',

    registerBtn:
      isSw
        ? 'Unda Akaunti Salama 👤'
        : 'Create Secure Account 👤',

    forgotPasswordBtn:
      isSw
        ? 'Umesahau neno la siri?'
        : 'Forgot Password?',

    resetTitle:
      isSw
        ? 'Rejesha Neno la Siri'
        : 'Reset Password',

    resetDesc:
      isSw
        ? 'Andika email yako ili utumiwe kiungo cha kurejesha neno la siri.'
        : 'Enter your email to receive a password reset link.',

    sendResetBtn:
      isSw
        ? 'Tuma Kiungo cha Kurejesha'
        : 'Send Reset Link',

    backToLogin:
      isSw
        ? 'Rudi Kwenye Kuingia'
        : 'Back to Login',

    strengthTitle:
      isSw
        ? 'Nguvu ya Neno la Siri:'
        : 'Password Strength:',

    lengthCheck:
      isSw
        ? 'Herufi 8 au zaidi'
        : 'At least 8 characters',

    upperCheck:
      isSw
        ? 'Herufi kubwa (A-Z)'
        : 'One uppercase letter (A-Z)',

    lowerCheck:
      isSw
        ? 'Herufi ndogo (a-z)'
        : 'One lowercase letter (a-z)',

    numberCheck:
      isSw
        ? 'Namba (0-9)'
        : 'One number (0-9)',

    specialCheck:
      isSw
        ? 'Alama maalum (!@#$%^&*)'
        : 'One special character (!@#$%^&*)',

    authSuccess:
      isSw
        ? 'Umeingia kwa mafanikio!'
        : 'Authenticated successfully!',

    resetSuccess:
      isSw
        ? 'Kiungo cha kurejesha neno la siri kimetumwa kwenye barua pepe yako.'
        : 'Password reset link sent to your email.',

    processing:
      isSw
        ? 'Inashughulikia...'
        : 'Processing...',

    tooManyAttempts:
      isSw
        ? 'Majaribio mengi yamefeli. Tumia kurejesha neno la siri.'
        : 'Too many failed attempts. Use password reset.',

    termsLabel:
      isSw
        ? 'Ninakubali Masharti ya Matumizi.'
        : 'I agree to the Terms of Use.',

    privacyLabel:
      isSw
        ? 'Ninakubali Sera ya Faragha.'
        : 'I agree to the Privacy Policy.',
  };

  const [
    isLogin,
    setIsLogin,
  ] =
    useState(true);

  const [
    isResetMode,
    setIsResetMode,
  ] =
    useState(false);

  const [
    email,
    setEmail,
  ] =
    useState('');

  const [
    password,
    setPassword,
  ] =
    useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState('');

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] =
    useState(false);

  const [
    fullName,
    setFullName,
  ] =
    useState('');

  const [
    phone,
    setPhone,
  ] =
    useState('');

  const [
    country,
    setCountry,
  ] =
    useState(
      'Tanzania',
    );

  const [
    agreedToTerms,
    setAgreedToTerms,
  ] =
    useState(false);

  const [
    agreedToPrivacy,
    setAgreedToPrivacy,
  ] =
    useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    failedAttempts,
    setFailedAttempts,
  ] =
    useState(0);

  const [
    strength,
    setStrength,
  ] =
    useState({
      hasLength:
        false,

      hasUpper:
        false,

      hasLower:
        false,

      hasNumber:
        false,

      hasSpecial:
        false,
    });

  useEffect(() => {
    setStrength({
      hasLength:
        password.length >=
        8,

      hasUpper:
        /[A-Z]/.test(
          password,
        ),

      hasLower:
        /[a-z]/.test(
          password,
        ),

      hasNumber:
        /[0-9]/.test(
          password,
        ),

      hasSpecial:
        /[!@#$%^&*(),.?":{}|<>]/.test(
          password,
        ),
    });
  }, [
    password,
  ]);

  const isPasswordStrong =
    strength.hasLength &&
    strength.hasUpper &&
    strength.hasLower &&
    strength.hasNumber &&
    strength.hasSpecial;

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const canSubmitRegistration =
    fullName.trim().length > 0 &&
    phone.trim().length > 0 &&
    country.trim().length > 0 &&
    email.trim().length > 0 &&
    isPasswordStrong &&
    passwordsMatch &&
    agreedToTerms &&
    agreedToPrivacy;

  /**
   * CUSTOMER AUTH OBSERVER
   *
   * Existing authenticated customers may
   * leave the login page automatically.
   *
   * During an explicit login or registration
   * operation, the handler owns navigation.
   * This prevents Firebase onAuthStateChanged
   * from interrupting profile creation.
   */
  useEffect(() => {
    const unsubscribe =
      subscribeToAuth(
        (
          user,
        ) => {
          if (
            !user
          ) {
            return;
          }

          if (
            registrationInProgressRef.current ||
            explicitAuthActionRef.current
          ) {
            return;
          }

          router.replace(
            CUSTOMER_HOME,
          );
        },
      );

    return () =>
      unsubscribe();
  }, [
    router,
  ]);

  const handleSubmit =
    async (
      event:
        React.FormEvent,
    ) => {
      event.preventDefault();

      if (
        isSubmitting
      ) {
        return;
      }

      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      if (
        !normalizedEmail ||
        !password
      ) {
        toast.error(
          isSw
            ? 'Tafadhali jaza barua pepe na neno la siri.'
            : 'Please enter your email and password.',
        );

        return;
      }

      if (
        !isLogin
      ) {
        if (
          !fullName.trim() ||
          !phone.trim() ||
          !country.trim()
        ) {
          toast.error(
            isSw
              ? 'Tafadhali jaza taarifa zote muhimu za usajili.'
              : 'Please complete all required registration information.',
          );

          return;
        }

        if (
          !isPasswordStrong
        ) {
          toast.error(
            isSw
              ? 'Tafadhali weka neno la siri thabiti linalokidhi vigezo vyote.'
              : 'Please enter a strong password that meets all requirements.',
          );

          return;
        }

        if (
          !confirmPassword ||
          password !== confirmPassword
        ) {
          toast.error(
            copy.passwordsDoNotMatch,
          );

          return;
        }

        if (
          !agreedToTerms ||
          !agreedToPrivacy
        ) {
          toast.error(
            isSw
              ? 'Ni lazima ukubali Masharti ya Matumizi na Sera ya Faragha.'
              : 'You must accept the Terms of Use and Privacy Policy.',
          );

          return;
        }
      }

      setIsSubmitting(
        true,
      );

      explicitAuthActionRef.current =
        true;

      try {
        if (
          isLogin
        ) {
          await loginWithEmail(
            normalizedEmail,
            password,
          );

          setFailedAttempts(
            0,
          );

          toast.success(
            copy.authSuccess,
          );

          router.replace(
            CUSTOMER_HOME,
          );

          return;
        }

        registrationInProgressRef.current =
          true;

        const result =
          await registerCustomer({
            fullName:
              fullName.trim(),

            email:
              normalizedEmail,

            phone:
              phone.trim(),

            country:
              country.trim(),

            password,

            tier:
              'regular',

            agreedToTerms,

            agreedToPrivacy,
          });

        if (
          !result.ok
        ) {
          throw new Error(
            result.message,
          );
        }

        toast.success(
          result.message,
        );

        setConfirmPassword(
          '',
        );

        router.replace(
          CUSTOMER_HOME,
        );
      } catch (
        error
      ) {
        if (
          isLogin
        ) {
          setFailedAttempts(
            (
              previous,
            ) => {
              const next =
                previous + 1;

              if (
                next >= 3
              ) {
                toast.error(
                  copy.tooManyAttempts,
                );

                setIsResetMode(
                  true,
                );
              }

              return next;
            },
          );
        }

        toast.error(
          error instanceof Error
            ? error.message
            : isSw
              ? 'Uthibitishaji haukukamilika.'
              : 'Authentication failed.',
        );
      } finally {
        registrationInProgressRef.current =
          false;

        explicitAuthActionRef.current =
          false;

        setIsSubmitting(
          false,
        );
      }
    };

  const handlePasswordReset =
    async (
      event:
        React.FormEvent,
    ) => {
      event.preventDefault();

      if (
        isSubmitting
      ) {
        return;
      }

      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      if (
        !normalizedEmail
      ) {
        toast.error(
          isSw
            ? 'Weka barua pepe yako.'
            : 'Enter your email address.',
        );

        return;
      }

      setIsSubmitting(
        true,
      );

      try {
        await resetUserPassword(
          normalizedEmail,
        );

        toast.success(
          copy.resetSuccess,
        );

        setIsResetMode(
          false,
        );

        setFailedAttempts(
          0,
        );
      } catch (
        error
      ) {
        toast.error(
          error instanceof Error
            ? error.message
            : isSw
              ? 'Imeshindikana kutuma kiungo cha kurejesha neno la siri.'
              : 'Failed to send reset link.',
        );
      } finally {
        setIsSubmitting(
          false,
        );
      }
    };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[#1c1607] px-4 py-8 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_35%)]" />

      <div className="global-glass relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
        <div className="mb-6 text-center">
          <span className="text-3xl">
            👑
          </span>

          <h2 className="mt-2 text-2xl font-black tracking-wide text-amber-100">
            PHCL Super
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            {copy.title}
          </p>
        </div>

        {isResetMode ? (
          <form
            onSubmit={
              handlePasswordReset
            }
            className="space-y-4 text-xs"
          >
            <div className="text-center">
              <h3 className="text-sm font-bold text-amber-200">
                {copy.resetTitle}
              </h3>

              <p className="mt-1 leading-relaxed text-slate-400">
                {copy.resetDesc}
              </p>
            </div>

            <div>
              <label className="mb-1 block font-bold text-slate-300">
                {copy.emailLabel}
              </label>

              <input
                type="email"
                required
                value={
                  email
                }
                onChange={(
                  event,
                ) =>
                  setEmail(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-3 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                placeholder="name@domain.com"
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={
                isSubmitting
              }
              className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 py-3 text-sm font-bold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? copy.processing
                : copy.sendResetBtn}
            </button>

            <button
              type="button"
              onClick={() =>
                setIsResetMode(
                  false,
                )
              }
              className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              &larr;{' '}
              {copy.backToLogin}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex rounded-xl border border-white/10 bg-slate-950 p-1">
              <button
                type="button"
                disabled={
                  isSubmitting
                }
                onClick={() =>
                  setIsLogin(
                    true,
                  )
                }
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                  isLogin
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {copy.loginTab}
              </button>

              <button
                type="button"
                disabled={
                  isSubmitting
                }
                onClick={() =>
                  setIsLogin(
                    false,
                  )
                }
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                  !isLogin
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {copy.registerTab}
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-4 text-xs"
            >
              {!isLogin && (
                <>
                  <div>
                    <label className="mb-1 block font-bold text-slate-300">
                      {copy.fullNameLabel}
                    </label>

                    <input
                      type="text"
                      required
                      value={
                        fullName
                      }
                      onChange={(
                        event,
                      ) =>
                        setFullName(
                          event.target.value,
                        )
                      }
                      className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-3 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                      placeholder="Juma Rashid"
                      autoComplete="name"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-slate-300">
                      {copy.phoneLabel}
                    </label>

                    <input
                      type="tel"
                      required
                      value={
                        phone
                      }
                      onChange={(
                        event,
                      ) =>
                        setPhone(
                          event.target.value,
                        )
                      }
                      className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-3 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                      placeholder="+255..."
                      autoComplete="tel"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-slate-300">
                      {copy.countryLabel}
                    </label>

                    <input
                      type="text"
                      required
                      value={
                        country
                      }
                      onChange={(
                        event,
                      ) =>
                        setCountry(
                          event.target.value,
                        )
                      }
                      className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-3 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                      placeholder="Tanzania"
                      autoComplete="country-name"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="mb-1 block font-bold text-slate-300">
                  {copy.emailLabel}
                </label>

                <input
                  type="email"
                  required
                  value={
                    email
                  }
                  onChange={(
                    event,
                  ) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-3 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  placeholder="name@domain.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="font-bold text-slate-300">
                    {copy.passwordLabel}
                  </label>

                  {isLogin && (
                    <button
                      type="button"
                      onClick={() =>
                        setIsResetMode(
                          true,
                        )
                      }
                      className="text-[10px] text-amber-300/80 hover:text-amber-200 hover:underline"
                    >
                      {copy.forgotPasswordBtn}
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    required
                    value={
                      password
                    }
                    onChange={(
                      event,
                    ) =>
                      setPassword(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-3 pr-12 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                    placeholder="••••••••"
                    autoComplete={
                      isLogin
                        ? 'current-password'
                        : 'new-password'
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current,
                      )
                    }
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-lg text-slate-400 hover:text-amber-200"
                    aria-label={
                      showPassword
                        ? copy.hidePassword
                        : copy.showPassword
                    }
                    title={
                      showPassword
                        ? copy.hidePassword
                        : copy.showPassword
                    }
                  >
                    {showPassword
                      ? '🙈'
                      : '👁'}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div>
                  <label className="mb-1 block font-bold text-slate-300">
                    {copy.confirmPasswordLabel}
                  </label>

                  <div className="relative">
                    <input
                      type={
                        showConfirmPassword
                          ? 'text'
                          : 'password'
                      }
                      required
                      value={
                        confirmPassword
                      }
                      onChange={(
                        event,
                      ) =>
                        setConfirmPassword(
                          event.target.value,
                        )
                      }
                      className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-3 pr-12 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (current) =>
                            !current,
                        )
                      }
                      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-lg text-slate-400 hover:text-amber-200"
                      aria-label={
                        showConfirmPassword
                          ? copy.hidePassword
                          : copy.showPassword
                      }
                      title={
                        showConfirmPassword
                          ? copy.hidePassword
                          : copy.showPassword
                      }
                    >
                      {showConfirmPassword
                        ? '🙈'
                        : '👁'}
                    </button>
                  </div>

                  {confirmPassword.length > 0 && (
                    <p
                      className={`mt-2 text-[10px] font-semibold ${
                        passwordsMatch
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                      aria-live="polite"
                    >
                      {passwordsMatch
                        ? copy.passwordsMatch
                        : copy.passwordsDoNotMatch}
                    </p>
                  )}
                </div>
              )}

              {!isLogin && (
                <>
                  <div className="space-y-2 rounded-xl border border-white/10 bg-slate-950/50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {copy.strengthTitle}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-medium">
                      <span
                        className={
                          strength.hasLength
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                        }
                      >
                        {strength.hasLength
                          ? '✓'
                          : '✕'}{' '}
                        {copy.lengthCheck}
                      </span>

                      <span
                        className={
                          strength.hasUpper
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                        }
                      >
                        {strength.hasUpper
                          ? '✓'
                          : '✕'}{' '}
                        {copy.upperCheck}
                      </span>

                      <span
                        className={
                          strength.hasLower
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                        }
                      >
                        {strength.hasLower
                          ? '✓'
                          : '✕'}{' '}
                        {copy.lowerCheck}
                      </span>

                      <span
                        className={
                          strength.hasNumber
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                        }
                      >
                        {strength.hasNumber
                          ? '✓'
                          : '✕'}{' '}
                        {copy.numberCheck}
                      </span>

                      <span
                        className={`col-span-2 ${
                          strength.hasSpecial
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {strength.hasSpecial
                          ? '✓'
                          : '✕'}{' '}
                        {copy.specialCheck}
                      </span>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3 text-slate-300">
                    <input
                      type="checkbox"
                      checked={
                        agreedToTerms
                      }
                      onChange={(
                        event,
                      ) =>
                        setAgreedToTerms(
                          event.target.checked,
                        )
                      }
                      className="mt-0.5"
                    />

                    <span>
                      {copy.termsLabel}
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3 text-slate-300">
                    <input
                      type="checkbox"
                      checked={
                        agreedToPrivacy
                      }
                      onChange={(
                        event,
                      ) =>
                        setAgreedToPrivacy(
                          event.target.checked,
                        )
                      }
                      className="mt-0.5"
                    />

                    <span>
                      {copy.privacyLabel}
                    </span>
                  </label>
                </>
              )}

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  (
                    !isLogin &&
                    !canSubmitRegistration
                  )
                }
                className={`w-full rounded-xl py-3 text-sm font-bold shadow-lg transition ${
                  isSubmitting ||
                  (
                    !isLogin &&
                    !canSubmitRegistration
                  )
                    ? 'cursor-not-allowed bg-slate-700 text-slate-400 opacity-50'
                    : 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 hover:bg-amber-300'
                }`}
              >
                {isSubmitting
                  ? copy.processing
                  : isLogin
                    ? copy.loginBtn
                    : copy.registerBtn}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}