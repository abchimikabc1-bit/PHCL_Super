"use client";

import Link from 'next/link';
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TermsOfServicePage() {
  const [language] = useState("en");

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-100 via-white to-lime-100 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-amber-200/60 bg-white/85 p-4 shadow-sm backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => window.history.back()} className="font-bold text-amber-700 hover:opacity-80">
            ← Back
          </button>
          <h2 className="text-xl font-bold">{language === "en" ? "Terms of Service" : "Masharti ya Huduma"}</h2>
          <Link href="/privacy-policy" className="rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-white">
            Privacy Policy
          </Link>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-12 sm:px-6">
        <div className="space-y-8">
          
          {/* Title */}
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {language === "en" ? "Terms of Service" : "Masharti ya Huduma"}
            </h1>
            <p className="text-gray-600">
              {language === "en" 
                ? "Effective Date: January 2025" 
                : "Tarehe Nzuri: Januari 2025"}
            </p>
          </div>

          {/* Content */}
          <Card className="border border-white/70 bg-white/90 shadow-[0_20px_50px_rgba(70,119,101,0.14)]">
            <CardContent className="prose prose-sm max-w-none pt-8 prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-li:text-slate-700">
              {language === "en" ? (
                <div className="space-y-6">
                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Agreement to Terms</h2>
                    <p className="text-gray-700 leading-relaxed">
                      By accessing and using Phcl Super (&quot;Platform&quot;), you agree to be bound by these Terms of Service. If you do not agree to abide by the above, please do not use this service. Pi Hub Company Limited reserves the right to update or change the Terms of Service at any time.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Eligibility</h2>
                    <p className="text-gray-700 leading-relaxed">
                      You must be at least 18 years old to use Phcl Super. By using the Platform, you represent and warrant that you are of legal age to form a binding contract and meet all eligibility requirements.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Account Responsibility</h2>
                    <p className="text-gray-700 leading-relaxed">
                      You are responsible for maintaining the confidentiality of your account information and password. You agree to accept responsibility for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Trading & Financial Activities</h2>
                    <div className="space-y-3">
                      <p className="text-gray-700 leading-relaxed">
                        Cryptocurrency trading involves substantial risk of loss. We do not provide financial advice. You acknowledge that:
                      </p>
                      <ul className="list-disc pl-6 space-y-2 text-gray-700">
                        <li>You understand the risks of cryptocurrency trading</li>
                        <li>You are responsible for your own trading decisions</li>
                        <li>You have adequate knowledge and experience to use the Platform</li>
                        <li>You will not hold us liable for trading losses</li>
                        <li>Market prices are subject to high volatility</li>
                      </ul>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Prohibited Activities</h2>
                    <p className="text-gray-700 leading-relaxed mb-3">
                      You agree not to engage in any of the following prohibited activities:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-gray-700">
                      <li>Violating any applicable laws or regulations</li>
                      <li>Engaging in fraudulent or deceptive practices</li>
                      <li>Attempting to manipulate market prices</li>
                      <li>Hacking or unauthorized system access</li>
                      <li>Transmitting viruses or malicious code</li>
                      <li>Harassing or threatening other users</li>
                      <li>Money laundering or terrorist financing</li>
                      <li>Using the Platform for illegal activities</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Limitation of Liability</h2>
                    <p className="text-gray-700 leading-relaxed">
                      To the fullest extent permitted by law, Phcl Super and Pi Hub Company Limited shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to lost profits, lost revenue, or lost data, even if we have been advised of the possibility of such damages.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Indemnification</h2>
                    <p className="text-gray-700 leading-relaxed">
                      You agree to indemnify, defend, and hold harmless Pi Hub Company Limited and its officers, directors, employees, and agents from any and all claims, damages, liabilities, and expenses arising from your use of the Platform or violation of these Terms.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Termination</h2>
                    <p className="text-gray-700 leading-relaxed">
                      We may terminate or suspend your account and access to the Platform at any time, with or without cause, and with or without notice. Termination may result in forfeiture of your account contents.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">9. Governing Law</h2>
                    <p className="text-gray-700 leading-relaxed">
                      These Terms of Service are governed by and construed in accordance with the laws of the United Republic of Tanzania, without regard to its conflict of law provisions.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">10. Contact Information</h2>
                    <p className="text-gray-700 leading-relaxed">
                      If you have any questions about these Terms of Service, please contact us at:
                    </p>
                    <div className="mt-3 space-y-2 rounded-lg bg-emerald-50 p-4 text-gray-700">
                      <p><strong>Email:</strong> support@pihcl.tz</p>
                      <p><strong>Phone:</strong> +255 693 863 356</p>
                      <p><strong>Website:</strong> https://www.phclsuper.com</p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">11. Payments, Refunds, and Charge Disputes</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Order fulfillment and refund eligibility depend on product type, delivery status, and verified
                      transaction records. Unauthorized charge disputes, false claims, or abuse of refund mechanisms may
                      result in account restrictions or legal escalation.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">12. Compliance and Financial Integrity</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Users must comply with applicable anti-fraud, anti-money laundering, and sanctions-related laws.
                      PHCL Super may suspend or restrict activity where suspicious behavior, identity mismatch, or
                      regulatory risk is detected.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">13. Dispute Resolution</h2>
                    <p className="text-gray-700 leading-relaxed">
                      In the event of disputes, parties agree to attempt good-faith resolution through support channels
                      before pursuing formal legal remedies. Venue and governing procedure shall follow applicable Tanzanian law.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">14. Platform Availability and Updates</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Service availability may be affected by maintenance, security updates, infrastructure incidents,
                      and third-party provider constraints. We reserve the right to modify features or policies for
                      reliability, compliance, and security improvement.
                    </p>
                  </section>
                </div>
              ) : (
                <div className="space-y-6">
                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Mkutano wa Masharti</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Kwa kufikia na kutumia Phcl Super (&quot;Jukwaa&quot;), unakubali kuwa umefungwa na Masharti haya ya Huduma. Kama haupatikani kuwa na wajibu wa kupatia hapo juu, tafadhali usitumie huduma hii. Pi Hub Company Limited inajihifadhi haki ya kusasisha au kubadilisha Masharti ya Huduma wakati wowote.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Kiwango cha Kufa</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Lazima uwe na umri wa angalau miaka 18 kutumia Phcl Super. Kwa kutumia Jukwaa, unajionyesha na kumkumbuka kuwa uko na umri wa kisheria kuunda mikakati ambayo inafunga na unakidhi mahitaji yote ya kufa.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Wajibu wa Akaunti</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Una wajibu wa kuchezeana na siri ya taarifa ya akaunti yako na neno siri. Unakubali kuchukua wajibu kwa shughuli zote zinazotokea chini ya akaunti yako. Lazima utuambie mara moja kuhusu matumizi yasiojalivu ya akaunti yako.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Biashara na Shughuli za Kifedha</h2>
                    <div className="space-y-3">
                      <p className="text-gray-700 leading-relaxed">
                        Biashara ya cryptocurrency ina hatari kubwa ya kupoteza. Hatututoi ushauri wa kifedha. Unajua kwamba:
                      </p>
                      <ul className="list-disc pl-6 space-y-2 text-gray-700">
                        <li>Unajua hatari za biashara ya cryptocurrency</li>
                        <li>Una wajibu kwa maamuzi yako ya biashara</li>
                        <li>Una maarifa na uzoefu wa kutumia Jukwaa</li>
                        <li>Hautakamatiza sisi kwa hasara za biashara</li>
                        <li>Bei za soko ni senti za juu</li>
                      </ul>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Shughuli Zilizopotelezwa</h2>
                    <p className="text-gray-700 leading-relaxed mb-3">
                      Unakubali kusambazo kuingia katika yoyote ya shughuli hizi zilizopotelezwa:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-gray-700">
                      <li>Kuvunja sheria na utawala</li>
                      <li>Kuingia katika ulaghai au mipango ya ongo</li>
                      <li>Kujaribu kumanipulea bei ya soko</li>
                      <li>Kujenga au kufikia mfumo bila ruhusa</li>
                      <li>Kuhamisha virusi au akili mbaya</li>
                      <li>Kusumbua au kuhoza watumiaji wengine</li>
                      <li>Kumfanya biashara ya pesa au fedha za mitego</li>
                      <li>Kutumia Jukwaa kwa shughuli za kisheria</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Kufunga Wajibu</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Kwa upeo kamili unaweza na sheria, Phcl Super na Pi Hub Company Limited hazitakuwa na wajibu kwa hasara yoyote isiyojua, ya muda, ya umeme, ya mabadiliko, au ya adhabu, ikiwa ni pamoja na lakini si mdogo kwa hasara ya faida, mapato ya kupoteza, au taarifa iliyopoteza, hata kama tumekuambiwa kuhusu uwezekano wa hasara hivyo.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Kufahamisha</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Unakubali kufahamisha, kutetea, na kuchezeana Pi Hub Company Limited na afisa zake, wakuu, wafanyakazi, na wakili kutoka kwa madai yote, hasara, wajibu, na gharama inayotokea kutokana na matumizi yako ya Jukwaa au kuvunja Masharti haya.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Kumalizia</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Tunawezesha kumalizia au kusimamia akaunti yako na kufikia Jukwaa wakati wowote, wenye au bila sababu, na wenye au bila onyo. Kumalizia kunaweza kusababisha kupoteza maudhui ya akaunti yako.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">9. Sheria ya Kusimamia</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Masharti haya ya Huduma yanasimamia na kutengenezwa kulingana na sheria za Jamhuri Muungano wa Tanzania, bila kuzingatia mifano ya sheria yake ya mgogoro.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">10. Taarifa za Wasilianaji</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Kama una swali kuhusu Masharti haya ya Huduma, tafadhali wasiliana nasi kwa:
                    </p>
                    <div className="mt-3 space-y-2 rounded-lg bg-emerald-50 p-4 text-gray-700">
                      <p><strong>Barua pepe:</strong> support@pihcl.tz</p>
                      <p><strong>Simu:</strong> +255 693 863 356</p>
                      <p><strong>Website:</strong> https://www.phclsuper.com</p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">11. Malipo, Marejesho, na Migogoro ya Malipo</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Utekelezaji wa oda na ustahiki wa marejesho hutegemea aina ya bidhaa, hali ya utoaji, na rekodi
                      sahihi za muamala. Madai ya uongo au matumizi mabaya ya mfumo wa refund yanaweza kusababisha
                      kufungwa kwa akaunti au hatua za kisheria.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">12. Uzingatiaji wa Sheria na Uadilifu wa Fedha</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Watumiaji wanapaswa kufuata sheria husika za kuzuia udanganyifu, utakatishaji wa fedha, na vikwazo
                      vya kifedha. PHCL Super inaweza kusimamisha shughuli inapobaini hatari ya kisheria au miamala isiyoeleweka.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">13. Utatuzi wa Migogoro</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Pande zote zitajaribu kwanza kutatua migogoro kwa mawasiliano ya msaada wa wateja kwa nia njema
                      kabla ya hatua rasmi za kisheria. Taratibu zitafuata sheria zinazotumika za Tanzania.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">14. Upatikanaji wa Huduma na Mabadiliko</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Upatikanaji wa huduma unaweza kuathiriwa na matengenezo, masasisho ya usalama, hitilafu za miundombinu,
                      au changamoto za watoa huduma wengine. Tunaweza kubadili vipengele au sera kwa ajili ya usalama,
                      uaminifu wa mfumo, na ulinganifu wa kisheria.
                    </p>
                  </section>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Last Updated */}
          <div className="text-center text-sm text-slate-500">
            {language === "en" 
              ? "Last updated: January 2025" 
              : "Ilisasishwa mwisho: Januari 2025"}
          </div>
        </div>
      </main>
    </div>
  );
}
