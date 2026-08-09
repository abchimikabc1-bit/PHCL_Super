'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

type VoiceAccessibilityProps = {
  autoStartVoice?: boolean;
};

type VoiceLanguage = 'sw' | 'en' | 'zh' | 'fr';

const VOICE_LANG_OPTIONS: Array<{ code: VoiceLanguage; label: string; speechCode: string }> = [
  { code: 'sw', label: 'Kiswahili', speechCode: 'sw-TZ' },
  { code: 'en', label: 'English', speechCode: 'en-US' },
  { code: 'zh', label: '中文', speechCode: 'zh-CN' },
  { code: 'fr', label: 'Français', speechCode: 'fr-FR' },
];

const VOICE_LANGUAGE_STORAGE_KEY = 'phcl_voice_language';

const INTRO_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Karibu PHCL Super. Huu ni mfumo wa msaada wa sauti. Bonyeza Anza Kusikiliza, ongea, kisha mfumo utakusomea ujumbe wako kwa sauti.',
  en: 'Welcome to PHCL Super. This is voice accessibility support. Press Start Listening, speak, and the system will read your message aloud.',
  zh: '欢迎来到 PHCL Super。这是语音辅助功能。点击开始聆听，说出你的内容，系统会朗读你的信息。',
  fr: 'Bienvenue sur PHCL Super. Ceci est l’assistance vocale. Appuyez sur Commencer l’écoute, parlez, puis le système lira votre message à voix haute.',
};

const SAID_PREFIX_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Umesema',
  en: 'You said',
  zh: '你说的是',
  fr: 'Vous avez dit',
};

const STATUS_READY_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Tayari kutumia sauti',
  en: 'Ready for voice',
  zh: '语音已就绪',
  fr: 'Prêt pour la voix',
};

const STATUS_LISTENING_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Inasikiliza sasa...',
  en: 'Listening now...',
  zh: '正在聆听…',
  fr: 'Écoute en cours…',
};

const STATUS_UNSUPPORTED_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Browser hii haijasaidia voice API',
  en: 'This browser does not support voice API',
  zh: '此浏览器不支持语音 API',
  fr: 'Ce navigateur ne prend pas en charge l’API vocale',
};

const LANGUAGE_CHANGED_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Lugha ya sauti imebadilishwa kuwa Kiswahili.',
  en: 'Voice language changed to English.',
  zh: '语音语言已切换为中文。',
  fr: 'La langue vocale a été changée en français.',
};

const PANEL_TITLE_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Ufikiaji wa Sauti',
  en: 'Voice Accessibility',
  zh: '语音无障碍',
  fr: 'Accessibilité vocale',
};

const PANEL_DESC_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Msaada wa sauti kwa watumiaji wasioona vizuri: soma ujumbe kwa sauti na sikiliza amri za sauti.',
  en: 'Voice support for visually impaired users: read messages aloud and listen to voice commands.',
  zh: '为视障用户提供语音辅助：朗读消息并监听语音指令。',
  fr: 'Assistance vocale pour les utilisateurs malvoyants : lecture à voix haute des messages et écoute des commandes vocales.',
};

const SPEAK_BUTTON_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Soma kwa Sauti',
  en: 'Read Aloud',
  zh: '朗读',
  fr: 'Lire à voix haute',
};

const START_LISTENING_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Anza Kusikiliza',
  en: 'Start Listening',
  zh: '开始聆听',
  fr: 'Commencer l’écoute',
};

const STOP_LISTENING_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Simamisha Kusikiliza',
  en: 'Stop Listening',
  zh: '停止聆听',
  fr: 'Arrêter l’écoute',
};

const VOICE_LANGUAGE_TITLE_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Lugha ya Sauti',
  en: 'Voice Language',
  zh: '语音语言',
  fr: 'Langue vocale',
};

const WRITE_MESSAGE_TITLE_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Andika Ujumbe',
  en: 'Write Message',
  zh: '输入消息',
  fr: 'Écrire un message',
};

const WRITE_PLACEHOLDER_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Andika hapa... mfumo utakusomea kwa sauti',
  en: 'Type here... the system will read it aloud',
  zh: '在此输入……系统会为你朗读',
  fr: 'Écrivez ici… le système le lira à voix haute',
};

const TEXTAREA_ARIA_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Andika ujumbe wa kusomwa kwa sauti',
  en: 'Type message to be read aloud',
  zh: '输入要朗读的消息',
  fr: 'Saisir le message à lire à voix haute',
};

const CHARACTER_COUNT_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Herufi',
  en: 'Characters',
  zh: '字符',
  fr: 'Caractères',
};

const READ_TYPED_BUTTON_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Soma Ulichoandika',
  en: 'Read Typed Text',
  zh: '朗读输入内容',
  fr: 'Lire le texte saisi',
};

const STATUS_LABEL_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Hali',
  en: 'Status',
  zh: '状态',
  fr: 'Statut',
};

const READ_OUT_LABEL_BY_LANG: Record<VoiceLanguage, string> = {
  sw: 'Imesomwa',
  en: 'Read out',
  zh: '已朗读',
  fr: 'Lu à voix haute',
};

export default function VoiceAccessibility({ autoStartVoice = false }: VoiceAccessibilityProps) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [typedText, setTypedText] = useState('');
  const [voiceLanguage, setVoiceLanguage] = useState<VoiceLanguage>('sw');
  const [voiceLanguageReady, setVoiceLanguageReady] = useState(false);
  const [autoIntroDone, setAutoIntroDone] = useState(false);
  const recognitionRef = useRef<any>(null);

  const activeSpeechCode = VOICE_LANG_OPTIONS.find((option) => option.code === voiceLanguage)?.speechCode || 'sw-TZ';

  const introText = useMemo(() => INTRO_BY_LANG[voiceLanguage], [voiceLanguage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(VOICE_LANGUAGE_STORAGE_KEY) as VoiceLanguage | null;
      if (saved && VOICE_LANG_OPTIONS.some((option) => option.code === saved)) {
        setVoiceLanguage(saved);
        return;
      }

      const appLanguage = window.localStorage.getItem('phcl-language') as VoiceLanguage | null;
      if (appLanguage && VOICE_LANG_OPTIONS.some((option) => option.code === appLanguage)) {
        setVoiceLanguage(appLanguage);
      }
    } catch {
      // Ignore storage access errors
    } finally {
      setVoiceLanguageReady(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(VOICE_LANGUAGE_STORAGE_KEY, voiceLanguage);
    } catch {
      // Ignore storage access errors
    }
  }, [voiceLanguage]);

  useEffect(() => {
    const hasRecognition = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    const hasSynthesis = typeof window !== 'undefined' && !!window.speechSynthesis;
    setSupported(hasRecognition && hasSynthesis);

    if (hasRecognition) {
      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new Recognition();
      recognition.lang = activeSpeechCode;
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onresult = (event: any) => {
        const text = event?.results?.[0]?.[0]?.transcript?.trim() || '';
        setTranscript(text);
        if (text) {
          speakText(`${SAID_PREFIX_BY_LANG[voiceLanguage]}: ${text}`);
        }
      };

      recognition.onerror = () => {
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [activeSpeechCode, voiceLanguage]);

  useEffect(() => {
    if (!autoStartVoice || !supported || !voiceLanguageReady || autoIntroDone) return;
    speakText(INTRO_BY_LANG[voiceLanguage], voiceLanguage);
    setAutoIntroDone(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartVoice, supported, voiceLanguageReady, autoIntroDone, voiceLanguage]);

  const speakText = (text: string, languageOverride?: VoiceLanguage) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const selectedLanguage = languageOverride ?? voiceLanguage;
    const selectedSpeechCode =
      VOICE_LANG_OPTIONS.find((option) => option.code === selectedLanguage)?.speechCode || activeSpeechCode;

    // Update UI instantly so users do not see stale previous-language text.
    setSpokenText(text);

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedSpeechCode;

    const voices = window.speechSynthesis.getVoices();
    const exactVoice = voices.find((voice) => voice.lang.toLowerCase() === selectedSpeechCode.toLowerCase());
    const familyVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith(selectedSpeechCode.slice(0, 2).toLowerCase()));
    if (exactVoice || familyVoice) {
      utterance.voice = exactVoice || familyVoice || null;
    }

    utterance.rate = 0.96;
    utterance.pitch = 1.0;
    utterance.onstart = () => setSpokenText(text);
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.lang = activeSpeechCode;
    setTranscript('');
    setListening(true);
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setListening(false);
  };

  const handleVoiceLanguageSelect = (nextLanguage: VoiceLanguage) => {
    setVoiceLanguage(nextLanguage);

    const nextSpeechCode =
      VOICE_LANG_OPTIONS.find((option) => option.code === nextLanguage)?.speechCode || 'sw-TZ';

    if (recognitionRef.current) {
      recognitionRef.current.lang = nextSpeechCode;
      if (listening) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current.start();
        } catch {
          // Ignore restart race conditions on some browsers.
        }
      }
    }

    // Speak full intro in the selected language to avoid mixed-language continuity.
    speakText(INTRO_BY_LANG[nextLanguage], nextLanguage);
  };

  const handleReadTypedText = () => {
    const text = typedText.trim();
    if (!text) return;
    speakText(text);
  };

  return (
    <section className="mt-6 rounded-2xl border border-cyan-300/30 bg-slate-950/70 p-5 global-glass">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-cyan-100">{PANEL_TITLE_BY_LANG[voiceLanguage]}</h2>
          <p className="mt-1 text-sm text-cyan-50/85">
            {PANEL_DESC_BY_LANG[voiceLanguage]}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => speakText(introText)}
            className="rounded-lg border border-cyan-200/40 bg-cyan-500/20 px-3 py-2 text-xs font-bold text-cyan-50 hover:bg-cyan-500/30"
          >
            {SPEAK_BUTTON_BY_LANG[voiceLanguage]}
          </button>

          {!listening ? (
            <button
              type="button"
              onClick={startListening}
              disabled={!supported}
              className="rounded-lg border border-amber-300/50 bg-amber-400/20 px-3 py-2 text-xs font-bold text-amber-50 disabled:cursor-not-allowed disabled:opacity-60 hover:bg-amber-400/30"
            >
              {START_LISTENING_BY_LANG[voiceLanguage]}
            </button>
          ) : (
            <button
              type="button"
              onClick={stopListening}
              className="rounded-lg border border-rose-300/50 bg-rose-500/20 px-3 py-2 text-xs font-bold text-rose-50 hover:bg-rose-500/30"
            >
              {STOP_LISTENING_BY_LANG[voiceLanguage]}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-cyan-200/25 bg-white/5 p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-100/90">{VOICE_LANGUAGE_TITLE_BY_LANG[voiceLanguage]}</p>
        <div className="flex flex-wrap gap-2">
          {VOICE_LANG_OPTIONS.map((option) => (
            <button
              key={option.code}
              type="button"
              onClick={() => handleVoiceLanguageSelect(option.code)}
              aria-pressed={voiceLanguage === option.code}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                voiceLanguage === option.code
                  ? 'bg-cyan-300 text-slate-900 ring-2 ring-cyan-100/70'
                  : 'border border-cyan-200/40 bg-cyan-500/10 text-cyan-50 hover:bg-cyan-500/20'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-amber-200/25 bg-white/5 p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-100/90">{WRITE_MESSAGE_TITLE_BY_LANG[voiceLanguage]}</p>
        <textarea
          value={typedText}
          onChange={(event) => setTypedText(event.target.value)}
          placeholder={WRITE_PLACEHOLDER_BY_LANG[voiceLanguage]}
          className="min-h-24 w-full rounded-lg border border-amber-200/30 bg-slate-900/70 px-3 py-2 text-sm text-amber-50 placeholder:text-amber-100/45 focus:border-amber-300/60 focus:outline-none focus:ring-2 focus:ring-amber-300/20"
          aria-label={TEXTAREA_ARIA_BY_LANG[voiceLanguage]}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-amber-100/80">{CHARACTER_COUNT_BY_LANG[voiceLanguage]}: {typedText.length}</p>
          <button
            type="button"
            onClick={handleReadTypedText}
            disabled={!typedText.trim()}
            className="rounded-lg border border-amber-300/50 bg-amber-400/20 px-3 py-2 text-xs font-bold text-amber-50 disabled:cursor-not-allowed disabled:opacity-60 hover:bg-amber-400/30"
          >
            {READ_TYPED_BUTTON_BY_LANG[voiceLanguage]}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <p className="text-cyan-100/90">
          {STATUS_LABEL_BY_LANG[voiceLanguage]}:{' '}
          {supported
            ? listening
              ? STATUS_LISTENING_BY_LANG[voiceLanguage]
              : STATUS_READY_BY_LANG[voiceLanguage]
            : STATUS_UNSUPPORTED_BY_LANG[voiceLanguage]}
        </p>
        {transcript ? <p className="text-amber-100">{SAID_PREFIX_BY_LANG[voiceLanguage]}: {transcript}</p> : null}
        {spokenText ? <p className="text-violet-100">{READ_OUT_LABEL_BY_LANG[voiceLanguage]}: {spokenText}</p> : null}
      </div>
    </section>
  );
}
