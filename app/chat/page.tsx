'use client';

import { useState, useEffect } from 'react';
import { Mic, MicOff, Send, Sparkles } from 'lucide-react';

export default function ChatPage() {
  const [input, setFormInput] = useState('');
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', text: 'Jambo! I am your PHCL AI. Ungependa kuongea kwa Kiswahili, English, Français, au 中文?' }
  ]);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

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

  const detectLanguageAndRespond = (userInput: string) => {
    const text = userInput.toLowerCase();
    let reply = "I can speak Swahili, English, French, and Chinese. Ask me anything!";
    let lang = "en-US";

    if (text.includes('jambo') || text.includes('habari') || text.includes('kiswahili') || text.includes('mambo') || text.includes('pochi')) {
      reply = "Habari! Mimi ni msaidizi wako wa AI wa PHCL Super. Pochi yako ya kisasa ipo salama na miamala inafanya kazi vizuri!";
      lang = "sw-TZ";
    } else if (text.includes('bonjour') || text.includes('salut') || text.includes('francais')) {
      reply = "Bonjour! Je suis votre assistant PHCL AI. Votre portefeuille numérique est entièrement sécurisé.";
      lang = "fr-FR";
    } else if (text.includes('ni hao') || text.includes('你好') || text.includes('zhongwen')) {
      reply = "你好！我是您的 PHCL 智能助手。您的数字钱包安全可靠。";
      lang = "zh-CN";
    } else if (text.includes('hello') || text.includes('hi') || text.includes('english') || text.includes('wallet')) {
      reply = "Hello! I am your PHCL AI Assistant. Your digital wallet and exchanger are fully optimized and ready.";
      lang = "en-US";
    }
    return { reply, lang };
  };

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', text: input }]);
    setFormInput('');
    const { reply, lang } = detectLanguageAndRespond(input);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
      speakText(reply, lang);
    }, 800);
  };

  const toggleListening = () => {
    if (!recognition) return;
    if (isListening) { recognition.stop(); } 
    else { recognition.lang = 'sw-TZ'; recognition.start(); setIsListening(true); }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[#1a0c2e] text-white p-6 pb-24">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-purple-500/20 p-2 border border-purple-400/40 shadow-[0_0_15px_rgba(168,85,247,0.5)]"><Sparkles className="text-purple-300 animate-spin" size={22} /></div>
          <div><h1 className="text-2xl font-black text-amber-200">PHCL AI Assistant</h1><p className="text-xs text-gray-400">Multilingual Voice & Text Support</p></div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 h-96 overflow-y-auto space-y-3 shadow-inner backdrop-blur-md">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-slate-800 text-gray-200 rounded-tl-none border border-white/5'}`}>{msg.text}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 p-2">
          <button onClick={toggleListening} className={`p-3 rounded-lg transition ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-purple-400'}`}>{isListening ? <MicOff size={20} /> : <Mic size={20} />}</button>
          <input type="text" value={input} onChange={(e) => setFormInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Andika au zungumza (Kiswahili/English/Franch/中文)..." className="flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none" />
          <button onClick={handleSend} className="p-3 rounded-lg bg-purple-600 text-white hover:bg-purple-500"><Send size={18} /></button>
        </div>
      </div>
    </main>
  );
}
