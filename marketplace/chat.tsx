'use client';

import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';

interface ChatProps {
  darkMode: boolean;
  language?: string;
}

const phclKnowledge = {
  en: {
    greeting: 'Hello! I am PHCL Super AI Assistant. How can I help you today?',
    about: 'PHCL Super is a cryptocurrency trading platform where you can trade Bitcoin, Ethereum, Pi Network, and more. We also have a marketplace for buying vehicles, construction materials, and appliances.',
    trading: 'PHCL Super offers live cryptocurrency trading with real-time price updates. You can trade BTC, ETH, PI, USDT, and more.',
    marketplace: 'Our marketplace has three main categories: Motor Vehicles (cars, trucks, motorcycles), Construction Materials (paint, cement, tiles), and Appliances (furniture, TVs, washing machines).',
    wallet: 'Your wallet is live and shows real-time balances for all your cryptocurrencies. You can send, receive, and swap assets directly.',
    payment: 'We accept payments in multiple currencies: Tanzanian Shillings (TZS), US Dollars (USD), and Pi Network cryptocurrency (PI).',
    contact: 'Contact us at: Email: abchimikabc1@gmail.com | Phone: +255 693 863 356',
    default: 'I can help you with questions about PHCL Super, cryptocurrency trading, our marketplace, wallet features, and more. What would you like to know?',
  },
  sw: {
    greeting: 'Habari! Mimi ni Msaada wa AI wa PHCL Super. Unaweza kuniweza nini leo?',
    about: 'PHCL Super ni jukwaa la kuuza bitcoin, Ethereum, Pi Network, na zaidi. Pia tunayo soko la kununua magari, vifaa vya kujenga, na vifaa vya nyumbani.',
    trading: 'PHCL Super inatoa uuzaji wa cryptocurrency na updates ya bei katika hivi karibuni. Unaweza kuuza BTC, ETH, PI, USDT, na zaidi.',
    marketplace: 'Soko letu lina vikundi vitatu: Magari (magari, lori, baiskeli), Vifaa vya Kujenga (rangi, sementi, vigae), na Vifaa vya Nyumba (sofa, TV, mashine ya kuosha).',
    wallet: 'Pochi yako inatembea kwa moja kwa moja na inaonyesha balansi ya cryptocurrency zako. Unaweza kutuma, kupokea, na kubadilisha mali.',
    payment: 'Tunakubali malipo kwa sarafu nyingi: Shilingi za Tanzaniya (TZS), Dola za Kiamerika (USD), na Pi Network (PI).',
    contact: 'Wasiliana nasi: Email: abchimikabc1@gmail.com | Simu: +255 693 863 356',
    default: 'Naweza kukusaidia na maswali kuhusu PHCL Super, uuzaji wa cryptocurrency, soko letu, vipengele vya pochi, na zaidi. Unataka kujua nini?',
  },
};

const getResponse = (message: string, language: string): string => {
  const msg = message.toLowerCase().trim();
  const kb = phclKnowledge[language as keyof typeof phclKnowledge];

  // Greetings
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('habari') || msg.includes('jambo') || msg.includes('asalamu')) {
    return kb.greeting;
  }
  
  // About/Info
  if (msg.includes('about') || msg.includes('what is phcl') || msg.includes('kuhusu') || msg.includes('nini') || msg.includes('je phcl')) {
    return kb.about;
  }
  
  // Trading
  if (msg.includes('trading') || msg.includes('trade') || msg.includes('crypto') || msg.includes('bitcoin') || msg.includes('ethereum') || msg.includes('uuzaji') || msg.includes('bitcoin') || msg.includes('ethereum')) {
    return kb.trading;
  }
  
  // Marketplace/Shop
  if (msg.includes('marketplace') || msg.includes('market') || msg.includes('shop') || msg.includes('soko') || msg.includes('buy') || msg.includes('product') || msg.includes('cars') || msg.includes('phones')) {
    return kb.marketplace;
  }
  
  // Wallet
  if (msg.includes('wallet') || msg.includes('balance') || msg.includes('pochi') || msg.includes('balansi') || msg.includes('send') || msg.includes('receive') || msg.includes('swap')) {
    return kb.wallet;
  }
  
  // Payment/Pricing
  if (msg.includes('payment') || msg.includes('price') || msg.includes('cost') || msg.includes('malipo') || msg.includes('bei') || msg.includes('currency') || msg.includes('usd') || msg.includes('pi network')) {
    return kb.payment;
  }
  
  // Contact
  if (msg.includes('contact') || msg.includes('email') || msg.includes('phone') || msg.includes('simu') || msg.includes('wasiliana') || msg.includes('number')) {
    return kb.contact;
  }
  
  return kb.default;
};

export function Chat({ darkMode, language = 'en' }: ChatProps) {
  const [messages, setMessages] = useState<Array<{ type: 'user' | 'bot'; text: string }>>([
    { type: 'bot', text: phclKnowledge[language as keyof typeof phclKnowledge].greeting },
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
    const newGreeting = phclKnowledge[language as keyof typeof phclKnowledge].greeting;
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
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-gradient-to-br from-blue-50 to-cyan-50'} rounded-lg p-6`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : ''}`}>PHCL AI Assistant</h2>
        <div className={`px-3 py-2 rounded-lg font-semibold ${
          darkMode
            ? 'bg-gray-700 text-white'
            : 'bg-white text-gray-700 border border-gray-300'
        }`}>
          {language === 'en' ? '🇬🇧 English' : '🇹🇿 Kiswahili'}
        </div>
      </div>

      <div className={`h-80 overflow-y-auto mb-4 p-4 border rounded space-y-3 ${
        darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
      }`}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              msg.type === 'user'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                : darkMode
                ? 'bg-gray-600 text-gray-100'
                : 'bg-gray-100 text-gray-800'
            }`}>
              <p className="text-sm">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder={language === 'en' ? 'Ask about PHCL Super...' : 'Uliza kuhusu PHCL Super...'}
          className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            darkMode
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-800'
          }`}
        />
        <button
          onClick={handleSendMessage}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg rounded-lg transition-all flex items-center gap-2"
        >
          <Send size={18} />
        </button>
      </div>

      <p className={`text-xs mt-2 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {language === 'en' 
          ? 'Ask me anything about PHCL Super, trading, marketplace, wallet, or other topics!'
          : 'Niulize kuhusu PHCL Super, uuzaji, soko, pochi, au mada nyingine!'}
      </p>
    </div>
  );
}
