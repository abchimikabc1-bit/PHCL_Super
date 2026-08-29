'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Wallet,
  ShoppingBag,
  MessageCircle,
  Sparkles,
  Mail,
  Phone,
  Star,
  User,
  Settings,
  RefreshCw,
} from 'lucide-react';

import { useLanguage } from '@/hooks/use-language';
import { useDisplayCurrency } from '@/hooks/use-display-currency';
import {
  getMarketplaceProductImage,
  MARKETPLACE_PRODUCTS,
} from '@/lib/marketplace-products';
import {
  PI_GCV_USD,
  convertAmount,
  formatCurrencyAmount,
} from '@/components/currency';

// 1. Bendera ya Tanzania
const TanzaniaFlag = () => (
  <svg
    viewBox="0 0 900 600"
    className="w-6 h-4 rounded-sm border border-white/10 animate-flag-wave select-none"
    aria-label="Tanzania flag"
    role="img"
  >
    <rect width="900" height="600" fill="#1eb53a" />

    <path
      d="M0,600 L900,0 L900,600 Z"
      fill="#00a3dd"
    />

    <path
      d="M0,600 L900,0"
      stroke="#fcd116"
      strokeWidth="140"
    />

    <path
      d="M0,600 L900,0"
      stroke="#000000"
      strokeWidth="100"
    />
  </svg>
);

// 2. Bendera ya Uingereza / UK
const UkFlag = () => (
  <svg
    viewBox="0 0 60 30"
    className="w-6 h-4 rounded-sm border border-white/10 animate-flag-wave select-none"
    aria-label="United Kingdom flag"
    role="img"
  >
    <defs>
      <clipPath id="uk-flag-clip">
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
    </defs>

    <path
      d="M0,0 v30 h60 v-30 z"
      fill="#012169"
    />

    <path
      d="M0,0 L60,30 M60,0 L0,30"
      stroke="#ffffff"
      strokeWidth="6"
      clipPath="url(#uk-flag-clip)"
    />

    <path
      d="M0,0 L60,30"
      stroke="#C8102E"
      strokeWidth="4"
      clipPath="url(#uk-flag-clip)"
    />

    <path
      d="M0,15 h60 M30,0 v30"
      stroke="#ffffff"
      strokeWidth="10"
    />

    <path
      d="M0,15 h60 M30,0 v30"
      stroke="#C8102E"
      strokeWidth="6"
    />
  </svg>
);

export default function HomeClient() {
  const {
    language,
    switchLanguage,
    mounted,
  } = useLanguage();

  const {
    displayCurrency,
    setCurrency,
    enabledDisplayCurrencies,
  } = useDisplayCurrency('usd');

  const isSw = mounted && language === 'sw';

  const [activeTestimonialIndex, setActiveTestimonialIndex] =
    useState(0);

  const copy = {
    badge: isSw
      ? 'Jukwaa la PHCL Super'
      : 'PHCL Super Platform',

    title: isSw
      ? 'Karibu PHCL Super'
      : 'Welcome to PHCL Super',

    subtitle: isSw
      ? 'Jenga uchumi wako vya kidijitali sehemu moja. Fanya biashara kwa akili, simamia fedha zako salama, na ungana na jamii kupitia mfumo wa kisasa wenye kasi.'
      : 'Build your digital economy in one place. Trade smarter, manage funds safely, and connect with the community through a modern experience built for speed.',

    partnersTitle: isSw
      ? 'Washirika Wanaoaminiwa'
      : 'Trusted Partners',

    partnersText: isSw
      ? 'Tunashirikiana na timu na mifumo inayoaminika ili kutoa huduma imara kwa watumiaji wa Tanzania na kimataifa.'
      : 'We collaborate with reliable teams and infrastructures to deliver dependable service for users in Tanzania and globally.',

    contactTitle: isSw
      ? 'Wasiliana Nasi'
      : 'Contact Us',

    contactText: isSw
      ? 'Kwa usaidizi wa haraka, timu yetu iko tayari kukusaidia kupitia barua pepe au simu.'
      : 'For fast support, our team is ready to assist you by email or phone.',

    localeLabel: isSw
      ? 'Lugha'
      : 'Language',
    metricsTitle: isSw
      ? 'Mafanikio kwa Takwimu'
      : 'Performance by Numbers',

    testimonialsTitle: isSw
      ? 'Maoni ya Wateja'
      : 'What Users Say',

    testimonialsCta: isSw
      ? 'Toa Maoni Yako'
      : 'Leave Your Feedback',

    featuredTitle: isSw
      ? 'Bidhaa Maarufu'
      : 'Featured Products',

    featuredSub: isSw
      ? 'Bidhaa zenye rating za juu kutoka marketplace yetu.'
      : 'Top-rated picks from our marketplace.',

    viewAllProducts: isSw
      ? 'Tazama Bidhaa Zote'
      : 'View All Products',

    payIn: isSw
      ? 'Lipa kwa'
      : 'Pay in',

    gcvNote: isSw
      ? `Kiwango cha GCV: 1 PI = $${PI_GCV_USD.toLocaleString('en-US')}`
      : `GCV rate: 1 PI = $${PI_GCV_USD.toLocaleString('en-US')}`,

    globalReach: isSw
      ? 'TAYARI KWA SOKO LA DUNIA'
      : 'READY FOR GLOBAL MARKETS',

    globalReachText: isSw
      ? 'Tanzania • East Africa • Global trade lanes'
      : 'Tanzania • East Africa • Global trade lanes',

    readinessTitle: isSw
      ? 'Tayari Kuhudumia'
      : 'Ready to Serve',

    readinessText: isSw
      ? 'PHCL Super imeandaliwa kwa onboarding, marketplace, checkout yenye consent, na support routes wazi kwa matumizi ya kila siku.'
      : 'PHCL Super is prepared for onboarding, marketplace activity, consent-aware checkout, and clear support routes for daily use.',

    readinessItems: isSw
      ? [
          'Signup yenye sera za lazima',
          'Marketplace na product pages tayari',
          'Checkout na legal consent enforcement',
          'Privacy, terms, na settings links wazi',
        ]
      : [
          'Signup with mandatory policy consent',
          'Marketplace and product pages ready',
          'Checkout with enforced legal consent',
          'Privacy, terms, and settings links available',
        ],

    readinessCta: isSw
      ? 'Anza Safari Yako'
      : 'Start Your Journey',

    nextStep: isSw
      ? 'Hatua Inayofuata'
      : 'Next Step',

    nextStepText: isSw
      ? 'Sanidi pochi yako au badilisha mipangilio ya akaunti yako ili kuanza kutumia jukwaa letu.'
      : 'Configure your wallet ledger or edit your settings to start using our platform.',

    goWallet: isSw
      ? 'Fungua Pochi'
      : 'Open Wallet',

    openSettings: isSw
      ? 'Mipangilio'
      : 'Settings',

    shortcutsTitle: isSw
      ? 'Njia za Mkato za Haraka (Command Center)'
      : 'Quick Navigation Shortcuts',

    shortcutMarketplace: isSw
      ? 'Soko (Marketplace)'
      : 'Marketplace',

    shortcutWallet: isSw
      ? 'Pochi (Wallet)'
      : 'Wallet Ledger',

    shortcutChat: isSw
      ? 'Mazungumzo (Chat)'
      : 'Community Chat',

    shortcutExchange: isSw
      ? 'Ubadilishaji (Exchange)'
      : 'Currency Exchange',

    shortcutProfile: isSw
      ? 'Profaili Yako (Profile)'
      : 'My Profile',

    shortcutSettings: isSw
      ? 'Mipangilio (Settings)'
      : 'Settings',
  };

  const metrics = [
    {
      value: '25K+',
      label: isSw
        ? 'Watumiaji Waliosajiliwa'
        : 'Registered Users',
    },
    {
      value: '120K+',
      label: isSw
        ? 'Miamala ya Kila Mwezi'
        : 'Monthly Transactions',
    },
    {
      value: '99.9%',
      label: isSw
        ? 'Uwepo wa Mfumo'
        : 'Platform Uptime',
    },
    {
      value: '<2m',
      label: isSw
        ? 'Muda wa Majibu ya Support'
        : 'Support Response Time',
    },
  ];

  const liveTestimonials = useMemo(() => {
    return [...MARKETPLACE_PRODUCTS]
      .sort((a, b) => b.reviews - a.reviews)
      .slice(0, 3)
      .map((product, index) => {
        const recommendation = isSw
          ? [
              `${product.name} imepewa alama ya juu na wanunuzi wengi`,
              `Wateja wanaipenda ${product.name} kwa ubora na mwonekano wake`,
              `${product.seller} anaendelea kupata maoni mazuri kutoka sokoni`,
            ][index]
          : [
              `${product.name} is consistently rated highly by buyers`,
              `Customers keep praising ${product.name} for its quality and finish`,
              `${product.seller} continues to attract strong marketplace feedback`,
            ][index];

        return {
          name: product.seller,
          role: `${product.category} • ${product.reviews.toLocaleString(
            'en-US',
          )} ${isSw ? 'maoni' : 'reviews'} • ${product.rating.toFixed(1)}/5`,
          quote: recommendation,
          rating: product.rating,
          reviews: product.reviews,
          productName: product.name,
          category: product.category,
        };
      });
  }, [isSw]);

  useEffect(() => {
    if (liveTestimonials.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveTestimonialIndex(
        (current) =>
          (current + 1) % liveTestimonials.length,
      );
    }, 4500);

    return () => {
      window.clearInterval(interval);
    };
  }, [liveTestimonials.length]);

  const liveTestimonialsStats = useMemo(() => {
    const totalReviews = liveTestimonials.reduce(
      (sum, item) => sum + item.reviews,
      0,
    );

    const averageRating = liveTestimonials.length
      ? (
          liveTestimonials.reduce(
            (sum, item) => sum + item.rating,
            0,
          ) / liveTestimonials.length
        ).toFixed(1)
      : '0.0';

    return {
      totalReviews,
      averageRating,
    };
  }, [liveTestimonials]);

  const featuredProducts = MARKETPLACE_PRODUCTS.slice(0, 6);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_22%),radial-gradient(circle_at_bottom_center,rgba(245,158,11,0.12),transparent_25%)]" />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-amber-300/10 to-transparent" />

      <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="global-shimmer ink-glow animate-pulse inline-flex items-center gap-2 rounded-full border border-amber-300/35 bg-amber-200/15 px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-[0_0_20px_rgba(251,191,36,0.25)]">
            <Sparkles size={14} />
            {copy.badge}
          </div>

          <div className="global-glass inline-flex items-center gap-2 rounded-xl border border-amber-200/35 bg-white/8 p-1 text-xs font-semibold text-white">
            <span className="px-2 text-amber-50 opacity-90">
              {copy.localeLabel}
            </span>

            <button
              type="button"
              onClick={() => switchLanguage('en')}
              className={`rounded-lg px-3 py-1 transition ${
                !isSw
                  ? 'bg-amber-300 text-slate-900'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              🇬🇧 EN
            </button>

            <button
              type="button"
              onClick={() => switchLanguage('sw')}
              className={`rounded-lg px-3 py-1 transition ${
                isSw
                  ? 'bg-amber-300 text-slate-900'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              🇹🇿 SW
            </button>
          </div>
        </div>

        <div className="global-glass inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white">
          {copy.globalReach}

          <span className="h-1 w-1 rounded-full bg-amber-300" />

          {copy.globalReachText}
        </div>

        {/* Hero Typography */}
        <h1 className="mt-6 flex max-w-4xl flex-wrap items-center gap-3 bg-gradient-to-r from-amber-100 via-white to-amber-200 bg-clip-text text-4xl font-black leading-tight text-transparent drop-shadow-[0_0_24px_rgba(251,191,36,0.14)] sm:text-5xl lg:text-6xl">
          {copy.title}
          {isSw ? <TanzaniaFlag /> : <UkFlag />}
        </h1>

        <p className="mt-5 max-w-2xl text-base text-white/95 sm:text-lg">
          {copy.subtitle}
        </p>

        <div className="mt-12 rounded-3xl border border-white/10 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-xl">
          <h3 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-500">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />
            {copy.shortcutsTitle}
          </h3>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Link
              href="/marketplace"
              className="group flex transform flex-col items-center justify-center rounded-2xl border border-amber-200/10 bg-slate-950/40 p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-amber-400/40 hover:bg-slate-950/70"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg transition group-hover:scale-110">
                <ShoppingBag size={22} />
              </div>

              <span className="text-center text-xs font-black text-slate-200 transition group-hover:text-amber-400">
                {copy.shortcutMarketplace}
              </span>
            </Link>

            <Link
              href="/wallet"
              className="group flex transform flex-col items-center justify-center rounded-2xl border border-emerald-500/10 bg-slate-950/40 p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-emerald-400/40 hover:bg-slate-950/70"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg transition group-hover:scale-110">
                <Wallet size={22} />
              </div>

              <span className="text-center text-xs font-black text-slate-200 transition group-hover:text-emerald-400">
                {copy.shortcutWallet}
              </span>
            </Link>

            <Link
              href="/chat"
              className="group flex transform flex-col items-center justify-center rounded-2xl border border-blue-500/10 bg-slate-950/40 p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-blue-400/40 hover:bg-slate-950/70"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-slate-950 shadow-lg transition group-hover:scale-110">
                <MessageCircle size={22} />
              </div>

              <span className="text-center text-xs font-black text-slate-200 transition group-hover:text-blue-400">
                {copy.shortcutChat}
              </span>
            </Link>

            <Link
              href="/exchange"
              className="group flex transform flex-col items-center justify-center rounded-2xl border border-violet-500/10 bg-slate-950/40 p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-violet-400/40 hover:bg-slate-950/70"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg transition group-hover:scale-110">
                <RefreshCw size={22} />
              </div>

              <span className="text-center text-xs font-black text-slate-200 transition group-hover:text-violet-400">
                {copy.shortcutExchange}
              </span>
            </Link>

            <Link
              href="/admin/dashboard"
              className="group flex transform flex-col items-center justify-center rounded-2xl border border-pink-500/10 bg-slate-950/40 p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-pink-400/40 hover:bg-slate-950/70"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-slate-950 shadow-lg transition group-hover:scale-110">
                <User size={22} />
              </div>

              <span className="text-center text-xs font-black text-slate-200 transition group-hover:text-pink-400">
                {copy.shortcutProfile}
              </span>
            </Link>

            <Link
              href="/settings"
              className="group flex transform flex-col items-center justify-center rounded-2xl border border-slate-700/30 bg-slate-950/40 p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-slate-500/50 hover:bg-slate-950/70"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-slate-600 to-gray-600 text-white shadow-lg transition group-hover:scale-110">
                <Settings size={22} />
              </div>

              <span className="text-center text-xs font-black text-slate-200 transition group-hover:text-slate-400">
                {copy.shortcutSettings}
              </span>
            </Link>
          </div>
        </div>

        <section className="mt-12 rounded-2xl border border-amber-200/15 bg-slate-900/45 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {copy.featuredTitle}
              </h2>

              <p className="text-sm text-amber-50/90">
                {copy.featuredSub}
              </p>
            </div>

            <Link
              href="/marketplace"
              className="rounded-full border border-amber-200/25 bg-amber-200/10 px-3 py-1 text-sm font-semibold text-amber-50 transition hover:bg-amber-200/20 hover:text-white"
            >
              {copy.viewAllProducts}
            </Link>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-white/95">
              {copy.payIn}
            </span>

            {enabledDisplayCurrencies.includes('usd') && (
              <button
                type="button"
                onClick={() => setCurrency('usd')}
                className={`rounded-lg px-3 py-1 font-semibold transition ${
                  displayCurrency === 'usd'
                    ? 'bg-amber-300 text-slate-900 shadow-[0_0_18px_rgba(251,191,36,0.25)]'
                    : 'bg-slate-800/70 text-amber-100 hover:bg-slate-700'
                }`}
              >
                USD
              </button>
            )}

            {enabledDisplayCurrencies.includes('tzs') && (
              <button
                type="button"
                onClick={() => setCurrency('tzs')}
                className={`rounded-lg px-3 py-1 font-semibold transition ${
                  displayCurrency === 'tzs'
                    ? 'bg-amber-100 text-slate-900'
                    : 'bg-slate-800/70 text-amber-50 hover:bg-slate-700'
                }`}
              >
                TZS
              </button>
            )}

            {enabledDisplayCurrencies.includes('ntzs') && (
              <button
                type="button"
                onClick={() => setCurrency('ntzs')}
                className={`rounded-lg px-3 py-1 font-semibold transition ${
                  displayCurrency === 'ntzs'
                    ? 'bg-cyan-200 text-slate-900 shadow-[0_0_18px_rgba(103,232,249,0.24)]'
                    : 'bg-slate-800/70 text-amber-50 hover:bg-slate-700'
                }`}
              >
                nTZS
              </button>
            )}

            {enabledDisplayCurrencies.includes('pi') && (
              <button
                type="button"
                onClick={() => setCurrency('pi')}
                className={`rounded-lg px-3 py-1 font-semibold transition ${
                  displayCurrency === 'pi'
                    ? 'bg-yellow-300 text-slate-900 shadow-[0_0_18px_rgba(253,224,71,0.24)]'
                    : 'bg-slate-800/70 text-amber-100 hover:bg-slate-700'
                }`}
              >
                PI
              </button>
            )}

            <span className="ml-2 rounded-full border border-amber-300/30 bg-amber-500/20 px-3 py-1 text-white">
              {copy.gcvNote}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {featuredProducts.map((product) => {
              const converted = convertAmount(
                product.priceUSD,
                'usd',
                displayCurrency,
              );

              return (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="group flex flex-col rounded-xl border border-white/5 bg-white/5 p-3 transition hover:border-amber-500/20 hover:bg-white/10"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-slate-950">
                    <Image
                      src={getMarketplaceProductImage(product)}
                      alt={product.name}
                      fill
                      className="object-cover transition group-hover:scale-105"
                    />
                  </div>

                  <h3 className="mt-2 line-clamp-1 text-sm font-semibold text-white/90 group-hover:text-amber-300">
                    {product.name}
                  </h3>

                  <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                    <Star
                      size={10}
                      fill="currentColor"
                    />
                    <span>
                      {product.rating.toFixed(1)}
                    </span>
                  </div>

                  <p className="mt-auto pt-2 text-sm font-bold text-amber-300">
                    {formatCurrencyAmount(
                      displayCurrency,
                      converted,
                    )}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-16 text-center">
          <h2 className="bg-gradient-to-r from-white to-amber-200 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl">
            {copy.metricsTitle}
          </h2>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {metrics.map((metric, index) => (
              <div
                key={`${metric.label}-${index}`}
                className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 backdrop-blur-md"
              >
                <p className="text-3xl font-black text-amber-300 sm:text-4xl">
                  {metric.value}
                </p>

                <p className="mt-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <div className="mb-8 flex flex-col items-center justify-center gap-3 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

              {isSw
                ? 'Maoni Hai'
                : 'Live Feedback'}
            </div>

            <h2 className="bg-gradient-to-r from-white to-amber-200 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl">
              {copy.testimonialsTitle}
            </h2>

            <p className="max-w-2xl text-sm text-white/70">
              {isSw
                ? `Inatokana na bidhaa ${liveTestimonialsStats.totalReviews.toLocaleString(
                    'en-US',
                  )} zenye maoni, na wastani wa ${
                    liveTestimonialsStats.averageRating
                  }/5 kutoka marketplace.`
                : `Powered by ${liveTestimonialsStats.totalReviews.toLocaleString(
                    'en-US',
                  )} marketplace reviews with a live ${
                    liveTestimonialsStats.averageRating
                  }/5 average.`}
            </p>

            <Link
              href="/feedback"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-100 transition hover:bg-emerald-400/20"
            >
              <MessageCircle size={14} />
              {copy.testimonialsCta}
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {liveTestimonials.map((testimonial, index) => {
              const isActive =
                index === activeTestimonialIndex;

              return (
                <div
                  key={`${testimonial.name}-${testimonial.productName}`}
                  className={`relative rounded-2xl border p-6 transition duration-500 ${
                    isActive
                      ? 'scale-[1.02] border-emerald-300/40 bg-emerald-400/10 shadow-[0_18px_40px_rgba(16,185,129,0.12)]'
                      : 'border-white/5 bg-white/5 opacity-80'
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      {testimonial.category}
                    </span>

                    <div className="flex items-center gap-1 text-xs font-semibold text-amber-300">
                      <Star
                        size={12}
                        fill="currentColor"
                      />

                      {testimonial.rating.toFixed(1)}
                    </div>
                  </div>

                  <p className="text-sm italic text-gray-300">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>

                  <div className="mt-4">
                    <p className="text-sm font-bold text-amber-300">
                      {testimonial.name}
                    </p>

                    <p className="text-xs text-gray-500">
                      {testimonial.role}
                    </p>

                    <p className="mt-2 text-xs text-white/60">
                      {isSw
                        ? 'Bidhaa inayoongoza:'
                        : 'Leading listing:'}{' '}
                      {testimonial.productName}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent p-6 sm:p-8">
            <h3 className="flex items-center gap-2 text-xl font-bold text-amber-300">
              <ShoppingBag size={20} />
              {copy.nextStep}
            </h3>

            <p className="mt-3 text-sm leading-relaxed text-gray-300">
              {copy.nextStepText}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/wallet"
                className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 transition hover:bg-gray-100"
              >
                <Wallet size={14} />
                {copy.goWallet}
              </Link>

              <Link
                href="/settings"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10"
              >
                {copy.openSettings}
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-sm sm:p-8">
            <h3 className="flex items-center gap-2 text-xl font-bold text-white">
              <ShieldCheck
                size={20}
                className="text-emerald-400"
              />

              {copy.readinessTitle}
            </h3>

            <p className="mt-2 text-sm text-gray-400">
              {copy.readinessText}
            </p>

            <ul className="mt-4 space-y-2 text-xs text-gray-300">
              {copy.readinessItems.map(
                (item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="flex items-center gap-2"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>
        </section>

        <section className="mt-16 rounded-2xl border border-white/5 bg-white/5 p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="md:col-span-1">
              <h2 className="text-2xl font-black text-white">
                {copy.contactTitle}
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                {copy.contactText}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-2">
              <div className="flex items-center gap-3 rounded-xl bg-slate-950 p-4">
                <Mail
                  className="text-amber-300"
                  size={20}
                />

                <div>
                  <p className="text-xs text-gray-500">
                    Email Support
                  </p>

                  <p className="text-sm font-semibold text-white">
                    admin@phclsuper.com
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-slate-950 p-4">
                <Phone
                  className="text-amber-300"
                  size={20}
                />

                <div>
                  <p className="text-xs text-gray-500">
                    Hotline
                  </p>

                  <p className="text-sm font-semibold text-white">
                    +255 693 863 356
                  </p>

                  <p className="text-sm font-semibold text-white">
                    +255 655 599 555
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}