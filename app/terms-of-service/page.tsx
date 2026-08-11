'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

const EFFECTIVE_DATE = 'May 2026';
const LAST_UPDATED = 'August 2026';

export default function TermsOfServicePage() {
  const [language, setLanguage] = useState<'en' | 'sw'>('sw');

  const isEnglish = language === 'en';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-950 to-slate-900 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-yellow-500/20 bg-purple-950/85 p-4 shadow-md backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="font-bold text-yellow-400 transition hover:opacity-80"
          >
            ← {isEnglish ? 'Back' : 'Nyuma'}
          </button>

          <h2 className="text-xl font-bold text-white">
            {isEnglish ? 'Terms of Service' : 'Masharti ya Huduma'}
          </h2>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLanguage(isEnglish ? 'sw' : 'en')}
              className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-400 transition hover:bg-yellow-500/20"
            >
              {isEnglish ? 'SW' : 'EN'}
            </button>

            <Link
              href="/privacy-policy"
              className="rounded-lg border border-yellow-500/30 bg-yellow-500/20 px-3 py-2 text-xs font-semibold text-yellow-400 transition hover:bg-yellow-500/30"
            >
              {isEnglish ? 'Privacy Policy' : 'Sera ya Faragha'}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="space-y-8">
          <div className="border-b border-white/10 pb-6">
            <h1 className="bg-gradient-to-r from-yellow-200 to-white bg-clip-text text-4xl font-black text-transparent drop-shadow-[0_0_15px_rgba(234,179,8,0.2)]">
              {isEnglish ? 'Terms of Service' : 'Masharti ya Huduma ya PHCL Super'}
            </h1>

            <div className="mt-3 space-y-1 text-sm text-gray-400">
              <p>
                <strong className="text-slate-200">
                  {isEnglish ? 'Effective date:' : 'Tarehe ya kuanza kutumika:'}
                </strong>{' '}
                {EFFECTIVE_DATE}
              </p>
              <p>
                <strong className="text-slate-200">
                  {isEnglish ? 'Last updated:' : 'Ilisasishwa mwisho:'}
                </strong>{' '}
                {LAST_UPDATED}
              </p>
            </div>
          </div>

          <Card className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur-md">
            <CardContent className="prose prose-invert max-w-none space-y-8 px-6 pt-8 text-gray-300 sm:px-8">
              {isEnglish ? (
                <div className="space-y-6">
                  <section>
                    <h2 className="mb-3 text-2xl font-bold text-yellow-400">1. Agreement to Terms</h2>
                    <p className="leading-relaxed">
                      By accessing and using PHCL Super (&quot;Platform&quot;), you agree to be bound by these
                      Terms of Service. If you do not agree to abide by the above, please do not use this
                      service. Pi Hub Company Limited reserves the right to update or change the Terms of
                      Service at any time.
                    </p>
                  </section>

                  <section>
                    <h2 className="mb-3 text-2xl font-bold text-yellow-400">2. Eligibility & Verification</h2>
                    <p className="leading-relaxed">
                      You must be at least 18 years old to use PHCL Super. By using the Platform, you represent
                      and warrant that you meet all eligibility requirements. To prevent financial fraud, PHCL
                      Super reserves the right to request identity verification (KYC) at any time.
                    </p>
                  </section>

                  <section>
                    <h2 className="mb-3 text-2xl font-bold text-yellow-400">3. Account Security & Responsibility</h2>
                    <p className="leading-relaxed">
                      You are responsible for maintaining the absolute confidentiality of your account
                      credentials, passwords, and wallet keys. You agree to accept full responsibility for all
                      transactions that occur under your account. Any unauthorized use must be reported to our
                      security team immediately.
                    </p>
                  </section>

                  <section>
                    <h2 className="mb-3 text-2xl font-bold text-yellow-400">4. Trading & Financial Risks</h2>
                    <div className="space-y-3">
                      <p className="leading-relaxed">
                        Cryptocurrency trading involves substantial risk of financial loss. We do not provide
                        financial, investment, or legal advice. You acknowledge that:
                      </p>
                      <ul className="list-disc space-y-2 pl-6">
                        <li>You understand the high volatility of cryptocurrency markets.</li>
                        <li>You are solely responsible for all transaction and trading decisions.</li>
                        <li>PHCL Super and Pi Hub Company Limited shall not be liable for any trading losses.</li>
                      </ul>
                    </div>
                  </section>

                  <section>
                    <h2 className="mb-3 text-2xl font-bold text-yellow-400">
                      5. Prohibited Activities & Financial Integrity
                    </h2>
                    <p className="mb-3 leading-relaxed">
                      You agree not to engage in any of the following prohibited activities:
                    </p>
                    <ul className="list-disc space-y-2 pl-6">
                      <li>Violating any applicable local or international laws or regulations.</li>
                      <li>Engaging in fraud, market manipulation, or money laundering.</li>
                      <li>Attempting to bypass platform security, APIs, or database integrity.</li>
                      <li>Using unauthorized automated scripts or bots (protected by App Check).</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="mb-3 text-2xl font-bold text-yellow-400">6. Limitation of Liability</h2>
                    <p className="leading-relaxed">
                      To the fullest extent permitted by law, PHCL Super and Pi Hub Company Limited shall not
                      be liable for any indirect, incidental, special, or consequential damages, including but
                      not limited to lost profits, lost funds, or transaction failures due to network delays.
                    </p>
                  </section>

                  <section>
                    <h2 className="mb-3 text-2xl font-bold text-yellow-400">
                      7. Payments, Refunds, & Dispute Resolution
                    </h2>
                    <p className="leading-relaxed">
                      Order fulfillment and refunds depend on product type, delivery status, and verified
                      ledger records. Parties agree to attempt good-faith resolution through our support
                      channels before pursuing formal legal remedies under the laws of the United Republic of
                      Tanzania.
                    </p>
                  </section>

                  <section>
                    <h2 className="mb-3 text-2xl font-bold text-yellow-400">8. Security Contact Information</h2>
                    <p className="leading-relaxed">
                      For any questions regarding these Terms, Security, or Compliance, please contact us at:
                    </p>
                    <div className="mt-3 space-y-2 rounded-xl border border-yellow-500/20 bg-purple-950/50 p-4">
                      <p><strong>Support Email:</strong> support@phclsuper.com</p>
                      <p><strong>Official Phone:</strong> +255 693 863 356</p>
                      <p><strong>Corporate Address:</strong> Dar es Salaam, Tanzania</p>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="space-y-6">
                  <section>
                    <h2 className="mb-3 text-2xl font-bold text-yellow-400">1. Kukubaliana na Masharti</h2>
                    <p className="leading-relaxed">
                      Kwa kufikia na kutumia PHCL Super (&quot;Jukwaa&quot;), unakubali kuwa umefungwa na
                      Masharti haya ya Huduma. Kama haukubaliani na sheria hizi, tafadhali usitumie huduma hii.
                      Pi Hub Company Limited inahifadhi haki ya kusasisha au kubadili Masharti haya ya Huduma
                      wakati wowote.
                    </p>
                  </section>

                  <section>
                    <h2 className="mb-3 text-2xl font-bold text-yellow-400">
                      2. Sifa za Kujiunga na Ustahiki wa Kiusalama
                    </h2>
                    <p className="leading-relaxed">
                      Lazima uwe na umri wa angalau miaka 18 kutumia PHCL Super. Kwa kutumia Jukwaa hili,
                      unathibitisha kuwa unakidhi vigezo vyote vya kisheria. Ili kuzuia ulaghai wa kifedha,
                      PHCL Super inahifadhi haki ya kudai uthibitisho wa kitambulisho (KYC) wakati wowote.
                    </p>
                  </section>

                  <section>
                    <h2 className="mb-3 text-2xl font-bold text-yellow-400">3. Usalama wa Akaunti na Wajibu</h2>
                    <p className="leading-relaxed">
                      Una wajibu wa kulinda siri ya taarifa za akaunti yako, neno la siri, na funguo za pochi
                      (wallet keys). Unakubali wajibu kamili kwa miamala yote inayotokea chini ya akaunti yako.
                      Matumizi yoyote ya uongo lazima yaripotiwe kwa timu yetu ya usalama mara moja.
                    </p>
                  </section>

                  <section>
                    <h2 className="mb-3 text-2xl font-bold text-yellow-400">4. Shughuli za Biashara na Sheria ya Riski</h2>
                    <div className="space-y-3">
                      <p className="leading-relaxed">
                        Biashara ya sarafu za kidijitali (cryptocurrency) ina hatari kubwa ya kupoteza fedha.
                        Hatutoi ushauri wa kifedha au uwekezaji. Unakubali na kutambua kwamba:
                      </p>
                      <ul className="list-disc space-y-2 pl-6">
                        <li>Unajua na kuelewa hatari za soko la sarafu za kidijitali.</li>
                        <li>Una wajibu kamili kwa maamuzi yako yote ya biashara na miamala.</li>
                        <li>PHCL Super na Pi Hub Company Limited hazitawajibika kwa hasara yoyote ya biashara.</li>
                      </ul>
                    </div>
                  </section>

                  <section>
                    <h2 className="mb-3 text-2xl font-bold text-yellow-400">
                      5. Shughuli Zilizopigwa Marufuku na Uadilifu wa Fedha
                    </h2>
                    <p className="mb-3 leading-relaxed">
                      Unakubali kutoshiriki katika shughuli zifuatazo zilizopigwa marufuku:
                    </p>
                    <ul className="list-disc space-y-2 pl-6">
                      <li>Kuvunja sheria au utawala wowote wa nchi au wa kimataifa.</li>
                      <li>Kujihusisha na ulaghai, utakatishaji fedha, au uchezeaji bei wa soko.</li>
                      <li>Kujaribu kuvuruga mifumo ya usalama ya seva, APIs, au kanzidata za mradi.</li>
                      <li>Kutumia roboti au mifumo ya kiotomatiki isiyo na ruhusa (inalindwa na App Check).</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="mb-3 text-2xl font-bold text-yellow-400">6. Ukomo wa Wajibu wa Kisheria</h2>
                    <p className="leading-relaxed">
                      Kwa upeo wa juu unaoruhusiwa na sheria, PHCL Super na Pi Hub Company Limited hazitakuwa na
                      wajibu kwa hasara yoyote ya faida, mapato ya kupoteza, au taarifa iliyopotea, ikiwa ni
                      pamoja na hitilafu za miamala zinazotokana na mtandao wa seva.
                    </p>
                  </section>

                  <section>
                    <h2 className="mb-3 text-2xl font-bold text-yellow-400">
                      7. Malipo, Marejesho, na Utatuzi wa Migogoro
                    </h2>
                    <p className="leading-relaxed">
                      Utekelezaji wa oda na marejesho ya fedha hutegemea rekodi sahihi za miamala
                      kielektroniki. Pande zote zinakubali kujaribu kusuluhisha migogoro kwa nia njema kupitia
                      idara ya msaada kabla ya kuchukua hatua rasmi za kisheria chini ya sheria za Jamhuri ya
                      Muungano wa Tanzania.
                    </p>
                  </section>

                  <section>
                    <h2 className="mb-3 text-2xl font-bold text-yellow-400">8. Taarifa za Wasilianaji wa Usalama</h2>
                    <p className="leading-relaxed">
                      Kama una swali kuhusu Masharti haya ya Huduma au Usalama, tafadhali wasiliana nasi kwa:
                    </p>
                    <div className="mt-3 space-y-2 rounded-lg border border-yellow-500/20 bg-purple-950/50 p-4">
                      <p><strong>Barua pepe ya Msaada:</strong> support@phclsuper.com</p>
                      <p><strong>Simu Rasmi:</strong> +255 693 863 356</p>
                      <p><strong>Anwani ya Ofisi:</strong> Dar es Salaam, Tanzania</p>
                    </div>
                  </section>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="border-t border-white/10 pt-4 text-center text-sm text-slate-500">
            {isEnglish
              ? `Effective date: ${EFFECTIVE_DATE} • Last updated: ${LAST_UPDATED}`
              : `Tarehe ya kuanza kutumika: ${EFFECTIVE_DATE} • Ilisasishwa mwisho: ${LAST_UPDATED}`}
          </div>
        </div>
      </main>
    </div>
  );
}