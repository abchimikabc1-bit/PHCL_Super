'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { Mic, MicOff, Send, Sparkles } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';

type VoiceLanguage = 'sw' | 'en' | 'zh' | 'fr';
type MessageRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
}

interface VoiceLanguageOption {
  code: VoiceLanguage;
  label: string;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike extends Event {
  results: {
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  error?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const VOICE_LANGUAGE_LABELS: VoiceLanguageOption[] = [
  { code: 'sw', label: 'Kiswahili' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'zh', label: '中文' },
];

const SPEECH_CODE: Record<VoiceLanguage, string> = {
  sw: 'sw-TZ',
  en: 'en-US',
  zh: 'zh-CN',
  fr: 'fr-FR',
};

const INITIAL_MESSAGE: Record<VoiceLanguage, string> = {
  sw: 'Jambo! Mimi ni msaidizi wako wa PHCL AI. Ninaweza kukusaidia kuhusu PHCL Super, wallet, marketplace na uchumi wa kidijitali.',
  en: 'Hello! I am your PHCL AI Assistant. I can help you with PHCL Super, the wallet, marketplace, and the digital economy.',
  fr: "Bonjour ! Je suis votre assistant PHCL AI. Je peux vous aider avec PHCL Super, le portefeuille, le marché et l'économie numérique.",
  zh: '您好！我是 PHCL AI 助手。我可以帮助您了解 PHCL Super、钱包、商城和数字经济。',
};

const PLACEHOLDER: Record<VoiceLanguage, string> = {
  sw: 'Andika au zungumza hapa...',
  en: 'Type or speak here...',
  fr: 'Écrivez ou parlez ici...',
  zh: '在这里输入或说话...',
};

const VOICE_UNAVAILABLE_MESSAGE: Record<VoiceLanguage, string> = {
  sw: 'Browser hii haisapoti utambuzi wa sauti. Bado unaweza kutumia maandishi.',
  en: 'This browser does not support voice recognition. You can still use text.',
  fr: "Ce navigateur ne prend pas en charge la reconnaissance vocale. Vous pouvez toujours utiliser le texte.",
  zh: '此浏览器不支持语音识别。您仍然可以使用文字。',
};

const VOICE_ERROR_MESSAGE: Record<VoiceLanguage, string> = {
  sw: 'Sauti haikuweza kutambuliwa. Jaribu tena au tumia maandishi.',
  en: 'Your voice could not be recognized. Try again or use text.',
  fr: "Votre voix n'a pas pu être reconnue. Réessayez ou utilisez le texte.",
  zh: '无法识别您的语音。请重试或使用文字。',
};

const createMessage = (
  role: MessageRole,
  text: string,
): ChatMessage => ({
  id:
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  role,
  text,
});

const getSupportedLanguage = (language: string): VoiceLanguage => {
  const normalizedLanguage = language.toLowerCase().split('-')[0];

  if (
    normalizedLanguage === 'sw' ||
    normalizedLanguage === 'en' ||
    normalizedLanguage === 'fr' ||
    normalizedLanguage === 'zh'
  ) {
    return normalizedLanguage;
  }

  return 'en';
};

const getAiResponse = (
  input: string,
  language: VoiceLanguage,
): string => {
  const question = input.trim().toLocaleLowerCase();

  const copy: Record<
    VoiceLanguage,
    {
      blockchain: string;
      phcl: string;
      tech: string;
      help: string;
      default: string;
    }
  > = {
    sw: {
      blockchain:
        'Blockchain ni teknolojia ya kumbukumbu iliyosambazwa. Kwenye PHCL Super inaweza kutumika kurekodi na kuthibitisha miamala kwa uwazi na usalama.',
      phcl:
        'PHCL Super ni jukwaa linalolenga kuunganisha marketplace, wallet na huduma nyingine za biashara ya kidijitali katika sehemu moja.',
      tech:
        'Web3 na teknolojia za kidijitali zinaweza kurahisisha biashara ya kimataifa. Hata hivyo, thamani ya sarafu na mali za kidijitali inaweza kubadilika, hivyo tathmini hatari kabla ya kufanya uamuzi wa kifedha.',
      help:
        "Mwongozo wa PHCL: 1. Fungua 'Wallet' kuona salio au kufanya muamala. 2. Fungua 'Shop' kutafuta bidhaa. 3. Tumia 'Profile' kusasisha taarifa na kukamilisha uthibitishaji unaohitajika.",
      default:
        'Mimi ni PHCL AI Assistant. Naweza kukusaidia kuhusu PHCL Super, blockchain, wallet, marketplace na uchumi wa kidijitali.',
    },
    en: {
      blockchain:
        'Blockchain is a distributed-ledger technology. On PHCL Super, it can be used to record and verify transactions transparently and securely.',
      phcl:
        'PHCL Super is a platform designed to bring a marketplace, wallet, and other digital-commerce services together in one place.',
      tech:
        'Web3 and digital technologies can make global commerce easier. Digital currencies and assets can be volatile, so consider the risks before making financial decisions.',
      help:
        "PHCL guide: 1. Open 'Wallet' to view your balance or make a transaction. 2. Open 'Shop' to find products. 3. Use 'Profile' to update your details and complete any required verification.",
      default:
        'I am your PHCL AI Assistant. I can help with PHCL Super, blockchain, the wallet, marketplace, and the digital economy.',
    },
    fr: {
      blockchain:
        'La blockchain est une technologie de registre distribué. Sur PHCL Super, elle peut servir à enregistrer et vérifier les transactions de manière transparente et sécurisée.',
      phcl:
        'PHCL Super est une plateforme conçue pour réunir une place de marché, un portefeuille et différents services de commerce numérique.',
      tech:
        "Le Web3 et les technologies numériques peuvent faciliter le commerce mondial. Les monnaies et actifs numériques sont volatils : évaluez les risques avant toute décision financière.",
      help:
        "Guide PHCL : 1. Ouvrez 'Portefeuille' pour consulter votre solde ou effectuer une transaction. 2. Ouvrez 'Marché' pour trouver des produits. 3. Utilisez 'Profil' pour mettre à jour vos informations et effectuer les vérifications requises.",
      default:
        "Je suis votre assistant PHCL AI. Je peux vous aider avec PHCL Super, la blockchain, le portefeuille, la place de marché et l'économie numérique.",
    },
    zh: {
      blockchain:
        '区块链是一种分布式账本技术。在 PHCL Super 中，它可以用于透明、安全地记录和验证交易。',
      phcl:
        'PHCL Super 旨在将商城、钱包和其他数字商务服务整合到一个平台中。',
      tech:
        'Web3 和数字技术可以使全球贸易更加便捷。数字货币和资产的价格可能波动，因此在作出财务决定前应评估风险。',
      help:
        'PHCL 指南：1. 打开“钱包”查看余额或进行交易。2. 打开“商城”查找商品。3. 使用“个人资料”更新信息并完成所需验证。',
      default:
        '我是 PHCL AI 助手。我可以帮助您了解 PHCL Super、区块链、钱包、商城和数字经济。',
    },
  };

  const activeCopy = copy[language];

  if (
    question.includes('blockchain') ||
    question.includes('crypto') ||
    question.includes('区块链')
  ) {
    return activeCopy.blockchain;
  }

  if (
    question.includes('phcl') ||
    question.includes('platform') ||
    question.includes('plateforme') ||
    question.includes('平台')
  ) {
    return activeCopy.phcl;
  }

  if (
    question.includes('uchumi') ||
    question.includes('technology') ||
    question.includes('teknolojia') ||
    question.includes('maendeleo') ||
    question.includes('economy') ||
    question.includes('économie') ||
    question.includes('technologie') ||
    question.includes('经济') ||
    question.includes('科技')
  ) {
    return activeCopy.tech;
  }

  if (
    question.includes('msaada') ||
    question.includes('msada') ||
    question.includes('guide') ||
    question.includes('miongozo') ||
    question.includes('how') ||
    question.includes('wallet') ||
    question.includes('soko') ||
    question.includes('help') ||
    question.includes('aide') ||
    question.includes('portefeuille') ||
    question.includes('帮助') ||
    question.includes('钱包')
  ) {
    return activeCopy.help;
  }

  return activeCopy.default;
};

export default function ChatPage() {
  const { language: appLanguage } = useLanguage();

  const activeAppLanguage = getSupportedLanguage(
    typeof appLanguage === 'string' ? appLanguage : 'en',
  );

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage('assistant', INITIAL_MESSAGE[activeAppLanguage]),
  ]);
  const [isListening, setIsListening] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(true);
  const [language, setLanguage] =
    useState<VoiceLanguage>(activeAppLanguage);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const selectedLanguageRef = useRef<VoiceLanguage>(activeAppLanguage);

  const addSystemMessage = useCallback((text: string) => {
    setMessages((previousMessages) => [
      ...previousMessages,
      createMessage('assistant', text),
    ]);
  }, []);

  useEffect(() => {
    selectedLanguageRef.current = language;

    if (recognitionRef.current) {
      recognitionRef.current.lang = SPEECH_CODE[language];
    }
  }, [language]);

  useEffect(() => {
    setLanguage(activeAppLanguage);
    setMessages([
      createMessage('assistant', INITIAL_MESSAGE[activeAppLanguage]),
    ]);
  }, [activeAppLanguage]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const browserWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    const SpeechRecognition =
      browserWindow.SpeechRecognition ??
      browserWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsVoiceSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = SPEECH_CODE[selectedLanguageRef.current];

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;

      if (transcript) {
        setInput(transcript);
      }

      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);

      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        addSystemMessage(
          VOICE_ERROR_MESSAGE[selectedLanguageRef.current],
        );
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [addSystemMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [messages, isReplying]);

  useEffect(() => {
    return () => {
      if (replyTimerRef.current) {
        clearTimeout(replyTimerRef.current);
      }

      window.speechSynthesis?.cancel();
    };
  }, []);

  const speakText = useCallback(
    (text: string, selectedLanguage: VoiceLanguage) => {
      if (
        typeof window === 'undefined' ||
        !('speechSynthesis' in window)
      ) {
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = SPEECH_CODE[selectedLanguage];

      window.speechSynthesis.speak(utterance);
    },
    [],
  );

  const handleLanguageChange = (
    selectedLanguage: VoiceLanguage,
  ) => {
    if (replyTimerRef.current) {
      clearTimeout(replyTimerRef.current);
      replyTimerRef.current = null;
    }

    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();

    setLanguage(selectedLanguage);
    setInput('');
    setIsListening(false);
    setIsReplying(false);
    setMessages([
      createMessage(
        'assistant',
        INITIAL_MESSAGE[selectedLanguage],
      ),
    ]);
  };

  const handleSend = () => {
    const messageText = input.trim();

    if (!messageText || isReplying) {
      return;
    }

    const selectedLanguage = language;
    const reply = getAiResponse(messageText, selectedLanguage);

    setMessages((previousMessages) => [
      ...previousMessages,
      createMessage('user', messageText),
    ]);
    setInput('');
    setIsReplying(true);

    replyTimerRef.current = setTimeout(() => {
      setMessages((previousMessages) => [
        ...previousMessages,
        createMessage('assistant', reply),
      ]);
      setIsReplying(false);
      replyTimerRef.current = null;
      speakText(reply, selectedLanguage);
    }, 650);
  };

  const toggleListening = () => {
    const recognition = recognitionRef.current;

    if (!recognition) {
      addSystemMessage(VOICE_UNAVAILABLE_MESSAGE[language]);
      return;
    }

    if (isListening) {
      recognition.stop();
      return;
    }

    try {
      recognition.lang = SPEECH_CODE[language];
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
      addSystemMessage(VOICE_ERROR_MESSAGE[language]);
    }
  };

  const handleInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleSend();
    }
  };

  const canSend = input.trim().length > 0 && !isReplying;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[#1a0c2e] p-4 pb-24 text-white sm:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center gap-3">
          <div className="rounded-full border border-purple-400/40 bg-purple-500/20 p-2 shadow-[0_0_15px_rgba(168,85,247,0.5)]">
            <Sparkles
              className="animate-pulse text-purple-300"
              size={22}
              aria-hidden="true"
            />
          </div>

          <div>
            <h1 className="text-2xl font-black text-amber-200">
              PHCL AI Assistant
            </h1>
            <p className="text-xs text-gray-400">
              Multilingual Voice &amp; Text Support
            </p>
          </div>
        </header>

        <section
          className="flex flex-wrap gap-2 rounded-xl border border-white/5 bg-slate-900/60 p-3"
          aria-label="Chat language"
        >
          {VOICE_LANGUAGE_LABELS.map((option) => (
            <button
              key={option.code}
              type="button"
              onClick={() => handleLanguageChange(option.code)}
              aria-pressed={language === option.code}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                language === option.code
                  ? 'bg-purple-600 text-white'
                  : 'border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {option.label}
            </button>
          ))}
        </section>

        <section
          className="h-96 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/40 p-4 shadow-inner backdrop-blur-md"
          aria-label="Chat messages"
          aria-live="polite"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user'
                  ? 'justify-end'
                  : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm ${
                  message.role === 'user'
                    ? 'rounded-tr-none bg-purple-600 text-white'
                    : 'rounded-tl-none border border-white/5 bg-slate-800 text-gray-200'
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}

          {isReplying && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-none border border-white/5 bg-slate-800 px-4 py-2.5 text-sm text-gray-400">
                <span className="animate-pulse">...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </section>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 p-2">
          <button
            type="button"
            onClick={toggleListening}
            disabled={!isVoiceSupported}
            aria-label={
              isListening
                ? 'Stop voice recognition'
                : 'Start voice recognition'
            }
            title={
              isVoiceSupported
                ? undefined
                : VOICE_UNAVAILABLE_MESSAGE[language]
            }
            className={`rounded-lg p-3 transition ${
              isListening
                ? 'animate-pulse bg-red-500 text-white'
                : 'bg-slate-800 text-purple-400'
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {isListening ? (
              <MicOff size={20} aria-hidden="true" />
            ) : (
              <Mic size={20} aria-hidden="true" />
            )}
          </button>

          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={PLACEHOLDER[language]}
            aria-label={PLACEHOLDER[language]}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
            className="rounded-lg bg-purple-600 p-3 text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </main>
  );
}
