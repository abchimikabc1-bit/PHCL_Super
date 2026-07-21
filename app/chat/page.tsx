import Link from 'next/link';
import VoiceAccessibility from './voice-accessibility';

export default async function ChatPage({
  searchParams,
}: {
  searchParams?: Promise<{ voice?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const autoStartVoice = params.voice === '1';

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_22%),radial-gradient(circle_at_bottom_center,rgba(245,158,11,0.12),transparent_25%)]" />
      <section className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-amber-300/30 bg-amber-200/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100">
              Live Community
            </div>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Community Chat</h1>
            <p className="mt-2 max-w-2xl text-sm text-amber-50/85 sm:text-base">
              Connect with buyers, sellers, and the PHCL Super support team in one fast communication channel.
            </p>
          </div>
          <Link href="/" className="rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_16px_36px_rgba(251,191,36,0.24)] transition hover:-translate-y-0.5 hover:from-amber-200 hover:to-yellow-300">Back Home</Link>
        </div>

        <div className="rounded-2xl border border-amber-200/15 bg-slate-900/45 p-6 global-glass">
          <p className="text-amber-50/95 ink-soft">Chat room is active. Connect with the PHCL Super community and support team here.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-amber-300/20 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-amber-100/80">Support lane</p>
              <p className="mt-2 text-sm text-white/90">Reach the team faster for order, wallet, and account help.</p>
            </div>
            <div className="rounded-xl border border-amber-300/20 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-amber-100/80">Community lane</p>
              <p className="mt-2 text-sm text-white/90">Share product updates, feedback, and business opportunities.</p>
            </div>
            <div className="rounded-xl border border-amber-300/20 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-amber-100/80">Instant flow</p>
              <p className="mt-2 text-sm text-white/90">Keep conversations moving without leaving the PHCL Super experience.</p>
            </div>
          </div>
        </div>

        <VoiceAccessibility autoStartVoice={autoStartVoice} />
      </section>
    </main>
  );
}
