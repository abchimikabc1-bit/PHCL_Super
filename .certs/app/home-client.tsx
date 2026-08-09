'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Wallet,
  ShoppingBag,
  MessageCircle,
  Sparkles,
  Mail,
  Phone,
  MapPin,
  Star,
} from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { useDisplayCurrency } from '@/hooks/use-display-currency';
import { getMarketplaceProductImage, MARKETPLACE_PRODUCTS } from '@/lib/marketplace-products';
import { PI_GCV_USD, convertAmount, formatCurrencyAmount } from '@/components/marketplace/currency-utils';

export default function HomeClient() {
  const { language, switchLanguage, mounted } = useLanguage();
  const { displayCurrency, setCurrency, enabledDisplayCurrencies } = useDisplayCurrency('usd');
  const isSw = mounted && language === 'sw';
  const [activeTestimonialIndex, setActiveTestimonialIndex] = useState(0);

  const copy = {
    badge: isSw ? 'Jukwaa la PHCL Super' : 'PHCL Super Platform',
    title: isSw ? 'Karibu PHCL Super' : 'Welcome to PHCL Super',
    subtitle: isSw
      ? 'Jenga uchumi wako vya kidijitali sehemu moja. Fanya biashara kwa akili, simamia fedha zako salama, na ungana na jamii kupitia mfumo wa kisasa wenye kasi.'
      : 'Build your digital economy in one place. Trade smarter, manage funds safely, and connect with the community through a modern experience built for speed.',
    ctaMarketplace: isSw ? 'Fungua Marketplace' : 'Open Marketplace',
    ctaChat: isSw ? 'Jiunge na Chat ya Jamii' : 'Join Community Chat',
    ctaExchange: isSw ? 'Fungua Exchange' : 'Open Exchange',
    nextStep: isSw ? 'Hatua inayofuata' : 'Next step',
    nextStepText: isSw
      ? 'Anza na Marketplace, kisha unganisha wallet yako na rekebisha settings ili ukamilishe usanidi wa PHCL Super.'
      : 'Start with Marketplace, then connect your wallet and customize settings to complete your PHCL Super setup.',
    goWallet: isSw ? 'Nenda Wallet' : 'Go to Wallet',
    openSettings: isSw ? 'Fungua Settings' : 'Open Settings',
    createAccount: isSw ? 'Fungua Akaunti' : 'Create Account',
    partnersTitle: isSw ? 'Washirika Wanaoaminiwa' : 'Trusted Partners',
    partnersText: isSw
      ? 'Tunashirikiana na timu na mifumo inayoaminika ili kutoa huduma imara kwa watumiaji wa Tanzania na kimataifa.'
      : 'We collaborate with reliable teams and infrastructures to deliver dependable service for users in Tanzania and globally.',
    contactTitle: isSw ? 'Wasiliana Nasi' : 'Contact Us',
    contactText: isSw
      ? 'Kwa usaidizi wa haraka, timu yetu iko tayari kukusaidia kupitia barua pepe au simu.'
      : 'For fast support, our team is ready to assist you by email or phone.',
    localeLabel: isSw ? 'Lugha' : 'Language',
    metricsTitle: isSw ? 'Mafanikio kwa Takwimu' : 'Performance by Numbers',
    testimonialsTitle: isSw ? 'Maoni ya Wateja' : 'What Users Say',
    testimonialsCta: isSw ? 'Toa Maoni Yako' : 'Leave Your Feedback',
    featuredTitle: isSw ? 'Bidhaa Maarufu' : 'Featured Products',
    featuredSub: isSw ? 'Bidhaa zenye rating za juu kutoka marketplace yetu.' : 'Top-rated picks from our marketplace.',
    viewAllProducts: isSw ? 'Tazama Bidhaa Zote' : 'View All Products',
    payIn: isSw ? 'Lipa kwa' : 'Pay in',
    gcvNote: isSw
      ? `Kiwango cha GCV: 1 PI = $${PI_GCV_USD.toLocaleString('en-US')}`
      : `GCV rate: 1 PI = $${PI_GCV_USD.toLocaleString('en-US')}`,
    globalReach: isSw ? 'TAYARI KWA SOKO LA DUNIA' : 'READY FOR GLOBAL MARKETS',
    globalReachText: isSw
      ? 'Tanzania • East Africa • Global trade lanes'
      : 'Tanzania • East Africa • Global trade lanes',
    readinessTitle: isSw ? 'Tayari Kuhudumia' : 'Ready to Serve',
    readinessText: isSw
      ? 'PHCL Super imeandaliwa kwa onboarding, marketplace, checkout yenye consent, na support routes wazi kwa matumizi ya kila siku.'
      : 'PHCL Super is prepared for onboarding, marketplace activity, consent-aware checkout, and clear support routes for daily use.',
    readinessItems: isSw
      ? ['Signup yenye sera za lazima', 'Marketplace na product pages tayari', 'Checkout na legal consent enforcement', 'Privacy, terms, na settings links wazi']
      : ['Signup with mandatory policy consent', 'Marketplace and product pages ready', 'Checkout with enforced legal consent', 'Privacy, terms, and settings links available'],
    readinessCta: isSw ? 'Anza Safari Yako' : 'Start Your Journey',
  };

  const metrics = [
    { value: '25K+', label: isSw ? 'Watumiaji Waliosajiliwa' : 'Registered Users' },
    { value: '120K+', label: isSw ? 'Miamala ya Kila Mwezi' : 'Monthly Transactions' },
    { value: '99.9%', label: isSw ? 'Uwepo wa Mfumo' : 'Platform Uptime' },
    { value: '<2m', label: isSw ? 'Muda wa Majibu ya Support' : 'Support Response Time' },
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
          role: `${product.category} • ${product.reviews.toLocaleString('en-US')} ${isSw ? 'maoni' : 'reviews'} • ${product.rating.toFixed(1)}/5`,
          quote: recommendation,
          rating: product.rating,
          reviews: product.reviews,
          productName: product.name,
          category: product.category,
        };
      });
  }, [isSw]);

  useEffect(() => {
    if (liveTestimonials.length === 0) return;

    const interval = window.setInterval(() => {
      setActiveTestimonialIndex((current) => (current + 1) % liveTestimonials.length);
    }, 4500);

    return () => window.clearInterval(interval);
  }, [liveTestimonials.length]);

  const liveTestimonialsStats = useMemo(() => {
    const totalReviews = liveTestimonials.reduce((sum, item) => sum + item.reviews, 0);
    const averageRating = liveTestimonials.length
      ? (liveTestimonials.reduce((sum, item) => sum + item.rating, 0) / liveTestimonials.length).toFixed(1)
      : '0.0';

    return { totalReviews, averageRating };
  }, [liveTestimonials]);

  const featuredProducts = MARKETPLACE_PRODUCTS.slice(0, 6);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] text-white">
      {/* Msimbo wa CSS kwa ajili ya kuifanya bendera ipepee kama upepo halisi (Waving Flag) */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes cloth-sway {
          0% { transform: perspective(980px) rotateY(0deg) rotateZ(0deg) translateY(0px); }
          25% { transform: perspective(980px) rotateY(-7deg) rotateZ(-0.7deg) translateY(-1px); }
          50% { transform: perspective(980px) rotateY(5deg) rotateZ(0.5deg) translateY(1px); }
          75% { transform: perspective(980px) rotateY(-4deg) rotateZ(-0.4deg) translateY(-1px); }
          100% { transform: perspective(980px) rotateY(0deg) rotateZ(0deg) translateY(0px); }
        }
        .animate-flag-wave {
          animation: cloth-sway 2.6s ease-in-out infinite;
          transform-origin: left center;
          will-change: transform;
        }
      `}} />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_22%),radial-gradient(circle_at_bottom_center,rgba(245,158,11,0.12),transparent_25%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-amber-300/10 to-transparent" />
      
      <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <div className="sticky top-2 z-40 mb-6 rounded-xl border border-amber-200/30 bg-slate-900/80 p-2 backdrop-blur md:hidden global-glass">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Link href="/marketplace" className="rounded-lg bg-amber-300 px-3 py-2 text-center font-semibold text-slate-900">
              {copy.ctaMarketplace}
            </Link>
            <Link href="/chat" className="rounded-lg border border-amber-200/30 bg-amber-200/20 px-3 py-2 text-center font-semibold text-amber-50 hover:bg-amber-200/30">
              {copy.ctaChat}
            </Link>
            <Link href="/wallet" className="rounded-lg border border-amber-200/30 bg-white/10 px-3 py-2 text-center font-semibold text-white hover:bg-white/20">
              {copy.goWallet}
            </Link>
            <Link href="/exchange" className="rounded-lg border border-violet-200/40 bg-violet-300/20 px-3 py-2 text-center font-semibold text-violet-50 hover:bg-violet-300/30">
              {copy.ctaExchange}
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/35 bg-amber-200/15 px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-[0_0_20px_rgba(251,191,36,0.25)] global-shimmer ink-glow">
            <Sparkles size={14} />
            {copy.badge}
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200/35 bg-white/8 p-1 text-xs font-semibold text-white global-glass">
            <span className="px-2 opacity-90 text-amber-50">{copy.localeLabel}</span>
            <button
              type="button"
              onClick={() => switchLanguage('en')}
              className={`rounded-lg px-3 py-1 transition ${!isSw ? 'bg-amber-300 text-slate-900' : 'hover:bg-white/10 text-white'}`}
            >
              🇬🇧 EN
            </button>
            <button
              type="button"
              onClick={() => switchLanguage('sw')}
              className={`rounded-lg px-3 py-1 transition ${isSw ? 'bg-amber-300 text-slate-900' : 'hover:bg-white/10 text-white'}`}
            >
              🇹🇿 SW
            </button>
          </div>
        </div>

        <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white global-glass ink-soft">
          {copy.globalReach}
          <span className="h-1 w-1 rounded-full bg-amber-300" />
          {copy.globalReachText}
        </div>

        <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl bg-gradient-to-r from-amber-100 via-white to-amber-200 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(251,191,36,0.14)]">{copy.title}</h1>
        
        <p className="mt-5 max-w-2xl text-base text-white/95 sm:text-lg ink-soft">{copy.subtitle}</p>

        <div className="mt-8 hidden flex-wrap gap-3 md:flex">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:from-amber-200 hover:to-yellow-300 shadow-[0_16px_36px_rgba(251,191,36,0.28)]"
          >
            {copy.ctaMarketplace}
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200/40 bg-amber-200/15 px-5 py-3 text-sm font-semibold text-amber-50 transition hover:-translate-y-0.5 hover:bg-amber-200/25 shadow-[0_16px_30px_rgba(251,191,36,0.16)]"
          >
            {copy.ctaChat}
            <MessageCircle size={16} />
          </Link>
          <Link
            href="/exchange"
            className="inline-flex items-center gap-2 rounded-xl border border-violet-200/40 bg-violet-300/15 px-5 py-3 text-sm font-semibold text-violet-100 transition hover:-translate-y-0.5 hover:bg-violet-300/25 shadow-[0_16px_30px_rgba(167,139,250,0.2)]"
          >
            {copy.ctaExchange}
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* FEATURED PRODUCTS SECTION */}
        <section className="mt-12 rounded-2xl border border-amber-200/15 bg-slate-900/45 p-5 sm:p-6 global-glass">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">{copy.featuredTitle}</h2>
              <p className="text-sm text-amber-50/90">{copy.featuredSub}</p>
            </div>
            <Link href="/marketplace" className="rounded-full border border-amber-200/25 bg-amber-200/10 px-3 py-1 text-sm font-semibold text-amber-50 transition hover:bg-amber-200/20 hover:text-white">
              {copy.viewAllProducts}
            </Link>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-white/95">{copy.payIn}</span>
            {enabledDisplayCurrencies.includes('usd') && (
              <button
                type="button"
                onClick={() => setCurrency('usd')}
                className={`rounded-lg px-3 py-1 font-semibold transition ${displayCurrency === 'usd' ? 'bg-amber-300 text-slate-900 shadow-[0_0_18px_rgba(251,191,36,0.25)]' : 'bg-slate-800/70 text-amber-100 hover:bg-slate-700'}`}
              >
                USD
              </button>
            )}
            {enabledDisplayCurrencies.includes('tzs') && (
              <button
                type="button"
                onClick={() => setCurrency('tzs')}
                className={`rounded-lg px-3 py-1 font-semibold transition ${displayCurrency === 'tzs' ? 'bg-amber-100 text-slate-900 shadow-[0_0_18px_rgba(255,255,255,0.18)]' : 'bg-slate-800/70 text-amber-50 hover:bg-slate-700'}`}
              >
                TZS
              </button>
            )}
            {enabledDisplayCurrencies.includes('ntzs') && (
              <button
                type="button"
                onClick={() => setCurrency('ntzs')}
                className={`rounded-lg px-3 py-1 font-semibold transition ${displayCurrency === 'ntzs' ? 'bg-cyan-200 text-slate-900 shadow-[0_0_18px_rgba(103,232,249,0.24)]' : 'bg-slate-800/70 text-amber-50 hover:bg-slate-700'}`}
              >
                nTZS
              </button>
            )}
            {enabledDisplayCurrencies.includes('pi') && (
              <button
                type="button"
                onClick={() => setCurrency('pi')}
                className={`rounded-lg px-3 py-1 font-semibold transition ${displayCurrency === 'pi' ? 'bg-yellow-300 text-slate-900 shadow-[0_0_18px_rgba(253,224,71,0.24)]' : 'bg-slate-800/70 text-amber-100 hover:bg-slate-700'}`}
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
              const converted = convertAmount(product.priceUSD, 'usd', displayCurrency);
              return (
                <Link
                  key={product.id}
                  href={`/marketplace/product/${product.id}`}
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
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-400">
                    <Star size={10} fill="currentColor" />
                    <span>{product.rating.toFixed(1)}</span>
                  </div>
                  <p className="mt-auto pt-2 text-sm font-bold text-amber-300">
                    {formatCurrencyAmount(displayCurrency, converted)}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* METRICS SECTION */}
        <section className="mt-16 text-center">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl bg-gradient-to-r from-white to-amber-200 bg-clip-text text-transparent">{copy.metricsTitle}</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {metrics.map((metric, idx) => (
              <div key={idx} className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 backdrop-blur-md">
                <p className="text-3xl font-black text-amber-300 sm:text-4xl">{metric.value}</p>
                <p className="mt-2 text-xs font-medium text-gray-400 uppercase tracking-wider">{metric.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS SECTION */}
        <section className="mt-16">
          <div className="mb-8 flex flex-col items-center justify-center gap-3 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)] animate-pulse" />
              {isSw ? 'Maoni Hai' : 'Live Feedback'}
            </div>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl bg-gradient-to-r from-white to-amber-200 bg-clip-text text-transparent">
              {copy.testimonialsTitle}
            </h2>
            <p className="max-w-2xl text-sm text-white/70">
              {isSw
                ? `Inatokana na bidhaa ${liveTestimonialsStats.totalReviews.toLocaleString('en-US')} zenye maoni, na wastani wa ${liveTestimonialsStats.averageRating}/5 kutoka marketplace.`
                : `Powered by ${liveTestimonialsStats.totalReviews.toLocaleString('en-US')} marketplace reviews with a live ${liveTestimonialsStats.averageRating}/5 average.`}
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
            {liveTestimonials.map((t, idx) => {
              const isActive = idx === activeTestimonialIndex;
              return (
                <div
                  key={`${t.name}-${t.productName}`}
                  className={`rounded-2xl border p-6 relative transition duration-500 ${isActive ? 'border-emerald-300/40 bg-emerald-400/10 shadow-[0_18px_40px_rgba(16,185,129,0.12)] scale-[1.02]' : 'border-white/5 bg-white/5 opacity-80'}`}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      {t.category}
                    </span>
                    <div className="flex items-center gap-1 text-amber-300 text-xs font-semibold">
                      <Star size={12} fill="currentColor" />
                      {t.rating.toFixed(1)}
                    </div>
                  </div>
                  <p className="text-sm italic text-gray-300">"{t.quote}"</p>
                  <div className="mt-4">
                    <p className="text-sm font-bold text-amber-300">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                    <p className="mt-2 text-xs text-white/60">
                      {isSw ? 'Bidhaa inayoongoza:' : 'Leading listing:'} {t.productName}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* NEXT STEPS & READINESS */}
        <section className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent p-6 sm:p-8">
            <h3 className="text-xl font-bold text-amber-300 flex items-center gap-2">
              <ShoppingBag size={20} />
              {copy.nextStep}
            </h3>
            <p className="mt-3 text-sm text-gray-300 leading-relaxed">{copy.nextStepText}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/wallet" className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 hover:bg-gray-100 transition flex items-center gap-1.5">
                <Wallet size={14} />
                {copy.goWallet}
              </Link>
              <Link href="/settings" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition">
                {copy.openSettings}
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 sm:p-8 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck size={20} className="text-emerald-400" />
              {copy.readinessTitle}
            </h3>
            <p className="mt-2 text-sm text-gray-400">{copy.readinessText}</p>
            <ul className="mt-4 space-y-2 text-xs text-gray-300">
              {copy.readinessItems.map((item, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CONTACT SECTION */}
        <section className="mt-16 rounded-2xl border border-white/5 bg-white/5 p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="md:col-span-1">
              <h2 className="text-2xl font-black text-white">{copy.contactTitle}</h2>
              <p className="mt-2 text-sm text-gray-400">{copy.contactText}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-2">
              <div className="flex items-center gap-3 rounded-xl bg-slate-950 p-4">
                <Mail className="text-amber-300" size={20} />
                <div>
                  <p className="text-xs text-gray-500">Email Support</p>
                  <p className="text-sm font-semibold text-white">admin@phclsuper.com</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-slate-950 p-4">
                <Phone className="text-amber-300" size={20} />
                <div>
                  <p className="text-xs text-gray-500">Hotline</p>
                  <p className="text-sm font-semibold text-white">+255 693 863 356</p>
                  <p className="text-sm font-semibold text-white">+255 655 599 555</p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </section>
    </main>
  );
}