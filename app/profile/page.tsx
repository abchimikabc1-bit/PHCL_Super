'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

import Link from 'next/link';

import {
  createCustomerPhoneRecaptchaVerifier,
  refreshCurrentCustomer,
  sendCustomerEmailVerification,
  sendCustomerPhoneVerificationCode,
  verifyAndLinkCustomerPhoneNumber,
} from '@/lib/auth';

import {
  type ConfirmationResult,
  type RecaptchaVerifier,
} from 'firebase/auth';

import {
  auth,
  getUserProfile,
  type UserProfile,
} from '@/lib/user-profile';

type ProfileLoadState =
  | 'loading'
  | 'ready'
  | 'missing'
  | 'unauthenticated'
  | 'error';

type Requirement = {
  key: string;
  label: string;
  met: boolean;
  current?: number;
  target?: number;
};

type VerificationSection = {
  applicable: boolean;
  status: string;
  progressPercent: number;
  eligibleToStart: boolean;
  requirements: Requirement[];
};

type VerificationAssessment = {
  verification: {
    kyc: VerificationSection;
    kys: VerificationSection;
    kyb: VerificationSection;
  };

  trust: {
    level: number;
    name: string;
    score: number;

    nextLevel: {
      level: number;
      name: string;
      minimumScore: number;
    } | null;
  };

  security: {
    twoFactorEnabled: boolean;
    biometricOrPasskeyEnabled: boolean;
    strongAuthenticationReady: boolean;
  };
};

function statusClass(
  status?: string,
): string {
  switch (status) {
    case 'APPROVED':
    case 'VERIFIED':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';

    case 'PENDING':
    case 'PENDING_REVIEW':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';

    case 'REJECTED':
    case 'RESTRICTED':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-300';

    default:
      return 'border-slate-700 bg-slate-950/60 text-slate-300';
  }
}

function displayTier(
  tier?: UserProfile['tier'],
): string {
  switch (tier) {
    case 'small_business':
      return 'Small Business';

    case 'corporate':
      return 'Corporate';

    case 'regular':
      return 'Regular Customer';

    default:
      return 'Not specified';
  }
}

function displayRequirementValue(
  requirement: Requirement,
): string | null {
  if (
    typeof requirement.current !==
      'number' ||
    typeof requirement.target !==
      'number'
  ) {
    return null;
  }

  return `${requirement.current} / ${requirement.target}`;
}

function VerificationCard({
  title,
  section,
}: {
  title: 'KYC' | 'KYS' | 'KYB';
  section: VerificationSection;
}) {
  if (!section.applicable) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4 text-slate-400">
        <p className="text-[10px] font-black uppercase tracking-wider">
          {title}
        </p>

        <p className="mt-2 text-sm font-bold">
          NOT APPLICABLE
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-4 ${statusClass(
        section.status,
      )}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider">
            {title}
          </p>

          <p className="mt-2 text-sm font-bold">
            {section.status}
          </p>
        </div>

        <span className="text-xs font-black">
          {section.progressPercent}%
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30">
        <div
          className="h-full rounded-full bg-current transition-all"
          style={{
            width: `${Math.max(
              0,
              Math.min(
                100,
                section.progressPercent,
              ),
            )}%`,
          }}
        />
      </div>

      <p className="mt-3 text-[11px] font-semibold opacity-80">
        {section.eligibleToStart
          ? 'QUALIFICATION REQUIREMENTS MET'
          : 'REQUIREMENTS IN PROGRESS'}
      </p>

      {section.requirements.length >
        0 && (
        <div className="mt-4 space-y-2 border-t border-current/10 pt-4">
          {section.requirements.map(
            (requirement) => {
              const value =
                displayRequirementValue(
                  requirement,
                );

              return (
                <div
                  key={
                    requirement.key
                  }
                  className="flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex min-w-0 gap-2">
                    <span
                      aria-hidden="true"
                      className={
                        requirement.met
                          ? 'text-emerald-400'
                          : 'text-slate-500'
                      }
                    >
                      {requirement.met
                        ? '✓'
                        : '○'}
                    </span>

                    <span className="break-words">
                      {
                        requirement.label
                      }
                    </span>
                  </div>

                  {value && (
                    <span className="shrink-0 font-bold">
                      {value}
                    </span>
                  )}
                </div>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const [
    user,
    setUser,
  ] =
    useState<User | null>(
      null,
    );

  const [
    profile,
    setProfile,
  ] =
    useState<UserProfile | null>(
      null,
    );

  const [
    assessment,
    setAssessment,
  ] =
    useState<VerificationAssessment | null>(
      null,
    );

  const [
    state,
    setState,
  ] =
    useState<ProfileLoadState>(
      'loading',
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');

  const [
    emailVerificationBusy,
    setEmailVerificationBusy,
  ] = useState(false);

  const [
    emailVerificationMessage,
    setEmailVerificationMessage,
  ] = useState('');

  const [
    emailVerificationError,
    setEmailVerificationError,
  ] = useState('');

  const [
    emailVerificationCooldown,
    setEmailVerificationCooldown,
  ] = useState(false);

  const [
    phoneNumber,
    setPhoneNumber,
  ] = useState('');

  const [
    phoneVerificationCode,
    setPhoneVerificationCode,
  ] = useState('');

  const [
    phoneVerificationBusy,
    setPhoneVerificationBusy,
  ] = useState(false);

  const [
    phoneVerificationMessage,
    setPhoneVerificationMessage,
  ] = useState('');

  const [
    phoneVerificationError,
    setPhoneVerificationError,
  ] = useState('');

  const [
    phoneConfirmation,
    setPhoneConfirmation,
  ] = useState<ConfirmationResult | null>(
    null,
  );

  const phoneRecaptchaRef =
    useRef<RecaptchaVerifier | null>(
      null,
    );

  async function reloadVerificationAssessment(
    currentUser: User,
  ): Promise<void> {
    const idToken =
      await currentUser.getIdToken(
        true,
      );

    const response =
      await fetch(
        '/api/user/verification',
        {
          method: 'GET',

          headers: {
            Authorization:
              `Bearer ${idToken}`,
          },

          cache: 'no-store',
        },
      );

    if (!response.ok) {
      throw new Error(
        response.status === 401
          ? 'Uthibitishaji wa mteja umekataliwa. Tafadhali ingia tena.'
          : 'Imeshindikana kusoma hali ya uthibitishaji.',
      );
    }

    const payload =
      (await response.json()) as
        | (VerificationAssessment & {
            success?: boolean;
          })
        | {
            error?: unknown;
          };

    if (
      !(
        'verification' in payload &&
        'trust' in payload &&
        'security' in payload
      )
    ) {
      throw new Error(
        'Jibu la uthibitishaji si sahihi.',
      );
    }

    setAssessment({
      verification:
        payload.verification,

      trust:
        payload.trust,

      security:
        payload.security,
    });
  }

  async function handleSendVerificationEmail(): Promise<void> {
    if (
      !user ||
      user.emailVerified ||
      emailVerificationBusy ||
      emailVerificationCooldown
    ) {
      return;
    }

    setEmailVerificationBusy(
      true,
    );
    setEmailVerificationMessage(
      '',
    );
    setEmailVerificationError(
      '',
    );

    try {
      await sendCustomerEmailVerification(
        user,
      );

      setEmailVerificationMessage(
        'Email ya uthibitisho imetumwa. Fungua ujumbe wa Firebase/PHCL kwenye barua pepe yako, thibitisha, kisha rudi hapa ukague tena.',
      );

      setEmailVerificationCooldown(
        true,
      );

      window.setTimeout(
        () => {
          setEmailVerificationCooldown(
            false,
          );
        },
        60_000,
      );
    } catch (
      error
    ) {
      setEmailVerificationError(
        error instanceof Error
          ? error.message
          : 'Imeshindikana kutuma email ya uthibitisho.',
      );
    } finally {
      setEmailVerificationBusy(
        false,
      );
    }
  }

  async function handleRefreshEmailVerification(): Promise<void> {
    if (
      !user ||
      emailVerificationBusy
    ) {
      return;
    }

    setEmailVerificationBusy(
      true,
    );
    setEmailVerificationMessage(
      '',
    );
    setEmailVerificationError(
      '',
    );

    try {
      const refreshedUser =
        await refreshCurrentCustomer(
          user,
        );

      setUser(
        refreshedUser,
      );

      await reloadVerificationAssessment(
        refreshedUser,
      );

      if (
        refreshedUser.emailVerified
      ) {
        setEmailVerificationMessage(
          'Email yako imethibitishwa kikamilifu.',
        );
      } else {
        setEmailVerificationError(
          'Firebase bado haijaonyesha email hii kuwa imethibitishwa. Fungua link ya uthibitisho kwenye email yako, kisha ujaribu tena.',
        );
      }
    } catch (
      error
    ) {
      setEmailVerificationError(
        error instanceof Error
          ? error.message
          : 'Imeshindikana kukagua uthibitisho wa email.',
      );
    } finally {
      setEmailVerificationBusy(
        false,
      );
    }
  }

  function clearPhoneRecaptcha(): void {
    phoneRecaptchaRef.current?.clear();
    phoneRecaptchaRef.current =
      null;
  }

  async function handleSendPhoneVerificationCode(): Promise<void> {
    if (
      !user ||
      phoneVerificationBusy ||
      Boolean(user.phoneNumber)
    ) {
      return;
    }

    setPhoneVerificationBusy(
      true,
    );
    setPhoneVerificationMessage(
      '',
    );
    setPhoneVerificationError(
      '',
    );

    try {
      clearPhoneRecaptcha();

      const verifier =
        createCustomerPhoneRecaptchaVerifier(
          'customer-phone-recaptcha',
        );

      phoneRecaptchaRef.current =
        verifier;

      const confirmation =
        await sendCustomerPhoneVerificationCode(
          user,
          phoneNumber,
          verifier,
        );

      setPhoneConfirmation(
        confirmation,
      );

      setPhoneVerificationMessage(
        'Namba ya uthibitisho imetumwa kwa SMS. Ingiza OTP uliyopokea.',
      );
    } catch (error) {
      clearPhoneRecaptcha();

      setPhoneConfirmation(
        null,
      );

      setPhoneVerificationError(
        error instanceof Error
          ? error.message
          : 'Imeshindikana kutuma namba ya uthibitisho.',
      );
    } finally {
      setPhoneVerificationBusy(
        false,
      );
    }
  }

  async function handleVerifyPhoneNumber(): Promise<void> {
    if (
      !user ||
      !phoneConfirmation ||
      phoneVerificationBusy
    ) {
      return;
    }

    setPhoneVerificationBusy(
      true,
    );
    setPhoneVerificationMessage(
      '',
    );
    setPhoneVerificationError(
      '',
    );

    try {
      const verifiedUser =
        await verifyAndLinkCustomerPhoneNumber(
          user,
          phoneConfirmation,
          phoneVerificationCode,
        );

      setUser(
        verifiedUser,
      );

      setPhoneConfirmation(
        null,
      );
      setPhoneVerificationCode(
        '',
      );

      clearPhoneRecaptcha();

      await reloadVerificationAssessment(
        verifiedUser,
      );

      setPhoneVerificationMessage(
        'Namba yako ya simu imethibitishwa kikamilifu na Firebase.',
      );
    } catch (error) {
      setPhoneVerificationError(
        error instanceof Error
          ? error.message
          : 'Imeshindikana kuthibitisha namba ya simu.',
      );
    } finally {
      setPhoneVerificationBusy(
        false,
      );
    }
  }

  useEffect(() => {
    if (!auth) {
      setUser(
        null,
      );

      setProfile(
        null,
      );

      setAssessment(
        null,
      );

      setErrorMessage(
        'Firebase authentication is not configured.',
      );

      setState(
        'error',
      );

      return;
    }

    let active =
      true;

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (
          currentUser,
        ) => {
          if (!active) {
            return;
          }

          setErrorMessage(
            '',
          );

          setAssessment(
            null,
          );

          if (!currentUser) {
            setUser(
              null,
            );

            setProfile(
              null,
            );

            setState(
              'unauthenticated',
            );

            return;
          }

          setUser(
            currentUser,
          );

          setState(
            'loading',
          );

          try {
            /**
             * The profile remains the
             * customer-facing identity/read
             * model.
             *
             * Verification/Trust authority
             * comes from the protected
             * server API below.
             */
            const userProfile =
              await getUserProfile(
                currentUser.uid,
              );

            if (!active) {
              return;
            }

            if (!userProfile) {
              setProfile(
                null,
              );

              setAssessment(
                null,
              );

              setState(
                'missing',
              );

              return;
            }

            /**
             * Transient Firebase ID token.
             *
             * Never persist this token in
             * localStorage, Firestore or UI
             * state.
             */
            const idToken =
              await currentUser.getIdToken();

            const response =
              await fetch(
                '/api/user/verification',
                {
                  method: 'GET',

                  headers: {
                    Authorization:
                      `Bearer ${idToken}`,
                  },

                  cache:
                    'no-store',
                },
              );

            if (!active) {
              return;
            }

            if (!response.ok) {
              throw new Error(
                response.status ===
                  401
                  ? 'Customer authentication imekataliwa. Tafadhali ingia tena.'
                  : 'Imeshindikana kusoma verification assessment.',
              );
            }

            const payload =
              (await response.json()) as
                | (VerificationAssessment & {
                    success?: boolean;
                  })
                | {
                    error?: unknown;
                  };

            if (
              !(
                'verification' in
                  payload &&
                'trust' in
                  payload &&
                'security' in
                  payload
              )
            ) {
              throw new Error(
                'Verification response si sahihi.',
              );
            }

            if (!active) {
              return;
            }

            setProfile(
              userProfile,
            );

            setAssessment({
              verification:
                payload.verification,

              trust:
                payload.trust,

              security:
                payload.security,
            });

            setState(
              'ready',
            );
          } catch (
            error
          ) {
            if (!active) {
              return;
            }

            setProfile(
              null,
            );

            setAssessment(
              null,
            );

            setErrorMessage(
              error instanceof Error
                ? error.message
                : 'Imeshindikana kusoma wasifu wa mteja.',
            );

            setState(
              'error',
            );
          }
        },
      );

    return () => {
      active =
        false;

      unsubscribe();

      phoneRecaptchaRef.current?.clear();
      phoneRecaptchaRef.current =
        null;
    };
  }, []);

  if (
    state === 'loading'
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="text-center">
          <div className="text-3xl">
            👑
          </div>

          <p className="mt-3 text-sm font-semibold text-slate-300">
            Inapakia wasifu na PHCL Trust assessment...
          </p>
        </div>
      </main>
    );
  }

  if (
    state ===
    'unauthenticated'
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-slate-900/70 p-7 text-center">
          <div className="text-4xl">
            🔐
          </div>

          <h1 className="text-xl font-black text-amber-100">
            Customer Authentication Required
          </h1>

          <p className="text-sm leading-relaxed text-slate-400">
            Tafadhali ingia kwenye akaunti yako ya PHCL Super ili kuona wasifu na Trust Level yako.
          </p>

          <Link
            href="/login"
            className="inline-flex rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-3 text-sm font-bold text-slate-950"
          >
            Kuingia (Login)
          </Link>
        </div>
      </main>
    );
  }

  if (
    state === 'missing'
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="w-full max-w-lg space-y-5 rounded-3xl border border-amber-500/20 bg-slate-900/70 p-7">
          <div className="text-center text-4xl">
            ⚠️
          </div>

          <h1 className="text-center text-xl font-black text-amber-200">
            Customer Profile Haijapatikana
          </h1>

          <p className="text-center text-sm leading-relaxed text-slate-400">
            Firebase authentication imetambua session yako, lakini customer profile inayolingana na akaunti hii haijapatikana.
          </p>

          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4 text-xs text-slate-400">
            <p>
              Hatutaunda profile mpya moja kwa moja kutoka ukurasa huu.
            </p>

            <p className="mt-2">
              Hii inalinda PHCL dhidi ya profile duplication na client-side privilege creation.
            </p>
          </div>

          <Link
            href="/marketplace"
            className="block rounded-xl border border-white/10 px-5 py-3 text-center text-sm font-bold text-slate-200 hover:bg-white/5"
          >
            Rudi Marketplace
          </Link>
        </div>
      </main>
    );
  }

  if (
    state === 'error' ||
    !user ||
    !profile ||
    !assessment
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="w-full max-w-lg space-y-5 rounded-3xl border border-rose-500/20 bg-slate-900/70 p-7">
          <div className="text-center text-4xl">
            ⚠️
          </div>

          <h1 className="text-center text-xl font-black text-rose-300">
            Profile Haikuweza Kupakiwa
          </h1>

          <p className="text-center text-sm leading-relaxed text-slate-400">
            {errorMessage ||
              'Imeshindikana kusoma taarifa za customer profile.'}
          </p>

          <Link
            href="/marketplace"
            className="block rounded-xl border border-white/10 px-5 py-3 text-center text-sm font-bold text-slate-200 hover:bg-white/5"
          >
            Rudi Marketplace
          </Link>
        </div>
      </main>
    );
  }

  const trust =
    assessment.trust;

  const nextTrustPoints =
    trust.nextLevel
      ? Math.max(
          0,
          trust.nextLevel
            .minimumScore -
            trust.score,
        )
      : 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] p-6 pb-24 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
            PHCL Super Customer
          </p>

          <h1 className="mt-2 text-3xl font-black">
            Wasifu Wako
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Identity, verification, account security na PHCL Trust overview.
          </p>
        </div>

        <section className="space-y-5 rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-md">
          <div>
            <p className="text-xs font-bold uppercase text-amber-500">
              Jina Kamili
            </p>

            <p className="mt-1 text-xl font-bold">
              {profile.fullName ||
                'Not provided'}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">
                Email
              </p>

              <p className="mt-1 break-all text-sm text-slate-300">
                {profile.email ||
                  user.email ||
                  'Not available'}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-slate-500">
                Phone
              </p>

              <p className="mt-1 text-sm text-slate-300">
                {profile.phone ||
                  'Not provided'}
              </p>
            </div>
          </div>

          <div className="grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-[10px] font-bold uppercase text-slate-500">
                Account Type
              </p>

              <p className="mt-2 text-sm font-bold text-white">
                {displayTier(
                  profile.tier,
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-[10px] font-bold uppercase text-slate-500">
                Uthibitisho wa Email
              </p>

              <p
                className={`mt-2 text-sm font-bold ${
                  user.emailVerified
                    ? 'text-emerald-400'
                    : 'text-amber-300'
                }`}
              >
                {user.emailVerified
                  ? 'IMETHIBITISHWA'
                  : 'HAIJATHIBITISHWA'}
              </p>

              {!user.emailVerified && (
                <div className="mt-4 space-y-3">
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Thibitisha email yako kupitia Firebase ili PHCL iweze kuitumia kama signal salama ya akaunti na qualification ya KYC.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={
                        handleSendVerificationEmail
                      }
                      disabled={
                        emailVerificationBusy ||
                        emailVerificationCooldown
                      }
                      className="rounded-xl bg-amber-400 px-4 py-2 text-[11px] font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {emailVerificationBusy
                        ? 'Inashughulikia...'
                        : emailVerificationCooldown
                          ? 'Subiri kabla ya kutuma tena'
                          : 'Tuma Email ya Uthibitisho'}
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleRefreshEmailVerification
                      }
                      disabled={
                        emailVerificationBusy
                      }
                      className="rounded-xl border border-white/15 px-4 py-2 text-[11px] font-black text-slate-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Nimeshathibitisha — Kagua Tena
                    </button>
                  </div>
                </div>
              )}

              {emailVerificationMessage && (
                <p className="mt-3 text-[11px] leading-relaxed text-emerald-300">
                  {emailVerificationMessage}
                </p>
              )}

              {emailVerificationError && (
                <p className="mt-3 text-[11px] leading-relaxed text-rose-300">
                  {emailVerificationError}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:col-span-2">
              <p className="text-[10px] font-bold uppercase text-slate-500">
                Uthibitisho wa Simu
              </p>

              <p
                className={`mt-2 text-sm font-bold ${
                  user.phoneNumber
                    ? 'text-emerald-400'
                    : 'text-amber-300'
                }`}
              >
                {user.phoneNumber
                  ? 'IMETHIBITISHWA'
                  : 'HAIJATHIBITISHWA'}
              </p>

              {user.phoneNumber ? (
                <p className="mt-2 text-xs text-slate-300">
                  {user.phoneNumber}
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Weka namba yako katika muundo wa kimataifa, mfano +255712345678. Firebase itatuma OTP na namba itaunganishwa na akaunti yako iliyopo.
                  </p>

                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phoneNumber}
                    onChange={(event) => {
                      setPhoneNumber(
                        event.target.value,
                      );
                    }}
                    disabled={
                      phoneVerificationBusy ||
                      Boolean(phoneConfirmation)
                    }
                    placeholder="+255712345678"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-400/50 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  {!phoneConfirmation ? (
                    <button
                      type="button"
                      onClick={
                        handleSendPhoneVerificationCode
                      }
                      disabled={
                        phoneVerificationBusy ||
                        !phoneNumber.trim()
                      }
                      className="rounded-xl bg-amber-400 px-4 py-2.5 text-[11px] font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {phoneVerificationBusy
                        ? 'Inatuma...'
                        : 'Tuma OTP'}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={
                          phoneVerificationCode
                        }
                        onChange={(event) => {
                          setPhoneVerificationCode(
                            event.target.value.replace(
                              /\D/g,
                              '',
                            ),
                          );
                        }}
                        disabled={
                          phoneVerificationBusy
                        }
                        placeholder="Ingiza OTP"
                        maxLength={8}
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm tracking-[0.25em] text-white outline-none placeholder:tracking-normal placeholder:text-slate-600 focus:border-amber-400/50 disabled:cursor-not-allowed disabled:opacity-60"
                      />

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={
                            handleVerifyPhoneNumber
                          }
                          disabled={
                            phoneVerificationBusy ||
                            !phoneVerificationCode.trim()
                          }
                          className="rounded-xl bg-emerald-400 px-4 py-2.5 text-[11px] font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {phoneVerificationBusy
                            ? 'Inathibitisha...'
                            : 'Thibitisha OTP'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPhoneConfirmation(
                              null,
                            );
                            setPhoneVerificationCode(
                              '',
                            );
                            setPhoneVerificationMessage(
                              '',
                            );
                            setPhoneVerificationError(
                              '',
                            );
                            clearPhoneRecaptcha();
                          }}
                          disabled={
                            phoneVerificationBusy
                          }
                          className="rounded-xl border border-white/15 px-4 py-2.5 text-[11px] font-black text-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Badili Namba
                        </button>
                      </div>
                    </div>
                  )}

                  <div
                    id="customer-phone-recaptcha"
                    className="min-h-0"
                  />
                </div>
              )}

              {phoneVerificationMessage && (
                <p className="mt-3 text-[11px] leading-relaxed text-emerald-300">
                  {phoneVerificationMessage}
                </p>
              )}

              {phoneVerificationError && (
                <p className="mt-3 text-[11px] leading-relaxed text-rose-300">
                  {phoneVerificationError}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-slate-900/70 to-purple-500/10 p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400">
                PHCL Trust Level
              </p>

              <h2 className="mt-2 text-2xl font-black text-amber-100">
                Level {trust.level} — {trust.name}
              </h2>

              <p className="mt-2 text-xs text-slate-400">
                Trust Score hutokana na server-verified account, activity, verification na security signals.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-slate-950/60 px-5 py-4 text-center">
              <p className="text-3xl font-black text-amber-300">
                {trust.score}
              </p>

              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                / 100
              </p>
            </div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-950/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-purple-400 transition-all"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(
                    100,
                    trust.score,
                  ),
                )}%`,
              }}
            />
          </div>

          {trust.nextLevel ? (
            <p className="mt-3 text-xs font-semibold text-slate-300">
              Next Level →{' '}
              <span className="font-black text-amber-200">
                Level{' '}
                {trust.nextLevel.level}{' '}
                —{' '}
                {trust.nextLevel.name}
              </span>
              {' • '}
              {nextTrustPoints}{' '}
              points remaining
            </p>
          ) : (
            <p className="mt-3 text-xs font-black text-amber-200">
              PHCL Premier level achieved.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6">
          <h2 className="text-lg font-black text-amber-100">
            Verification & Qualification
          </h2>

          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Qualification progress si verification approval. KYC, KYS na KYB approval hufanywa na protected server/compliance workflow.
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <VerificationCard
              title="KYC"
              section={
                assessment
                  .verification.kyc
              }
            />

            <VerificationCard
              title="KYS"
              section={
                assessment
                  .verification.kys
              }
            />

            <VerificationCard
              title="KYB"
              section={
                assessment
                  .verification.kyb
              }
            />
          </div>
        </section>

        <section className="rounded-3xl border border-purple-400/20 bg-purple-500/5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-300">
                Account Security
              </p>

              <h2 className="mt-2 text-lg font-black text-white">
                Strong Authentication
              </h2>
            </div>

            <span
              className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${
                assessment.security
                  .strongAuthenticationReady
                  ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                  : 'border-amber-400/30 bg-amber-400/10 text-amber-200'
              }`}
            >
              {assessment.security
                .strongAuthenticationReady
                ? 'READY'
                : 'NOT READY'}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-white">
                    2FA / MFA
                  </p>

                  <p className="mt-1 text-[11px] text-slate-500">
                    Additional authentication factor
                  </p>
                </div>

                <span
                  className={
                    assessment.security
                      .twoFactorEnabled
                      ? 'text-emerald-400'
                      : 'text-amber-300'
                  }
                >
                  {assessment.security
                    .twoFactorEnabled
                    ? '✓ ENABLED'
                    : '○ NOT ENABLED'}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-white">
                    Passkey / Biometrics
                  </p>

                  <p className="mt-1 text-[11px] text-slate-500">
                    Device-backed WebAuthn security
                  </p>
                </div>

                <span
                  className={
                    assessment.security
                      .biometricOrPasskeyEnabled
                      ? 'text-emerald-400'
                      : 'text-amber-300'
                  }
                >
                  {assessment.security
                    .biometricOrPasskeyEnabled
                    ? '✓ ENABLED'
                    : '○ NOT ENABLED'}
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
            PHCL haitumii checkbox ya browser kama uthibitisho wa 2FA au biometric enrollment. Security status hapa hutoka kwenye server authority; huduma ambazo authority yake bado haijajengwa hubaki disabled.
          </p>
        </section>

        <section className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h2 className="text-sm font-black text-amber-200">
            Wallet & Financial Ledger
          </h2>

          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Salio la fedha halitumiki kutoka customer profile hii. PHCL Wallet hutumia server-authoritative financial account na immutable financial ledger.
          </p>

          <Link
            href="/wallet"
            className="mt-4 inline-flex rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-black text-slate-950"
          >
            Fungua Wallet
          </Link>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/marketplace"
            className="rounded-xl border border-white/10 px-5 py-3 text-xs font-bold text-slate-300 hover:bg-white/5"
          >
            Marketplace
          </Link>

          <Link
            href="/settings"
            className="rounded-xl border border-white/10 px-5 py-3 text-xs font-bold text-slate-300 hover:bg-white/5"
          >
            Settings
          </Link>
        </div>
      </div>
    </main>
  );
}