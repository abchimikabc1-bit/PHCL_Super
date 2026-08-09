'use client';

import { type MarketplaceProduct } from '@/lib/marketplace-products';
import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';

interface ChatProps {
  darkMode: boolean;
  language?: string;
}

const phclKnowledge = {
  en: {
    greeting: 'Hello! I am the PHCL Super AI Assistant. How can I help you today?',
    about: 'PHCL Super is a cryptocurrency trading platform where you can trade Bitcoin, Ethereum, Pi Network, and more. We also have a marketplace for buying vehicles, construction materials, and appliances.',
    trading: 'PHCL Super offers live cryptocurrency trading with real-time price updates. You can trade BTC, ETH, PI, USDT, and more.',
    marketplace: 'Our marketplace has three main categories: Motor Vehicles (cars, trucks, motorcycles), Construction Materials (paint, cement, tiles), and Appliances (furniture, TVs, washing machines).',
    wallet: 'Your wallet is live and shows real-time balances for all your cryptocurrencies. You can send, receive, and swap assets directly.',
    payment: 'We accept payments in multiple currencies: Tanzanian Shillings (TZS), US Dollars (USD), and Pi Network cryptocurrency (PI).',
    contact: 'Contact us at: Email: abchimikabc1@gmail.com | Phone: +255 693 863 356',
    default: 'I can help you with questions about PHCL Super, cryptocurrency trading, our marketplace, wallet features, and more. What would you like to know?',
  },
  sw: {
    greeting: 'Habari! Mimi ni Msaidizi wa AI wa PHCL Super. Je, ninaweza kukusaidia nini leo?',
    about: 'PHCL Super ni jukwaa la biashara ya sarafu za kidijitali (kama Bitcoin, Ethereum, Pi Network) na soko la mtandaoni kwa ajili ya kununua magari, vifaa vya ujenzi, na vifaa vya majumbani.',
    trading: 'PHCL Super inatoa fursa ya biashara ya sarafu za kidijitali na sasisho la bei mubashara (real-time). Unaweza kufanya biashara ya BTC, ETH, PI, USDT, na nyinginezo.',
    marketplace: 'Soko letu lina vipengele vitatu vikuu: Magari (magari, malori, pikipiki), Vifaa vya Ujenzi (rangi, saruji, vigae), na Vifaa vya Majumbani (samani, TV, mashine za kufua).',
    wallet: 'Pochi yako ipo mubashara na inaonyesha salio la sarafu zako zote za kidijitali. Unaweza kutuma, kupokea, na kubadilisha fedha (swap) moja kwa moja.',
    payment: 'Tunakubali malipo kwa sarafu nyingi: Shilingi za Kitanzania (TZS), Dola za Kimarekani (USD), na sarafu ya Pi Network (PI).',
    contact: 'Wasiliana nasi kupitia Barua pepe: abchimikabc1@gmail.com | Simu: +255 693 863 356',
    default: 'Naweza kukusaidia kujibu maswali kuhusu PHCL Super, biashara ya crypto, soko letu, matumizi ya pochi, na mengineyo. Je, ungependa kujua nini?',
  },
};

const getResponse = (message: string, language: string): string => {
  const msg = message.toLowerCase().trim();
  // Tumia lugha iliyochaguliwa, kama haipo tumia Kiingereza kama mbadala
  const kb = phclKnowledge[language as keyof typeof phclKnowledge] || phclKnowledge.en;

  // Greetings
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('habari') || msg.includes('jambo') || msg.includes('mambo') || msg.includes('asalamu') || msg.includes('niaje')) {
    return kb.greeting;
  }
  
  // About/Info
  if (msg.includes('about') || msg.includes('what is') || msg.includes('kuhusu') || msg.includes('nini') || msg.includes('ni nini') || msg.includes('je phcl')) {
    return kb.about;
  }
  
  // Trading
  if (msg.includes('trading') || msg.includes('trade') || msg.includes('crypto') || msg.includes('bitcoin') || msg.includes('ethereum') || msg.includes('biashara') || msg.includes('kuuza') || msg.includes('kununua crypto')) {
    return kb.trading;
  }
  
  // Marketplace/Shop
  if (msg.includes('marketplace') || msg.includes('market') || msg.includes('shop') || msg.includes('soko') || msg.includes('buy') || msg.includes('product') || msg.includes('cars') || msg.includes('magari') || msg.includes('vifaa')) {
    return kb.marketplace;
  }
  
  // Wallet
  if (msg.includes('wallet') || msg.includes('balance') || msg.includes('pochi') || msg.includes('salio') || msg.includes('send') || msg.includes('receive') || msg.includes('swap') || msg.includes('tuma') || msg.includes('pokea')) {
    return kb.wallet;
  }
  
  // Payment/Pricing
  if (msg.includes('payment') || msg.includes('price') || msg.includes('cost') || msg.includes('malipo') || msg.includes('bei') || msg.includes('currency') || msg.includes('usd') || msg.includes('shilingi') || msg.includes('pi network')) {
    return kb.payment;
  }
  
  // Contact
  if (msg.includes('contact') || msg.includes('email') || msg.includes('phone') || msg.includes('simu') || msg.includes('wasiliana') || msg.includes('number') || msg.includes('namba')) {
    return kb.contact;
  }
  
  return kb.default;
};

export function Chat({ darkMode, language = 'en' }: ChatProps) {
  const [messages, setMessages] = useState<Array<{ type: 'user' | 'bot'; text: string }>>([
    { type: 'bot', text: phclKnowledge[language as keyof typeof phclKnowledge]?.greeting || phclKnowledge.en.greeting },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset greeting when language changes
  useEffect(() => {
    const newGreeting = phclKnowledge[language as keyof typeof phclKnowledge]?.greeting || phclKnowledge.en.greeting;
    setMessages([{ type: 'bot', text: newGreeting }]);
  }, [language]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    const userMessage = { type: 'user' as const, text: inputValue };
    const botResponse = { type: 'bot' as const, text: getResponse(inputValue, language) };
    
    setMessages(prev => [...prev, userMessage, botResponse]);
    setInputValue('');
  };

  return (
    <div className={`${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-gradient-to-br from-blue-50 to-cyan-50'} rounded-2xl p-6 shadow-sm`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-xl sm:text-2xl font-extrabold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
          PHCL AI Assistant
        </h2>
        <div className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 ${
          darkMode
            ? 'bg-slate-800 text-slate-200 border border-slate-700'
            : 'bg-white text-slate-700 border border-slate-300'
        }`}>
          {language === 'en' ? '🇬🇧 English' : '🇹🇿 Kiswahili'}
        </div>
      </div>

      <div className={`h-[350px] overflow-y-auto mb-4 p-4 border rounded-xl space-y-4 ${
        darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl ${
              msg.type === 'user'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-br-sm shadow-md'
                : darkMode
                ? 'bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700'
                : 'bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-200'
            }`}>
              <p className="text-sm leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder={language === 'en' ? 'Ask me anything...' : 'Uliza chochote kuhusu PHCL...'}
          className={`flex-1 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow ${
            darkMode
              ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
              : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
          }`}
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputValue.trim()}
          className="px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold shadow-lg rounded-xl transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={18} />
        </button>
      </div>

      <p className={`text-xs mt-4 text-center font-medium ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
        {language === 'en' 
          ? 'Ask about trading, marketplace, your wallet, or general info.'
          : 'Niulize kuhusu biashara, soko, pochi yako, au maelezo ya jumla.'}
      </p>
    </div>
  );
}