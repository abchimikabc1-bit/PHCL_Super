import Link from 'next/link';
import { ArrowRight, MessageCircle, ShoppingBag, Wallet, CandlestickChart, ShieldCheck, Globe2 } from 'lucide-react';

const quickLinks = [
  {
    href: '/chat',
    title: 'AI Chat Assistant',
    description: 'Pata msaada wa haraka kuhusu huduma zote za PHCL.',
    icon: MessageCircle,
  },
  {
    href: '/wallet',
    title: 'Wallet',
    description: 'Simamia assets zako, deposit, transfer na withdraw.',
    icon: Wallet,
  },
  {
    href: '/marketplace',
    title: 'Marketplace',
    description: 'Nunua bidhaa mbalimbali kwa mfumo wa kisasa.',
    icon: ShoppingBag,
  },
  {
    href: '/exchange',
    title: 'Exchange',
    description: 'Badilisha thamani ya fedha na fuatilia bei za crypto.',
    icon: CandlestickChart,
  },
];

export default function WelcomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-purple-100 text-slate-900">
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <p className="mb-4 inline-flex rounded-full bg-purple-100 px-4 py-1 text-sm font-semibold text-purple-700">
            Karibu PHCL Super
          </p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Welcome to PHCL Super
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Tovuti hii inaunganisha marketplace, wallet, exchange na huduma za usaidizi wa AI
            katika muonekano mmoja ulio bora zaidi kwa watumiaji wa sasa.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-full bg-purple-700 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-purple-800"
            >
              Start with Chat
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/splash"
              className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white px-6 py-3 font-semibold text-purple-700 transition hover:bg-purple-50"
            >
              View Splash Again
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
              <div className="text-2xl font-black text-purple-700">50K+</div>
              <p className="mt-1 text-sm text-slate-600">Users served across trading and shopping journeys.</p>
            </div>
            <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
              <div className="text-2xl font-black text-purple-700">24/7</div>
              <p className="mt-1 text-sm text-slate-600">Support and self-service access through AI and wallet tools.</p>
            </div>
            <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
              <div className="text-2xl font-black text-purple-700">Multi-Service</div>
              <p className="mt-1 text-sm text-slate-600">Chat, wallet, exchange and marketplace in one flow.</p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-xl rounded-[2rem] border border-purple-100 bg-white p-8 shadow-xl shadow-purple-100">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-3xl font-black text-white">
              π
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-purple-500">Pi Hub Company Limited</p>
              <h2 className="text-2xl font-bold text-slate-900">Your launch point</h2>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex gap-3 rounded-2xl bg-purple-50 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-purple-700" />
              <p className="text-sm text-slate-700">Muundo huu wa welcome na splash umeongezwa kama routes mpya, hivyo haujagusa home ya sasa.</p>
            </div>
            <div className="flex gap-3 rounded-2xl bg-purple-50 p-4">
              <Globe2 className="mt-0.5 h-5 w-5 text-purple-700" />
              <p className="text-sm text-slate-700">Unaweza kuendelea kujaza maboresho juu yake bila kugongana na route kuu ya sasa.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Quick actions</h2>
          <p className="mt-2 text-slate-600">Hapa ndipo tulipoanzia kurudisha vitu vilivyoondolewa: splash na welcome flow.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map(({ href, title, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-3xl border border-purple-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-purple-700">
                Open
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
