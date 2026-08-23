
'use client';

import { useState, useEffect } from 'react';
import { Mic, MicOff, Send, Sparkles } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';

type VoiceLanguage = 'sw' | 'en' | 'zh' | 'fr';

const SPEECH_CODE: Record<VoiceLanguage, string> = {
  sw: 'sw-TZ', en: 'en-US', zh: 'zh-CN', fr: 'fr-FR',
};

// 1. MFUMO WA KIFAHARI WA MAJIBU YA AI KWA LUGHA ZOTE 4 (PHCL, BLOCKCHAIN, NA UCHUMI)
const getAiResponse = (input: string, lang: VoiceLanguage): string => {
  const q = input.toLowerCase();
  
  const copy = {
    sw: {
      blockchain: "Blockchain ni teknolojia ya usambazaji salama wa kumbukumbu (decentralized ledger). Kwenye PHCL Super, inalinda miamala yote na kukupa umiliki kamili wa rasilimali zako bila wasiwasi.",
      phcl: "PHCL Super ni jukwaa la kifalme linalounganisha soko (marketplace), pochi salama (wallet), na ubadilishaji wa haraka wa sarafu (exchange) kusaidia maendeleo ya kiuchumi ya kidijitali.",
      tech: "Mabadiliko ya kiteknolojia na Web3 yanajenga uchumi mpya wa kidijitali. PHCL inakuwezesha kufanya biashara kimataifa kwa sekunde chache ukitumia Pi, USD, na TZS kuzuia mfumuko wa bei.",
      help: "Miongozo ya PHCL: 1. Nenda 'Wallet' kuongeza salio au kutuma fedha. 2. Nenda 'Shop' kununua bidhaa kifalme. 3. Uhakiki wa KYC unapatikana wasifu wako ili kuongeza kikomo cha miamala.",
      default: "Mimi ni PHCL AI Assistant. Ninajua kila kitu kuhusu PHCL, Blockchain, na Uchumi wa kidijitali. Je, nikupe mwongozo gani?"
    },
    en: {
      blockchain: "Blockchain is a secure, decentralized ledger technology. On PHCL Super, it protects your transactions and grants you complete ownership of your digital assets.",
      phcl: "PHCL Super is a premium platform integrating a secure marketplace, digital wallet, and fast exchange to empower your digital economic growth.",
      tech: "Web3 and technological advancements are shaping the digital economy. PHCL enables you to trade globally in seconds using Pi, USD, and TZS to hedge against inflation.",
      help: "PHCL Guides: 1. Go to 'Wallet' to deposit or send funds. 2. Open 'Shop' to purchase products. 3. Verify your identity in 'Profile' to unlock high-limit trading.",
      default: "I am your PHCL AI Assistant. I specialize in PHCL, Blockchain, and the Digital Economy. How can I assist you today?"
    },
    fr: {
      blockchain: "La blockchain est une technologie de registre décentralisé et sécurisé. Sur PHCL Super, elle protège vos transactions et vous donne le contrôle total de vos actifs.",
      phcl: "PHCL Super est une plateforme premium intégrant un marché sécurisé, un portefeuille numérique et un échange rapide pour stimuler l'économie numérique.",
      tech: "Le Web3 et l'évolution technologique façonnent l'économie moderne. PHCL vous permet d'échanger mondialement en utilisant Pi, USD et TZS.",
      help: "Guides PHCL: 1. Allez dans 'Portefeuille' pour déposer des fonds. 2. Utilisez 'Market' pour vos achats. 3. Vérifiez votre profil pour augmenter vos limites.",
      default: "Je suis votre assistant PHCL AI. Je maîtrise la blockchain et l'économie numérique. Comment puis-je vous aider?"
    },
    zh: {
      blockchain: "区块链是一种安全的去中心化账本技术。在 PHCL Super 上，它保护您的所有交易并赋予您资产的完全控制权。",
      phcl: "PHCL Super 是一个集安全商城、数字钱包和快速兑换于一体的尊贵平台，助力您的数字经济增长。",
      tech: "Web3和科技发展正在重塑全球经济。PHCL 让您能够使用 Pi、USD 和 TZS 在数秒内进行全球贸易，防止通货膨胀。",
      help: "PHCL指南：1. 进入‘钱包’充值或发送资金。2. 打开‘商城’选购商品。3. 完善您的‘个人资料’以解锁更高交易额度。",
      default: "我是您的 PHCL 智能助手。我精通 PHCL、区块链和数字经济。今天有什么可以帮您？"
    }
  };

  const activeCopy = copy[lang] || copy.en;

  if (q.includes('blockchain') || q.includes('crypto') || q.includes('blockchain')) return activeCopy.blockchain;
  if (q.includes('phcl') || q.includes('super') || q.includes('platform')) return activeCopy.phcl;
  if (q.includes('uchumi') || q.includes('technology') || q.includes('teknolojia') || q.includes('maendeleo') || q.includes('economy')) return activeCopy.tech;
  if (q.includes('msada') || q.includes('guide') || q.includes('miongozo') || q.includes('how') || q.includes('wallet') || q.includes('soko') || q.includes('help')) return activeCopy.help;
  return activeCopy.default;
};

export default function ChatPage() {
  const { language: appLang } = useLanguage(); // Inaunganisha na lugha kuu ya app
  const activeLang: VoiceLanguage = appLang === 'sw' ? 'sw' : 'en';
  
  const [input, setFormInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [language, setLanguage] = useState<VoiceLanguage>('sw');

  useEffect(() => {
    setLanguage(activeLang);
    setMessages([{ role: 'assistant', text: activeLang === 'sw' ? 'Jambo! Mimi ni msaidizi wako wa PHCL AI. Ungependa kuongea kwa Kiswahili, English, Français, au 中文?' : 'Hello! I am your PHCL AI Assistant. Would you like to speak in Swahili, English, French, or Chinese?' }]);
  }, [activeLang]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.onresult = (e: any) => {
          setFormInput(e.results[0][0].transcript);
          setIsListening(false);
        };
        rec.onend = () => setIsListening(false);
        setRecognition(rec);
      }
    }
  }, []);

  const speakText = (text: string, langCode: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', text: input }]);
    const currentInput = input;
    setFormInput('');

    const reply = getAiResponse(currentInput, language);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
      speakText(reply, SPEECH_CODE[language]);
    }, 650);
  };

  const toggleListening = () => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
    } else {
      recognition.lang = SPEECH_CODE[language];
      recognition.start();
      setIsListening(true);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[#1a0c2e] text-white p-6 pb-24">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-purple-500/20 p-2 border border-purple-400/40 shadow-[0_0_15px_rgba(168,85,247,0.5)]">
            <Sparkles className="text-purple-300 animate-spin" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-amber-200">PHCL AI Assistant</h1>
            <p className="text-xs text-gray-400">Multilingual Voice & Text Support</p>
          </div>
        </div>

        {/* LUGHA YA SAUTI YA BOT */}
        <div className="flex flex-wrap gap-2 rounded-xl border border-white/5 bg-slate-900/60 p-3">
          {VOICE_LANGUAGE_LABELS.map((option) => (
            <button
              key={option.code}
              type="button"
              onClick={() => { setLanguage(option.code); setMessages([{ role: 'assistant', text: getAiResponse('', option.code) }]); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${language === option.code ? 'bg-purple-600 text-white' : 'border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 h-96 overflow-y-auto space-y-3 shadow-inner backdrop-blur-md">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-slate-800 text-gray-200 rounded-tl-none border border-white/5'}`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 p-2">
          <button onClick={toggleListening} className={`p-3 rounded-lg transition ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-purple-400'}`}>
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <input type="text" value={input} onChange={(e) => setFormInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Andika au zungumza hapa..." className="flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none" />
          <button onClick={handleSend} className="p-3 rounded-lg bg-purple-600 text-white hover:bg-purple-500">
            <Send size={18} />
          </button>
        </div>
      </div>
    </main>
  );
}
