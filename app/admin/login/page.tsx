'use client';

import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import {
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import {
  toast,
} from 'sonner';

import {
  useAdmin,
} from '@/lib/admin-context';

import {
  getAdminFirebaseAuth,
} from '@/lib/admin-firebase-client';

function getFirebaseErrorCode(
   error: unknown
): string {
  if (
    typeof error !==
      'object' ||
    error === null
  ) {
    return '';
  }

  const record =
    error as Record<
      string,
      unknown
    >;

  return typeof record.code ===
    'string'
    ? record.code
    : '';
}

async function clearAdminFirebaseSession():
  Promise<void> {
  const auth =
    getAdminFirebaseAuth();

  if (!auth?.currentUser) {
    return;
  }

  try {
    await signOut(auth);
  } catch {
    /*
     * Local Firebase cleanup must not
     * replace the primary login result.
     */
  }
}

async function preparePhoneEnrollment(
  email: string,
  password: string
): Promise<boolean> {
  const auth =
    getAdminFirebaseAuth();

  if (!auth) {
    return false;
  }

  try {
    if (auth.currentUser) {
      await signOut(auth);
    }

    const credential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    const firebaseEmail =
      credential.user.email
        ?.trim()
        .toLowerCase() || '';

    if (
      firebaseEmail !== email ||
      credential.user
        .emailVerified !== true
    ) {
      await signOut(auth);
      return false;
    }

    return true;
  } catch (error) {
    const code =
      getFirebaseErrorCode(
        error
      );

    if (
      process.env.NODE_ENV ===
      'development'
    ) {
      console.warn(
        '[PHCL Admin Firebase] enrollment sign-in failed:',
        code || 'UNKNOWN_ERROR'
      );
    }

    await clearAdminFirebaseSession();

    return false;
  }
}

export default function AdminLoginPage() {
  const router =
    useRouter();

  const {
    login,
    checkAuth,
    isAuthenticated,
    isLoading,
  } = useAdmin();

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  useEffect(() => {
    if (
      !isLoading &&
      isAuthenticated
    ) {
      router.replace(
        '/admin/dashboard'
      );
    }
  }, [
    isAuthenticated,
    isLoading,
    router,
  ]);

  const handleSubmit = async (
    event:
      FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setErrorMessage('');

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !cleanEmail ||
      !password
    ) {
      const message =
        'Barua pepe na nenosiri vinahitajika.';

      setErrorMessage(
        message
      );

      toast.error(
        message
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const result =
        await login(
          cleanEmail,
          password
        );

      if (!result.success) {
        await clearAdminFirebaseSession();

        const message =
          result.message ||
          'Email au password si sahihi. Tafadhali jaribu tena.';

        setErrorMessage(
          message
        );

        toast.error(
          message
        );

        return;
      }

      if (
        result.nextStep ===
          'PHONE_ENROLLMENT'
      ) {
        const firebaseReady =
          await preparePhoneEnrollment(
            cleanEmail,
            password
          );

        setPassword('');

        if (!firebaseReady) {
          const message =
            'Firebase haikuweza kuthibitisha taarifa za Admin kwa ajili ya simu. Hakikisha password ya Firebase Admin ni sahihi.';

          setErrorMessage(
            message
          );

          toast.error(
            message
          );

          return;
        }

        toast.info(
          result.message ||
            'Thibitisha namba ya simu ili kukamilisha Admin login.'
        );

        router.replace(
          '/admin/security/verify-phone'
        );

        return;
      }

      if (
        !result.authenticated ||
        result.nextStep !==
          'ADMIN_SESSION'
      ) {
        await clearAdminFirebaseSession();

        const message =
          'Jibu la uthibitishaji wa Admin halikuwa sahihi. Tafadhali jaribu tena.';

        setErrorMessage(
          message
        );

        toast.error(
          message
        );

        return;
      }

      const sessionValid =
        await checkAuth();

      if (!sessionValid) {
        await clearAdminFirebaseSession();

        const message =
          'Login imekubaliwa lakini session ya Admin haikuthibitishwa. Tafadhali jaribu tena.';

        setErrorMessage(
          message
        );

        toast.error(
          message
        );

        return;
      }

      await clearAdminFirebaseSession();

      setPassword('');

      toast.success(
        'Umeingia kama Admin kikamilifu.'
      );

      router.replace(
        '/admin/dashboard'
      );
    } catch {
      await clearAdminFirebaseSession();

      const message =
        'Imeshindikana kukamilisha Admin login. Tafadhali jaribu tena.';

      setErrorMessage(
        message
      );

      toast.error(
        message
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="text-sm font-semibold text-amber-300">
          Inahakiki Admin session...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-amber-500/20 rounded-2xl p-8 shadow-[0_0_40px_rgba(245,158,11,0.15)]">
        <h1 className="text-2xl font-black text-amber-200 mb-2">
          PHCL Admin Center
        </h1>

        <p className="text-xs text-gray-400 mb-6">
          Ingia kwa kutumia taarifa rasmi za
          Admin.
        </p>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-bold text-amber-300 mb-1"
            >
              Email ya Admin
            </label>

            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              required
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white focus:border-amber-400 focus:outline-none"
              value={email}
              onChange={(
                event
              ) => {
                setEmail(
                  event.target.value
                );

                setErrorMessage('');
              }}
              disabled={
                isSubmitting
              }
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-bold text-amber-300 mb-1"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                autoComplete="current-password"
                required
                className="w-full px-3 py-2.5 pr-20 rounded-lg bg-black/40 border border-white/10 text-white focus:border-amber-400 focus:outline-none"
                value={
                  password
                }
                onChange={(
                  event
                ) => {
                  setPassword(
                    event.target.value
                  );

                  setErrorMessage('');
                }}
                disabled={
                  isSubmitting
                }
              />

              <button
                type="button"
                onClick={() => {
                  setShowPassword(
                    (
                      previous
                    ) =>
                      !previous
                  );
                }}
                disabled={
                  isSubmitting
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-300 hover:text-amber-200 disabled:opacity-50"
              >
                {showPassword
                  ? 'Ficha'
                  : 'Onyesha'}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"
            >
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={
              isSubmitting
            }
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-sm transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? 'Inahakiki taarifa...'
              : 'Kuingia Kama Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}