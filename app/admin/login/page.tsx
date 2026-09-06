'use client';

import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useAdmin } from '@/lib/admin-context';

export default function AdminLoginPage() {
  const router = useRouter();

  const {
    login,
    checkAuth,
    isAuthenticated,
    isLoading,
  } = useAdmin();

  const [email, setEmail] = useState(
    'admin@phclsuper.com'
  );

  const [password, setPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/admin/dashboard');
    }
  }, [
    isAuthenticated,
    isLoading,
    router,
  ]);

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setErrorMessage('');

    const cleanEmail = email
      .trim()
      .toLowerCase();

    if (!cleanEmail || !password) {
      const message =
        'Barua pepe na nenosiri vinahitajika.';

      setErrorMessage(message);
      toast.error(message);

      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(
        cleanEmail,
        password
      );

      if (!result.success) {
        const message =
          result.message ||
          'Email au password si sahihi. Tafadhali jaribu tena.';

        setErrorMessage(message);
        toast.error(message);

        return;
      }

      /*
       * Thibitisha HttpOnly session cookie
       * kwa server kabla ya kuingia Dashboard.
       */
      const sessionValid =
        await checkAuth();

      if (!sessionValid) {
        const message =
          'Login imekubaliwa lakini session ya Admin haikuthibitishwa. Tafadhali jaribu tena.';

        setErrorMessage(message);
        toast.error(message);

        return;
      }

      setPassword('');

      toast.success(
        'Umeingia kama Admin kikamilifu.'
      );

      router.replace('/admin/dashboard');
    } catch (error) {
      console.error(
        'Admin login error:',
        error
      );

      const message =
        'Imeshindikana kukamilisha Admin login. Tafadhali jaribu tena.';

      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
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
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* EMAIL */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-bold text-amber-300 mb-1"
            >
              Email ya Admin
            </label>

            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white focus:border-amber-400 focus:outline-none"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMessage('');
              }}
              disabled={isSubmitting}
            />
          </div>

          {/* PASSWORD */}
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
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                autoComplete="current-password"
                required
                className="w-full px-3 py-2.5 pr-20 rounded-lg bg-black/40 border border-white/10 text-white focus:border-amber-400 focus:outline-none"
                value={password}
                onChange={(e) => {
                  setPassword(
                    e.target.value
                  );
                  setErrorMessage('');
                }}
                disabled={isSubmitting}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (prev) => !prev
                  )
                }
                disabled={isSubmitting}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-300 hover:text-amber-200 disabled:opacity-50"
              >
                {showPassword
                  ? 'Ficha'
                  : 'Onyesha'}
              </button>
            </div>
          </div>

          {/* INLINE ERROR */}
          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"
            >
              {errorMessage}
            </div>
          )}

          {/* LOGIN BUTTON */}
          <button
            type="submit"
            disabled={isSubmitting}
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