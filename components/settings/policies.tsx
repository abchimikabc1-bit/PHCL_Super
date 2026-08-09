'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Shield, ChevronDown, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language'; // Tumia hook ya lugha ya asili ya mradi!

interface PoliciesProps {
  darkMode: boolean;
}

export function Policies({ darkMode }: PoliciesProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const { language, mounted } = useLanguage();
  const isSw = mounted && language === 'sw';

  const policies = [
    {
      id: 1,
      title: isSw ? 'Sera ya Faragha' : 'Privacy Policy',
      icon: '🔒',
      link: '/privacy-policy',
      content: isSw
        ? 'Tunalinda kikamilifu taarifa zako za siri na kuhakikisha data zote za miamala zinasimamiwa kwa usalama wa kiwango cha juu cha kimataifa.'
        : 'We protect your personal information and ensure all transaction data is handled according to international security standards.',
      ctaText: isSw ? 'Soma Sera Kamili 📄' : 'Read Full Policy 📄'
    },
    {
      id: 2,
      title: isSw ? 'Masharti ya Huduma' : 'Terms of Service',
      icon: '📜',
      link: '/terms-of-service',
      content: isSw
        ? 'Kwa kutumia programu ya PHCL Super, unakubaliana na masharti na kanuni zetu za huduma. Tafadhali yasome kwa makini kabla ya kuendelea.'
        : 'By using the PHCL Super app, you agree to our terms and conditions. Please read them carefully before proceeding.',
      ctaText: isSw ? 'Soma Masharti Kamili 📄' : 'Read Full Terms 📄'
    },
    {
      id: 3,
      title: isSw ? 'Sera ya Marejesho' : 'Refund Policy',
      icon: '💰',
      content: isSw
        ? 'Marejesho ya miamala au oda yasiyo na fujo yanashughulikiwa ndani ya siku 7-14 za kazi kulingana na rekodi za kielektroniki za kanzidata yetu.'
        : 'Refund requests and order issues are processed within 7-14 business days according to our verified database transaction records.',
    },
    {
      id: 4,
      title: isSw ? 'Sera ya Usalama' : 'Security Policy',
      icon: '🛡️',
      content: isSw
        ? 'Tunatumia usimbaji wa siri wa 256-bit na itifaki thabiti za kiusalama (pamoja na Firebase App Check) kulinda akaunti na miamala yako.'
        : 'We use 256-bit encryption and industry-standard security protocols (including Firebase App Check) to protect your account and transactions.',
    },
  ];

  return (
    <div className={`border rounded-2xl p-5 backdrop-blur-md shadow-xl transition-all ${
      darkMode 
        ? 'bg-slate-900/60 border-white/10 text-white' 
        : 'bg-purple-950/5 border-purple-500/10 text-slate-900'
    }`}>
      <h3 className="font-black flex items-center gap-2.5 mb-5 text-lg">
        <Shield size={20} className="text-yellow-400" />
        {isSw ? 'Sera na Usalama (Compliance)' : 'Policies & Compliance'}
      </h3>
      
      <div className="space-y-3">
        {policies.map((policy) => (
          <div 
            key={policy.id} 
            className={`border rounded-xl overflow-hidden transition-all ${
              darkMode 
                ? 'bg-white/5 border-white/10' 
                : 'bg-white border-purple-500/10'
            }`}
          >
            <button
              onClick={() => setExpanded(expanded === policy.id ? null : policy.id)}
              className="w-full flex justify-between items-center p-4 hover:bg-white/5 transition-all"
            >
              <span className="font-bold text-sm flex items-center gap-2.5">
                <span className="text-lg">{policy.icon}</span>
                {policy.title}
              </span>
              <ChevronDown size={18} className={`transition-transform duration-300 ${expanded === policy.id ? 'rotate-180' : ''}`} />
            </button>
            
            {expanded === policy.id && (
              <div className={`px-4 pb-4 border-t pt-3 space-y-4 ${
                darkMode ? 'border-white/10 text-gray-300' : 'border-purple-500/10 text-gray-700'
              }`}>
                <p className="text-sm leading-relaxed">{policy.content}</p>
                {policy.link && (
                  <Link 
                    href={policy.link}
                    className="inline-flex items-center gap-2 text-xs font-bold text-yellow-400 hover:text-yellow-300 transition"
                  >
                    {policy.ctaText}
                    <ExternalLink size={12} />
                  </Link>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
