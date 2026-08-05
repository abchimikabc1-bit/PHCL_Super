// components/ai-assistant.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, User, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/use-language';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export default function AIAssistant() {
  const { language } = useLanguage();
  const isSw = language === 'sw';

  const copy = {
    title: isSw ? 'PHCL AI Assistant' : 'PHCL AI Assistant',
    subtitle: isSw ? 'Uliza lolote kuhusu soko, wallet, au Pi GCV ya PHCL Super' : 'Ask anything about PHCL Super marketplace, wallet, or Pi GCV',
    placeholder: isSw ? 'Andika swali lako hapa...' : 'Type your question here...',
    sendBtn: isSw ? 'Tuma' : 'Send',
    clearBtn: isSw ? 'Futa Mazungumzo' : 'Clear Chat',
    thinking: isSw ? 'AI inafikiri...' : 'AI is thinking...',
    errorMsg: isSw ? 'Imeshindikana kuungana na msaidizi wa AI.' : 'Failed to connect to the AI assistant.',
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isThinking) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: trimmedInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmedInput }),
      });

      if (!response.ok) {
        throw new Error('API Request failed');
      }

      const data = await response.json();
      const aiMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: data.response || 'Samahani, nimeshindwa kuelewa.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch {
      toast.error(copy.errorMsg);
    } finally {
      setIsThinking(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    toast.info(isSw ? 'Mazungumzo yamefutwa.' : 'Chat cleared.');
  };

  return (
    <div className="w-full max-w-2xl mx-auto rounded-3xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 backdrop-blur-2xl shadow-2xl global-glass">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              {copy.title}
              <Sparkles size={14} className="text-amber-400 animate-pulse" />
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{copy.subtitle}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClearChat}
            className="p-2 text-rose-400 hover:text-rose-300 hover:bg-white/5 rounded-lg transition"
            title={copy.clearBtn}
          >
            <Trash size={16} />
          </button>
        )}
      </div>

      {/* Messages Window */}
      <div className="h-80 overflow-y-auto pr-1 space-y-4 mb-4 text-xs scrollbar-thin scrollbar-thumb-slate-800">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2 py-10">
            <Bot size={36} className="text-slate-600 animate-bounce" />
            <p className="text-sm font-medium">Habari! Mimi ni PHCL AI Assistant.</p>
            <p className="text-[11px] max-w-xs leading-relaxed">
              Andika ujumbe wowote hapa chini kuniuliza kuhusu Soko, Pochi yetu, au viwango vya kubadilisha sarafu!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-slate-950 text-xs shadow-md ${
                  isUser ? 'bg-amber-400' : 'bg-slate-800 text-white'
                }`}>
                  {isUser ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`rounded-2xl px-3.5 py-2.5 leading-relaxed space-y-1 ${
                  isUser 
                    ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 text-amber-50 rounded-tr-none' 
                    : 'bg-slate-950/70 border border-white/5 text-slate-200 rounded-tl-none'
                }`}>
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <span className="block text-[9px] text-slate-500 text-right font-mono">{msg.timestamp}</span>
                </div>
              </div>
            );
          })
        )}

        {isThinking && (
          <div className="flex gap-2.5 max-w-[85%]">
            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-white text-xs shadow-md animate-pulse">
              <Bot size={14} />
            </div>
            <div className="bg-slate-950/70 border border-white/5 rounded-2xl rounded-tl-none px-3.5 py-2.5 text-slate-400 italic animate-pulse">
              {copy.thinking}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Form Input */}
      <form onSubmit={handleSendMessage} className="flex gap-2 text-xs">
        <input
          type="text"
          required
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isThinking}
          placeholder={copy.placeholder}
          style={{ minHeight: '44px' }}
          className="flex-1 rounded-xl border border-white/20 bg-slate-950 px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isThinking || !input.trim()}
          style={{ minHeight: '44px' }}
          className={`rounded-xl px-4 py-2 font-black transition flex items-center gap-1.5 shadow-lg ${
            isThinking || !input.trim()
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
              : 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 hover:bg-amber-300'
          }`}
        >
          <Send size={14} />
          {copy.sendBtn}
        </button>
      </form>
    </div>
  );
}
