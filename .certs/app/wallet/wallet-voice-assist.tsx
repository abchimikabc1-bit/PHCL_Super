'use client';

import { useEffect, useMemo, useState } from 'react';

type VoiceLanguage = 'sw' | 'en' | 'zh' | 'fr';

const VOICE_LANGUAGE_STORAGE_KEY = 'phcl_voice_language';

const SPEECH_CODE_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'sw-TZ',
  en: 'en-US',
  zh: 'zh-CN',
  fr: 'fr-FR',
};

const READ_BUTTON_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Soma Salio kwa Sauti',
  en: 'Read Balance Aloud',
  zh: '朗读余额',
  fr: 'Lire le solde à voix haute',
};

const LAST_READ_LABEL_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Imesomwa',
  en: 'Read out',
  zh: '已朗读',
  fr: 'Lu à voix haute',
};

const VOICE_LANGUAGE_TITLE_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Lugha ya Sauti',
  en: 'Voice Language',
  zh: '语音语言',
  fr: 'Langue vocale',
};

const VOICE_LANGUAGE_LABELS: Array<{ code: VoiceLanguage; label: string }> = [
  { code: 'sw', label: 'Kiswahili' },
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'fr', label: 'Français' },
];

const INPUT_TITLE_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Andika Kiasi cha PI',
  en: 'Enter PI Amount',
  zh: '输入 PI 数量',
  fr: 'Saisir le montant PI',
};

const INPUT_PLACEHOLDER_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Mfano: 2.5',
  en: 'Example: 2.5',
  zh: '例如：2.5',
  fr: 'Exemple : 2.5',
};

const READ_ESTIMATE_BUTTON_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Soma Makadirio ya Thamani',
  en: 'Read Estimated Value',
  zh: '朗读估算价值',
  fr: 'Lire la valeur estimée',
};

const INVALID_AMOUNT_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Tafadhali andika kiasi sahihi cha PI.',
  en: 'Please enter a valid PI amount.',
  zh: '请输入有效的 PI 数量。',
  fr: 'Veuillez saisir un montant PI valide.',
};

const MESSAGE_BY_LANG = (language: VoiceLanguage, balancePi: string, gcvUsd: string) => {
  if (language === 'en') {
    return `Wallet balance is ${balancePi} Pi. One Pi equals ${gcvUsd} US dollars at GCV.`;
  }
  if (language === 'zh') {
    return `钱包余额为 ${balancePi} Pi。按照 GCV，1 个 Pi 等于 ${gcvUsd} 美元。`;
  }
  if (language === 'fr') {
    return `Le solde du portefeuille est de ${balancePi} Pi. Un Pi équivaut à ${gcvUsd} dollars américains au taux GCV.`;
  }
  return `Salio la wallet ni ${balancePi} Pi. Pi moja ni sawa na dola ${gcvUsd} kwa kiwango cha GCV.`;
};

const ESTIMATE_MESSAGE_BY_LANG = (language: VoiceLanguage, amountPi: number, estimatedUsd: number) => {
  if (language === 'en') {
    return `Estimated value for ${amountPi} Pi is ${estimatedUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })} US dollars at GCV.`;
  }
  if (language === 'zh') {
    return `${amountPi} Pi 的估算价值是 ${estimatedUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })} 美元（按 GCV）。`;
  }
  if (language === 'fr') {
    return `La valeur estimée de ${amountPi} Pi est de ${estimatedUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })} dollars américains au taux GCV.`;
  }
  return `Makadirio ya thamani ya ${amountPi} Pi ni dola ${estimatedUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })} kwa kiwango cha GCV.`;
};

const detectVoiceLanguage = (): VoiceLanguage => {
  if (typeof window === 'undefined') return 'sw';
  const raw = window.localStorage.getItem(VOICE_LANGUAGE_STORAGE_KEY) as VoiceLanguage | null;
  if (raw === 'sw' || raw === 'en' || raw === 'zh' || raw === 'fr') return raw;

  const appLang = window.localStorage.getItem('phcl-language');
  if (appLang === 'en') return 'en';
  if (appLang === 'sw') return 'sw';
  return 'sw';
};

export default function WalletVoiceAssist({
  balancePi,
  gcvUsd,
}: {
  balancePi: string;
  gcvUsd: string;
}) {
  const [lastRead, setLastRead] = useState('');
  const [typedPiAmount, setTypedPiAmount] = useState('');
  const [language, setLanguage] = useState<VoiceLanguage>('sw');

  useEffect(() => {
    setLanguage(detectVoiceLanguage());
  }, []);

  const gcvNumeric = useMemo(() => Number(gcvUsd.replace(/,/g, '')) || 0, [gcvUsd]);

  const speak = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const text = MESSAGE_BY_LANG(language, balancePi, gcvUsd);
    const langCode = SPEECH_CODE_BY_LANG[language];

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;

    const voices = window.speechSynthesis.getVoices();
    const exactVoice = voices.find((voice) => voice.lang.toLowerCase() === langCode.toLowerCase());
    const familyVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith(langCode.slice(0, 2).toLowerCase()));
    if (exactVoice || familyVoice) utterance.voice = exactVoice || familyVoice || null;

    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onstart = () => setLastRead(text);
    window.speechSynthesis.speak(utterance);
  };

  const speakEstimatedValue = () => {
    const normalized = typedPiAmount.trim().replace(',', '.');
    const amountPi = Number(normalized);
    if (!Number.isFinite(amountPi) || amountPi <= 0 || gcvNumeric <= 0) {
      const warn = INVALID_AMOUNT_BY_LANG[language];
      setLastRead(warn);
      speakDirect(warn, language);
      return;
    }

    const estimatedUsd = amountPi * gcvNumeric;
    const text = ESTIMATE_MESSAGE_BY_LANG(language, amountPi, estimatedUsd);
    setLastRead(text);
    speakDirect(text, language);
  };

  const speakDirect = (text: string, lang: VoiceLanguage) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const langCode = SPEECH_CODE_BY_LANG[lang];
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;

    const voices = window.speechSynthesis.getVoices();
    const exactVoice = voices.find((voice) => voice.lang.toLowerCase() === langCode.toLowerCase());
    const familyVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith(langCode.slice(0, 2).toLowerCase()));
    if (exactVoice || familyVoice) utterance.voice = exactVoice || familyVoice || null;

    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleLanguageSelect = (nextLanguage: VoiceLanguage) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setLanguage(nextLanguage);
    setLastRead('');
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VOICE_LANGUAGE_STORAGE_KEY, nextLanguage);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-cyan-200/25 bg-white/5 p-4">
      <div className="mb-3 rounded-lg border border-cyan-200/25 bg-slate-900/50 p-3">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-100/90">
          {VOICE_LANGUAGE_TITLE_BY_LANG[language]}
        </p>
        <div className="flex flex-wrap gap-2">
          {VOICE_LANGUAGE_LABELS.map((option) => (
            <button
              key={option.code}
              type="button"
              onClick={() => handleLanguageSelect(option.code)}
              aria-pressed={language === option.code}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                language === option.code
                  ? 'bg-cyan-300 text-slate-900 ring-2 ring-cyan-100/70'
                  : 'border border-cyan-200/40 bg-cyan-500/10 text-cyan-50 hover:bg-cyan-500/20'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={speak}
        className="rounded-lg border border-cyan-300/45 bg-cyan-500/20 px-3 py-2 text-xs font-bold text-cyan-50 hover:bg-cyan-500/30"
      >
        {READ_BUTTON_BY_LANG[language]}
      </button>

      <div className="mt-3 rounded-lg border border-amber-200/25 bg-slate-900/50 p-3">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-100/90">
          {INPUT_TITLE_BY_LANG[language]}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            step="0.00000001"
            min="0"
            value={typedPiAmount}
            onChange={(event) => setTypedPiAmount(event.target.value)}
            placeholder={INPUT_PLACEHOLDER_BY_LANG[language]}
            className="w-40 rounded-lg border border-amber-200/35 bg-slate-950 px-3 py-2 text-sm text-amber-50 placeholder:text-amber-100/45 focus:border-amber-300/60 focus:outline-none focus:ring-2 focus:ring-amber-300/20"
          />
          <button
            type="button"
            onClick={speakEstimatedValue}
            className="rounded-lg border border-amber-300/50 bg-amber-400/20 px-3 py-2 text-xs font-bold text-amber-50 hover:bg-amber-400/30"
          >
            {READ_ESTIMATE_BUTTON_BY_LANG[language]}
          </button>
        </div>
      </div>

      {lastRead ? (
        <p className="mt-3 text-xs text-cyan-100/90">
          {LAST_READ_LABEL_BY_LANG[language]}: {lastRead}
        </p>
      ) : null}
    </div>
  );
}
