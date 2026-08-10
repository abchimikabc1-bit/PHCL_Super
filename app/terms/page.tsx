// app/terms/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/hooks/use-language';
import { ShieldCheck, ArrowLeft, FileText, Scale } from 'lucide-react';

export default function TermsPage() {
  const { language } = useLanguage();
  const isSw = language === 'sw';

  const copy = {
    title: isSw ? 'Masharti ya Huduma' : 'Terms of Service',
    subtitle: isSw 
      ? 'Soma kwa makini masharti na sheria za kutumia jukwaa la kimataifa la PHCL Super kabla ya kuanza ununuzi au biashara.' 
      : 'Please read the terms and conditions of using the PHCL Super global platform carefully before commencing trade or purchases.',
    backHome: isSw ? 'Rudi Nyumbani' : 'Back to Home',
    lastUpdated: isSw ? 'Kusasishwa kwa Mwisho: Juni 2026' : 'Last Updated: June 2026',
    
    section1Title: isSw ? '1. Kukubali Masharti' : '1. Acceptance of Terms',
    section1Text: isSw
      ? 'Kwa kufungua akaunti, kutumia wallet ya PHCL, au kufanya manunuzi kwenye soko letu la kimataifa, unakubali kikamilifu kufungwa na masharti haya yote bila kizuizi.'
      : 'By creating an account, utilizing the PHCL wallet, or purchasing on our global marketplace, you fully agree to be bound by these terms without limitation.',
    
    section2Title: isSw ? '2. Usalama wa Akaunti na Pochi (Wallet)' : '2. Account & Wallet Security',
    section2Text: isSw
      ? 'Wewe ndiye unayewajibika kulinda msimbo wako wa siri wa maneno 16-24 (passphrase). PHCL haitahifadhi msimbo huu na haina uwezo vya kurejesha salio lako ikiwa utapoteza msimbo wako bila kurejesha kupitia OTP ya email na selfie ya Liveness.'
      : 'You are solely responsible for securing your 16-24 word passphrase. PHCL does not store this passphrase and cannot recover your funds if lost without undergoing verified Email OTP and Liveness Selfie recovery.',
    
    section3Title: isSw ? '3. Mfumo wa Escrow na Miamala ya P2P' : '3. Escrow & P2P Transaction System',
    section3Text: isSw
      ? 'Miamala yote ya ununuzi vya bidhaa inalindwa kwa mfumo wa Escrow. Fedha zitashikiliwa salama kwenye Escrow Vaults hadi pande zote mbili (mnunuzi na muuzaji) zithibitishwe kukamilisha muamala. Ada ya huduma ya 1.5% inatozwa kiotomatiki kwa miamala yote.'
      : 'All purchase transactions are protected by our Escrow system. Funds are securely locked in Escrow Vaults until both parties (buyer and seller) confirm fulfillment. A standard 1.5% service fee is automatically deducted from all transactions.',
    
    section4Title: isSw ? '4. Uhakiki wa KYC na Sheria za Kimataifa' : '4. KYC Verification & Global Compliance',
    section4Text: isSw
      ? 'Ili kufanya miamala mikubwa ya ukomo wa juu, mtumiaji lazima akamilishe Multi-Tier KYC. Taarifa zako zote za PII zinasimbwa kwa njia ya siri ya AES-256-GCM. Unajihusisha na biashara kwa kukubaliana na kanuni za Anti-Money Laundering (AML).'
      : 'To perform high-limit transactions, users must complete Multi-Tier KYC. All PII data is strongly encrypted using AES-256-GCM. You agree to comply with international Anti-Money Laundering (AML) standards.',
      
    footerText: isSw 
      ? 'Asante kwa kuchagua PHCL Super — Jukwaa Salama la Biashara ya Kimataifa.' 
      : 'Thank you for choosing PHCL Super — The Secure Global Marketplace.',
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[#1c1607] text-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Neon Spotlight */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.14),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_35%)]" />

      <section className="relative w-full max-w-4xl rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-10 backdrop-blur-2xl shadow-2xl global-glass">
        
        {/* Header / Navigation Row */}
        <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
              <Scale size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-wide">{copy.title}</h1>
              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">{copy.lastUpdated}</p>
            </div>
          </div>
          <Link 
            href="/" 
            className="rounded-xl border border-white/20 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 transition flex items-center gap-1.5"
          >
            <ArrowLeft size={14} />
            {copy.backHome}
          </Link>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-8 border-l-2 border-amber-500 pl-4 py-1">
          {copy.subtitle}
    
        </p>

        {/* Terms Content Body */}
        <div className="space-y-6 text-xs sm:text-sm text-slate-200">
          
          {/* Section 1 */}
          <div className="space-y-2 rounded-2xl border border-white/5 bg-slate-950/40 p-5 hover:border-white/10 transition">
            <h3 className="font-extrabold text-amber-300 text-sm sm:text-base flex items-center gap-2">
              <FileText size={16} className="text-amber-500" />
              {copy.section1Title}
            </h3>
            <p className="text-slate-400 leading-relaxed">{copy.section1Text}</p>
          </div>

          {/* Section 2 */}
          <div className="space-y-2 rounded-2xl border border-white/5 bg-slate-950/40 p-5 hover:border-white/10 transition">
            <h3 className="font-extrabold text-amber-300 text-sm sm:text-base flex items-center gap-2">
              <ShieldCheck size={16} className="text-amber-500" />
              {copy.section2Title}
            </h3>
            <p className="text-slate-400 leading-relaxed">{copy.section2Text}</p>
          </div>

          {/* Section 3 */}
          <div className="space-y-2 rounded-2xl border border-white/5 bg-slate-950/40 p-5 hover:border-white/10 transition">
            <h3 className="font-extrabold text-amber-300 text-sm sm:text-base flex items-center gap-2">
              <Scale size={16} className="text-amber-500" />
              {copy.section3Title}
            </h3>
            <p className="text-slate-400 leading-relaxed">{copy.section3Text}</p>
          </div>

          {/* Section 4 */}
          <div className="space-y-2 rounded-2xl border border-white/5 bg-slate-950/40 p-5 hover:border-white/10 transition">
            <h3 className="font-extrabold text-amber-300 text-sm sm:text-base flex items-center gap-2">
              <ShieldCheck size={16} className="text-amber-500" />
              {copy.section4Title}
            </h3>
            <p className="text-slate-400 leading-relaxed">{copy.section4Text}</p>
          </div>

        </div>

        {/* Footer Note */}
        <div className="mt-8 border-t border-white/10 pt-6 text-center">
          <p className="text-xs text-slate-500 font-medium">{copy.footerText}</p>
          <p className="text-[10px] text-slate-600 font-mono mt-1">© 2026 PHCL Super. All Rights Reserved.</p>
        </div>

      </section>
    </main>
  );
}
