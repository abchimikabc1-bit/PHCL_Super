"use client";

import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowRightLeft, TrendingUp, Coins } from 'lucide-react';
import { CurrencyExchanger } from '@/components/currency-exchanger';
import { getExchangeRate } from '@/lib/currency-converter';
import { CURRENCIES } from '@/lib/currencies';
import { useLanguage } from '@/hooks/use-language';
import { PI_GCV_USD } from '@/components/marketplace/currency-utils';

const POPULAR_CODES = ['BTC', 'ETH', 'USDT', 'SOL', 'XRP', 'ADA', 'DOGE', 'PI'] as const;

export default function ExchangePage() {
  const { language } = useLanguage();
  const isSw = language === 'sw';

  const copy = isSw
    ? {
        badge: 'Kituo cha Exchange',
        title: 'Exchange & Converter',
        subtitle:
          'Badilisha sarafu kwa haraka kati ya crypto na fiat. Tumeweka sarafu maarufu kama BTC, ETH, USDT, SOL, XRP, ADA, DOGE na PI.',
        backMarketplace: 'Rudi Marketplace',
        openWallet: 'Fungua Wallet',
        converterTitle: 'Converter ya Sarafu',
        converterSub: 'Chagua sarafu unayotuma na unayopokea, kisha linganisha rate papo hapo.',
        popularTitle: 'Sarafu Maarufu Tunazopendekeza',
        popularSub: 'Pendekezo la kuanza kwa biashara, kubadilisha, au kufuatilia bei.',
        whyTitle: 'Kwa nini hizi?',
        whyItems: [
          'BTC na ETH zina liquidity kubwa duniani.',
          'USDT ni stablecoin maarufu kwa kuhifadhi thamani ya muda mfupi.',
          'SOL, XRP, ADA, DOGE zina matumizi makubwa kwenye trading ya kila siku.',
          'PI ina umuhimu wa kipekee kwenye ecosystem ya PHCL Super.',
        ],
        approxRate: 'Kadirio: 1 USD ≈',
        gcvAnchor: 'Kiwango Maalum cha PI (GCV)',
        gcvText: '1 PI =',
        gcvSuffix: 'GCV',
      }
    : {
        badge: 'Exchange Hub',
        title: 'Exchange & Converter',
        subtitle:
          'Convert quickly between crypto and fiat. We included popular assets like BTC, ETH, USDT, SOL, XRP, ADA, DOGE, and PI.',
        backMarketplace: 'Back to Marketplace',
        openWallet: 'Open Wallet',
        converterTitle: 'Currency Converter',
        converterSub: 'Select the send and receive currency and compare rates instantly.',
        popularTitle: 'Popular Currencies We Recommend',
        popularSub: 'A strong starter mix for trading, conversion, and daily price tracking.',
        whyTitle: 'Why these picks?',
        whyItems: [
          'BTC and ETH provide deep global liquidity.',
          'USDT is a widely used stablecoin for short-term value parking.',
          'SOL, XRP, ADA, and DOGE are actively traded and easy to track.',
          'PI is strategically important for the PHCL Super ecosystem.',
        ],
        approxRate: 'Approx: 1 USD ≈',
        gcvAnchor: 'PI Official Anchor (GCV)',
        gcvText: '1 PI =',
        gcvSuffix: 'GCV',
      };

  const popularCurrencies = useMemo(() => {
    return POPULAR_CODES.map((code) => {
      const info = CURRENCIES[code];
      const rate = getExchangeRate('USD', code);
      return {
        code,
        name: info?.name || code,
        symbol: info?.symbol || code,
        type: info?.type || 'crypto',
        rate,
      };
    });
  }, []);

  const formatRate = (code: string, rate: number) => {
    if (!Number.isFinite(rate)) return '-';
    if (code === 'BTC' || code === 'ETH') return rate.toFixed(8);
    if (rate < 1) return rate.toFixed(6);
    return rate.toLocaleString('en-US', { maximumFractionDigits: 4 });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#0f172a] to-[#1f1147] pb-20 text-white">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes exchange-aurora {
              0% { box-shadow: 0 0 0 rgba(168,85,247,0.0), 0 18px 40px rgba(76,29,149,0.22); }
              50% { box-shadow: 0 0 28px rgba(34,211,238,0.16), 0 20px 44px rgba(76,29,149,0.28); }
              100% { box-shadow: 0 0 0 rgba(168,85,247,0.0), 0 18px 40px rgba(76,29,149,0.22); }
            }

            @keyframes exchange-shimmer {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }

            .exchange-lux-panel {
              animation: exchange-aurora 7s ease-in-out infinite;
            }

            .exchange-lux-card {
              background-size: 200% 200%;
              animation: exchange-shimmer 9s ease-in-out infinite;
              transition: transform 180ms ease, border-color 180ms ease;
            }

            .exchange-lux-card:hover {
              transform: translateY(-2px);
            }

            @media (prefers-reduced-motion: reduce) {
              .exchange-lux-panel,
              .exchange-lux-card {
                animation: none !important;
              }
            }
          `,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.3),transparent_32%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_bottom_center,rgba(251,191,36,0.1),transparent_26%)]" />

      <section className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/35 bg-violet-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-100">
              <ArrowRightLeft size={14} />
              {copy.badge}
            </div>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">{copy.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-violet-50/90 sm:text-base">{copy.subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/marketplace"
              className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-violet-50 hover:bg-white/20"
            >
              {copy.backMarketplace}
            </Link>
            <Link
              href="/wallet"
              className="rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              {copy.openWallet}
            </Link>
          </div>
        </div>

        <div className="exchange-lux-panel rounded-2xl border border-violet-200/25 bg-gradient-to-br from-slate-900/70 via-[#1b1337]/70 to-[#102437]/70 p-5 sm:p-6 shadow-[0_20px_50px_rgba(76,29,149,0.25)] global-glass">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-300/15 px-3 py-1 text-xs font-bold text-amber-100">
            <span>{copy.gcvAnchor}</span>
            <span className="h-1 w-1 rounded-full bg-amber-300" />
            <span>{copy.gcvText} ${PI_GCV_USD.toLocaleString('en-US')} {copy.gcvSuffix}</span>
          </div>

          <h2 className="text-xl font-bold text-violet-100">{copy.converterTitle}</h2>
          <p className="mt-1 text-sm text-violet-50/85">{copy.converterSub}</p>

          <div className="mt-4">
            <CurrencyExchanger
              initialAmount={100}
              initialFromCurrency="USD"
              initialToCurrency="BTC"
              showFavorites
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="exchange-lux-panel rounded-2xl border border-cyan-200/25 bg-gradient-to-br from-slate-900/70 via-[#12263a]/70 to-[#1a3a4a]/70 p-5 shadow-[0_16px_40px_rgba(6,95,120,0.25)] global-glass">
            <div className="mb-3 flex items-center gap-2 text-cyan-100">
              <Coins size={18} />
              <h3 className="text-lg font-bold">{copy.popularTitle}</h3>
            </div>
            <p className="mb-4 text-sm text-cyan-50/85">{copy.popularSub}</p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {popularCurrencies.map((entry) => (
                <div key={entry.code} className="exchange-lux-card rounded-xl border border-white/10 bg-gradient-to-br from-white/8 via-white/5 to-cyan-300/5 p-3">
                  <p className="text-sm font-bold text-white">{entry.code}</p>
                  <p className="text-xs text-cyan-100/90">{entry.name}</p>
                  <p className="mt-2 text-xs text-cyan-200/90">
                    {entry.code === 'PI'
                      ? `${copy.gcvText} $${PI_GCV_USD.toLocaleString('en-US')} ${copy.gcvSuffix}`
                      : `${copy.approxRate} ${formatRate(entry.code, entry.rate)} ${entry.code}`}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="exchange-lux-panel rounded-2xl border border-emerald-200/25 bg-gradient-to-br from-slate-900/70 via-[#1a2b37]/70 to-[#153326]/70 p-5 shadow-[0_16px_40px_rgba(5,150,105,0.2)] global-glass">
            <div className="mb-3 flex items-center gap-2 text-emerald-100">
              <TrendingUp size={18} />
              <h3 className="text-lg font-bold">{copy.whyTitle}</h3>
            </div>
            <ul className="space-y-2 text-sm text-emerald-50/90">
              {copy.whyItems.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}
