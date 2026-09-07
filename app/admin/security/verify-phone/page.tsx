'use client';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import {
  RecaptchaVerifier,
  getIdToken,
  linkWithPhoneNumber,
  onAuthStateChanged,
  signOut,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';

import {
  toast,
} from 'sonner';

import {
  getAdminFirebaseAuth,
} from '@/lib/admin-firebase-client';

type Stage =
  | 'phone'
  | 'code';

type PhoneEnrollmentResponse = {
  ok?: boolean;
  authenticated?: boolean;
  code?: string;
  message?: string;
};

const SMS_REQUEST_STORAGE_KEY =
  'phcl_admin_phone_sms_requested_at';

const SMS_REQUEST_COOLDOWN_MS =
  60 * 1000;

class PhoneEnrollmentServerError extends Error {
  constructor(
    message: string,
    readonly serverCode: string
  ) {
    super(message);
    this.name =
      'PhoneEnrollmentServerError';
  }
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

async function readJsonResponse(
  response: Response
): Promise<PhoneEnrollmentResponse | null> {
  const contentType =
    response.headers.get(
      'content-type'
    ) || '';

  if (
    !contentType
      .toLowerCase()
      .includes('application/json')
  ) {
    return null;
  }

  try {
    const value: unknown =
      await response.json();

    return isRecord(value)
      ? value as PhoneEnrollmentResponse
      : null;
  } catch {
    return null;
  }
}

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

function getSafeFirebaseMessage(
  error: unknown
): string {
  const code =
    getFirebaseErrorCode(
      error
    );

  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Namba ya simu si sahihi. Tumia mfano +255712345678.';

    case 'auth/invalid-verification-code':
      return 'Namba ya uthibitishaji si sahihi.';

    case 'auth/code-expired':
      return 'Namba ya uthibitishaji imekwisha muda. Tuma OTP nyingine.';

    case 'auth/too-many-requests':
      return 'Majaribio yamezidi. Subiri kidogo kabla ya kujaribu tena.';

    case 'auth/credential-already-in-use':
      return 'Namba hii tayari imeunganishwa na akaunti nyingine.';

    case 'auth/requires-recent-login':
      return 'Firebase login imekwisha muda. Rudi kwenye Admin login.';

    case 'auth/captcha-check-failed':
      return 'Uthibitishaji wa reCAPTCHA umeshindikana. Jaribu tena.';

    default:
      return 'Uthibitishaji wa simu umeshindikana. Tafadhali jaribu tena.';
  }
}

function normalizePhoneNumber(
  input: string
): string | null {
  const compact =
    input.replace(
      /[\s()-]/g,
      ''
    );

  if (/^0[67]\d{8}$/.test(compact)) {
    return `+255${compact.slice(1)}`;
  }

  if (/^255[67]\d{8}$/.test(compact)) {
    return `+${compact}`;
  }

  if (/^\+[1-9]\d{7,14}$/.test(compact)) {
    return compact;
  }

  return null;
}

async function waitForFirebaseUser(
  timeoutMs = 8_000
): Promise<User | null> {
  const auth =
    getAdminFirebaseAuth();

  if (!auth) {
    return null;
  }

  if (auth.currentUser) {
    return auth.currentUser;
  }

  return new Promise(
    (resolve) => {
      let settled = false;

      let timer:
        number | undefined;

      let unsubscribe:
        () => void =
        () => {};

      const finish = (
        user: User | null
      ) => {
        if (settled) {
          return;
        }

        settled = true;
        if (
          timer !== undefined
        ) {
          clearTimeout(timer);
        }

        unsubscribe();
        resolve(user);
      };

      unsubscribe =
        onAuthStateChanged(
          auth,
          (user) => {
            finish(user);
          },
          () => {
            finish(null);
          }
        );

      timer =
        window.setTimeout(
          () => {
            finish(null);
          },
          timeoutMs
        );
    }
  );
}

export default function AdminVerifyPhonePage() {
  const router =
    useRouter();

  const recaptchaRef =
    useRef<RecaptchaVerifier | null>(
      null
    );

  const confirmationRef =
    useRef<ConfirmationResult | null>(
      null
    );

  const [stage, setStage] =
    useState<Stage>('phone');

  const [phone, setPhone] =
    useState('');

  const [code, setCode] =
    useState('');

  const [isReady, setIsReady] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  const clearRecaptcha = () => {
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
  };

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      try {
        const response =
          await fetch(
            '/api/admin/phone/enrollment',
            {
              method: 'GET',
              credentials: 'include',
              cache: 'no-store',
            }
          );

        if (!response.ok) {
          router.replace(
            '/admin/login'
          );
          return;
        }

        const firebaseUser =
          await waitForFirebaseUser();

        if (!firebaseUser) {
          router.replace(
            '/admin/login'
          );
          return;
        }

        if (active) {
          setIsReady(true);
        }
      } catch {
        if (active) {
          setErrorMessage(
            'Imeshindikana kuanzisha uthibitishaji wa simu.'
          );
        }
      }
    };

    void initialize();

    return () => {
      active = false;
      clearRecaptcha();
    };
  }, [router]);

  const sendCode = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setErrorMessage('');

    const normalizedPhone =
      normalizePhoneNumber(
        phone
      );

    if (!normalizedPhone) {
      const message =
        'Weka namba sahihi, kwa mfano +255712345678.';

      setErrorMessage(message);
      toast.error(message);
      return;
    }

    const lastSmsRequestAt =
      Number(
        window.sessionStorage.getItem(
          SMS_REQUEST_STORAGE_KEY
        ) || 0
      );

    const remainingCooldownMs =
      lastSmsRequestAt +
        SMS_REQUEST_COOLDOWN_MS -
      Date.now();

    if (remainingCooldownMs > 0) {
      const seconds =
        Math.max(
          1,
          Math.ceil(
            remainingCooldownMs /
              1000
          )
        );

      const message =
        `Subiri sekunde ${seconds} kabla ya kuomba OTP nyingine.`;

      setErrorMessage(message);
      toast.error(message);
      return;
    }

    const auth =
      getAdminFirebaseAuth();

    const firebaseUser =
      auth?.currentUser;

    if (
      !auth ||
      !firebaseUser
    ) {
      router.replace(
        '/admin/login'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      clearRecaptcha();

      auth.languageCode = 'sw';

      const verifier =
        new RecaptchaVerifier(
          auth,
          'admin-phone-recaptcha',
          {
            size: 'normal',
          }
        );

      recaptchaRef.current =
        verifier;

      await verifier.render();

      window.sessionStorage.setItem(
        SMS_REQUEST_STORAGE_KEY,
        String(Date.now())
      );

      const confirmation =
        await linkWithPhoneNumber(
          firebaseUser,
          normalizedPhone,
          verifier
        );

      confirmationRef.current =
        confirmation;

      setPhone(
        normalizedPhone
      );

      setStage('code');

      toast.success(
        'OTP imetumwa kwenye simu yako.'
      );
    } catch (error) {
      clearRecaptcha();

      const firebaseCode =
        getFirebaseErrorCode(
          error
        );

      console.warn(
        '[PHCL Admin Phone] Firebase code:',
        firebaseCode ||
          'UNKNOWN_ERROR'
      );

      const message =
        getSafeFirebaseMessage(
          error
        );

      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyCode = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setErrorMessage('');

    const cleanCode =
      code.replace(/\s/g, '');

    if (!/^\d{6}$/.test(cleanCode)) {
      const message =
        'Weka OTP yenye tarakimu sita.';

      setErrorMessage(message);
      toast.error(message);
      return;
    }

    const confirmation =
      confirmationRef.current;

    if (!confirmation) {
      setStage('phone');
      setCode('');
      return;
    }

    setIsSubmitting(true);

    try {
      const credential =
        await confirmation.confirm(
          cleanCode
        );

      const idToken =
        await getIdToken(
          credential.user,
          true
        );

      const response =
        await fetch(
          '/api/admin/phone/enrollment',
          {
            method: 'POST',
            headers: {
              Accept:
                'application/json',
              'Content-Type':
                'application/json',
            },
            credentials:
              'include',
            cache: 'no-store',
            body:
              JSON.stringify({
                idToken,
              }),
          }
        );

      const data =
        await readJsonResponse(
          response
        );

      if (
        !response.ok ||
        data?.ok !== true ||
        data?.authenticated !== true
      ) {
        throw new PhoneEnrollmentServerError(
          typeof data?.message === 'string' &&
          data.message.trim()
            ? data.message
            : 'Server haikuweza kukamilisha uthibitishaji wa simu.',
          typeof data?.code === 'string'
            ? data.code
            : 'SERVER_PHONE_VERIFICATION_FAILED'
        );
      }

      const auth =
        getAdminFirebaseAuth();

      if (auth) {
        await signOut(auth)
          .catch(() => undefined);
      }

      setCode('');
      clearRecaptcha();

      toast.success(
        'Namba ya simu imethibitishwa salama.'
      );

      window.location.replace(
        '/admin/security/verify-device'
      );
    } catch (error) {
      const message =
        error instanceof PhoneEnrollmentServerError
          ? error.message
          : getSafeFirebaseMessage(
              error
            );

      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="text-sm font-semibold text-amber-300">
          Inaandaa uthibitishaji wa simu...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/20 bg-slate-900 p-8 shadow-[0_0_40px_rgba(245,158,11,0.15)]">
        <h1 className="mb-2 text-2xl font-black text-amber-200">
          Thibitisha Simu ya Admin
        </h1>

        <p className="mb-6 text-sm text-gray-400">
          {stage === 'phone'
            ? 'Weka namba ya simu itakayounganishwa na akaunti rasmi ya Admin.'
            : `Weka OTP iliyotumwa kwenda ${phone}.`}
        </p>

        {stage === 'phone' ? (
          <form
            onSubmit={sendCode}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="phone"
                className="mb-1 block text-xs font-bold text-amber-300"
              >
                Namba ya simu
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                autoFocus
                placeholder="+255712345678"
                value={phone}
                onChange={(event) => {
                  setPhone(
                    event.target.value
                  );
                  setErrorMessage('');
                }}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div
              id="admin-phone-recaptcha"
              className="min-h-[78px] overflow-hidden rounded-lg"
            />

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
              disabled={isSubmitting}
              className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? 'Inatuma OTP...'
                : 'Tuma OTP'}
            </button>
          </form>
        ) : (
          <form
            onSubmit={verifyCode}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="verification-code"
                className="mb-1 block text-xs font-bold text-amber-300"
              >
                OTP ya tarakimu sita
              </label>

              <input
                id="verification-code"
                name="verification-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
                maxLength={6}
                value={code}
                onChange={(event) => {
                  setCode(
                    event.target.value.replace(
                      /\D/g,
                      ''
                    )
                  );
                  setErrorMessage('');
                }}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-center text-xl tracking-[0.4em] text-white focus:border-amber-400 focus:outline-none"
              />
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
              disabled={isSubmitting}
              className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? 'Inathibitisha OTP...'
                : 'Thibitisha OTP'}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                confirmationRef.current = null;
                clearRecaptcha();
                setCode('');
                setStage('phone');
                setErrorMessage('');
              }}
              className="w-full py-2 text-xs font-bold text-amber-300 disabled:opacity-50"
            >
              Badilisha namba au tuma OTP nyingine
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
