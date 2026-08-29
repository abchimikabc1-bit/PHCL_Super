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

type SpeechRecognitionConstructor =
  new () => SpeechRecognitionLike;

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
  sw:
    'Jambo! Mimi ni PHCL AI Assistant. Unaweza kuniuliza kuhusu PHCL Super, marketplace, wallet, teknolojia, biashara na elimu ya kidijitali.',

  en:
    'Hello! I am your PHCL AI Assistant. You can ask me about PHCL Super, the marketplace, wallet, technology, business, and digital education.',

  fr:
    "Bonjour ! Je suis votre assistant PHCL AI. Vous pouvez me poser des questions sur PHCL Super, le marché, le portefeuille, la technologie, les affaires et l'éducation numérique.",

  zh:
    '您好！我是 PHCL AI 助手。您可以询问有关 PHCL Super、商城、钱包、科技、商业和数字教育的问题。',
};

const PLACEHOLDER: Record<VoiceLanguage, string> = {
  sw: 'Andika au zungumza hapa...',
  en: 'Type or speak here...',
  fr: 'Écrivez ou parlez ici...',
  zh: '在这里输入或说话...',
};

const VOICE_UNAVAILABLE_MESSAGE: Record<
  VoiceLanguage,
  string
> = {
  sw:
    'Browser hii haisapoti utambuzi wa sauti. Bado unaweza kutumia maandishi.',

  en:
    'This browser does not support voice recognition. You can still use text.',

  fr:
    "Ce navigateur ne prend pas en charge la reconnaissance vocale. Vous pouvez toujours utiliser le texte.",

  zh:
    '此浏览器不支持语音识别。您仍然可以使用文字。',
};

const VOICE_ERROR_MESSAGE: Record<
  VoiceLanguage,
  string
> = {
  sw:
    'Sauti haikuweza kutambuliwa. Jaribu tena au tumia maandishi.',

  en:
    'Your voice could not be recognized. Try again or use text.',

  fr:
    "Votre voix n'a pas pu être reconnue. Réessayez ou utilisez le texte.",

  zh:
    '无法识别您的语音。请重试或使用文字。',
};

const AI_ERROR_MESSAGE: Record<
  VoiceLanguage,
  string
> = {
  sw:
    'Samahani, PHCL AI haipatikani kwa muda huu. Tafadhali jaribu tena.',

  en:
    'Sorry, PHCL AI is temporarily unavailable. Please try again.',

  fr:
    'Désolé, PHCL AI est temporairement indisponible. Veuillez réessayer.',

  zh:
    '抱歉，PHCL AI 暂时不可用。请稍后再试。',
};

const createMessage = (
  role: MessageRole,
  text: string,
): ChatMessage => ({
  id:
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`,

  role,
  text,
});

const getSupportedLanguage = (
  language: string,
): VoiceLanguage => {
  const normalizedLanguage =
    language.toLowerCase().split('-')[0];

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

/**
 * Tanzania Kiswahili is the first preference.
 *
 * Priority:
 * sw-TZ -> another sw-TZ -> sw-KE -> any Swahili
 */
const findBestVoice = (
  voices: SpeechSynthesisVoice[],
  language: VoiceLanguage,
): SpeechSynthesisVoice | undefined => {
  const speechCode =
    SPEECH_CODE[language].toLowerCase();

  if (language === 'sw') {
    return (
      voices.find(
        (voice) =>
          voice.lang.toLowerCase() === 'sw-tz',
      ) ||
      voices.find((voice) =>
        voice.lang
          .toLowerCase()
          .startsWith('sw-tz'),
      ) ||
      voices.find(
        (voice) =>
          voice.lang.toLowerCase() === 'sw-ke',
      ) ||
      voices.find((voice) =>
        voice.lang.toLowerCase().startsWith('sw'),
      )
    );
  }

  return (
    voices.find(
      (voice) =>
        voice.lang.toLowerCase() === speechCode,
    ) ||
    voices.find((voice) =>
      voice.lang
        .toLowerCase()
        .startsWith(speechCode.slice(0, 2)),
    )
  );
};

export default function ChatPage() {
  const { language: appLanguage } =
    useLanguage();

  const activeAppLanguage =
    getSupportedLanguage(
      typeof appLanguage === 'string'
        ? appLanguage
        : 'en',
    );

  const [input, setInput] =
    useState('');

  const [messages, setMessages] =
    useState<ChatMessage[]>([
      createMessage(
        'assistant',
        INITIAL_MESSAGE[activeAppLanguage],
      ),
    ]);

  const [isListening, setIsListening] =
    useState(false);

  const [isReplying, setIsReplying] =
    useState(false);

  const [
    isVoiceSupported,
    setIsVoiceSupported,
  ] = useState(true);

  const [language, setLanguage] =
    useState<VoiceLanguage>(
      activeAppLanguage,
    );

  const recognitionRef =
    useRef<SpeechRecognitionLike | null>(
      null,
    );

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const selectedLanguageRef =
    useRef<VoiceLanguage>(
      activeAppLanguage,
    );

  const addSystemMessage =
    useCallback((text: string) => {
      setMessages(
        (previousMessages) => [
          ...previousMessages,
          createMessage(
            'assistant',
            text,
          ),
        ],
      );
    }, []);

  useEffect(() => {
    selectedLanguageRef.current =
      language;

    if (recognitionRef.current) {
      recognitionRef.current.lang =
        SPEECH_CODE[language];
    }
  }, [language]);

  useEffect(() => {
    setLanguage(activeAppLanguage);

    setMessages([
      createMessage(
        'assistant',
        INITIAL_MESSAGE[
          activeAppLanguage
        ],
      ),
    ]);
  }, [activeAppLanguage]);

  /**
   * Microphone / Speech Recognition
   */
  useEffect(() => {
    if (
      typeof window === 'undefined'
    ) {
      return;
    }

    const browserWindow =
      window as typeof window & {
        SpeechRecognition?:
          SpeechRecognitionConstructor;

        webkitSpeechRecognition?:
          SpeechRecognitionConstructor;
      };

    const SpeechRecognition =
      browserWindow.SpeechRecognition ??
      browserWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsVoiceSupported(false);
      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.lang =
      SPEECH_CODE[
        selectedLanguageRef.current
      ];

    recognition.onresult = (
      event,
    ) => {
      const transcript =
        event.results[0]?.[0]
          ?.transcript?.trim();

      if (transcript) {
        setInput(transcript);
      }

      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (
      event,
    ) => {
      setIsListening(false);

      if (
        event.error !== 'aborted' &&
        event.error !== 'no-speech'
      ) {
        addSystemMessage(
          VOICE_ERROR_MESSAGE[
            selectedLanguageRef.current
          ],
        );
      }
    };

    recognitionRef.current =
      recognition;

    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;

      recognition.abort();

      recognitionRef.current = null;
    };
  }, [addSystemMessage]);

  /**
   * Auto scroll
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: 'smooth',
        block: 'nearest',
      },
    );
  }, [messages, isReplying]);

  /**
   * Stop voice when leaving page
   */
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  /**
   * AI voice output
   */
  const speakText = useCallback(
    (
      text: string,
      selectedLanguage: VoiceLanguage,
    ) => {
      if (
        typeof window ===
          'undefined' ||
        !(
          'speechSynthesis' in window
        )
      ) {
        return;
      }

      window.speechSynthesis.cancel();

      const utterance =
        new SpeechSynthesisUtterance(
          text,
        );

      const speechCode =
        SPEECH_CODE[
          selectedLanguage
        ];

      utterance.lang =
        speechCode;

      utterance.rate = 0.95;
      utterance.pitch = 1;

      const voices =
        window.speechSynthesis.getVoices();

      const bestVoice =
        findBestVoice(
          voices,
          selectedLanguage,
        );

      if (bestVoice) {
        utterance.voice =
          bestVoice;
      }

      window.speechSynthesis.speak(
        utterance,
      );
    },
    [],
  );

  const handleLanguageChange = (
    selectedLanguage: VoiceLanguage,
  ) => {
    recognitionRef.current?.abort();

    window.speechSynthesis?.cancel();

    setLanguage(
      selectedLanguage,
    );

    setInput('');

    setIsListening(false);
    setIsReplying(false);

    setMessages([
      createMessage(
        'assistant',
        INITIAL_MESSAGE[
          selectedLanguage
        ],
      ),
    ]);
  };

  /**
   * REAL LLM REQUEST
   */
  const handleSend = async () => {
    const messageText =
      input.trim();

    if (
      !messageText ||
      isReplying
    ) {
      return;
    }

    const selectedLanguage =
      language;

    const userMessage =
      createMessage(
        'user',
        messageText,
      );

    /**
     * Keep recent history.
     */
    const historyForRequest = [
      ...messages,
      userMessage,
    ].slice(-20);

    setMessages(
      (previousMessages) => [
        ...previousMessages,
        userMessage,
      ],
    );

    setInput('');
    setIsReplying(true);

    try {
      const response =
        await fetch(
          '/api/ai/chat',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            cache: 'no-store',

            body: JSON.stringify({
              language:
                selectedLanguage,

              messages:
                historyForRequest.map(
                  (message) => ({
                    role:
                      message.role,

                    content:
                      message.text,
                  }),
                ),
            }),
          },
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (
        !response.ok ||
        !data?.reply
      ) {
        throw new Error(
          data?.message ||
            'AI request failed.',
        );
      }

      const reply =
        String(
          data.reply,
        ).trim();

      setMessages(
        (previousMessages) => [
          ...previousMessages,

          createMessage(
            'assistant',
            reply,
          ),
        ],
      );

      speakText(
        reply,
        selectedLanguage,
      );
    } catch (error) {
      console.error(
        'PHCL AI chat error:',
        error,
      );

      setMessages(
        (previousMessages) => [
          ...previousMessages,

          createMessage(
            'assistant',
            AI_ERROR_MESSAGE[
              selectedLanguage
            ],
          ),
        ],
      );
    } finally {
      setIsReplying(false);
    }
  };

  /**
   * Microphone button
   */
  const toggleListening = () => {
    const recognition =
      recognitionRef.current;

    if (!recognition) {
      addSystemMessage(
        VOICE_UNAVAILABLE_MESSAGE[
          language
        ],
      );

      return;
    }

    if (isListening) {
      recognition.stop();
      return;
    }

    try {
      recognition.lang =
        SPEECH_CODE[language];

      recognition.start();

      setIsListening(true);
    } catch {
      setIsListening(false);

      addSystemMessage(
        VOICE_ERROR_MESSAGE[
          language
        ],
      );
    }
  };

  /**
   * FIX FOR KEYBOARD + NUMPAD ENTER
   */
  const handleInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    const isEnter =
      event.key === 'Enter' ||
      event.code === 'Enter' ||
      event.code === 'NumpadEnter';

    if (
      isEnter &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();

      void handleSend();
    }
  };

  const canSend =
    input.trim().length > 0 &&
    !isReplying;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[#1a0c2e] p-4 pb-24 text-white sm:p-6">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* HEADER */}

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
              Multilingual LLM • Voice &amp; Text Support
            </p>

          </div>

        </header>

        {/* LANGUAGES */}

        <section
          className="flex flex-wrap gap-2 rounded-xl border border-white/5 bg-slate-900/60 p-3"
          aria-label="Chat language"
        >

          {VOICE_LANGUAGE_LABELS.map(
            (option) => (

              <button
                key={option.code}
                type="button"

                onClick={() =>
                  handleLanguageChange(
                    option.code,
                  )
                }

                aria-pressed={
                  language ===
                  option.code
                }

                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  language ===
                  option.code
                    ? 'bg-purple-600 text-white'
                    : 'border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >

                {option.label}

              </button>

            ),
          )}

        </section>

        {/* CHAT */}

        <section
          className="h-96 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/40 p-4 shadow-inner backdrop-blur-md"
          aria-label="Chat messages"
          aria-live="polite"
        >

          {messages.map(
            (message) => (

              <div
                key={message.id}

                className={`flex ${
                  message.role ===
                  'user'
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >

                <div
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm ${
                    message.role ===
                    'user'
                      ? 'rounded-tr-none bg-purple-600 text-white'
                      : 'rounded-tl-none border border-white/5 bg-slate-800 text-gray-200'
                  }`}
                >

                  {message.text}

                </div>

              </div>

            ),
          )}

          {isReplying && (

            <div className="flex justify-start">

              <div className="rounded-2xl rounded-tl-none border border-white/5 bg-slate-800 px-4 py-2.5 text-sm text-gray-400">

                <span className="animate-pulse">
                  PHCL AI inajibu...
                </span>

              </div>

            </div>

          )}

          <div
            ref={messagesEndRef}
          />

        </section>

        {/* INPUT */}

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 p-2">

          {/* MICROPHONE */}

          <button
            type="button"

            onClick={
              toggleListening
            }

            disabled={
              !isVoiceSupported ||
              isReplying
            }

            aria-label={
              isListening
                ? 'Stop voice recognition'
                : 'Start voice recognition'
            }

            title={
              isVoiceSupported
                ? undefined
                : VOICE_UNAVAILABLE_MESSAGE[
                    language
                  ]
            }

            className={`rounded-lg p-3 transition ${
              isListening
                ? 'animate-pulse bg-red-500 text-white'
                : 'bg-slate-800 text-purple-400 hover:bg-slate-700'
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >

            {isListening ? (

              <MicOff
                size={20}
                aria-hidden="true"
              />

            ) : (

              <Mic
                size={20}
                aria-hidden="true"
              />

            )}

          </button>

          {/* TEXT INPUT */}

          <input
            type="text"

            value={input}

            onChange={(event) =>
              setInput(
                event.target.value,
              )
            }

            onKeyDown={
              handleInputKeyDown
            }

            placeholder={
              PLACEHOLDER[
                language
              ]
            }

            aria-label={
              PLACEHOLDER[
                language
              ]
            }

            autoComplete="off"

            enterKeyHint="send"

            disabled={
              isReplying
            }

            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 disabled:opacity-60"
          />

          {/* SEND */}

          <button
            type="button"

            onClick={() =>
              void handleSend()
            }

            disabled={!canSend}

            aria-label="Send message"

            className="rounded-lg bg-purple-600 p-3 text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40"
          >

            <Send
              size={18}
              aria-hidden="true"
            />

          </button>

        </div>

      </div>
    </main>
  );
}