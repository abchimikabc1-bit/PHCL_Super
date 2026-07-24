'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Send, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const [tab, setTab] = useState('store');
  const [language, setLanguage] = useState('en');
  const [darkMode, setDarkMode] = useState(true);

  // Arrow Game State
  const [arrowBoxX, setArrowBoxX] = useState(50);
  const [score, setScore] = useState(0);

  // Wallet State
  const [balance, setBalance] = useState({ pi: 10.5, btc: 0.25, eth: 5.0, usdt: 1000 });
  const [transactions, setTransactions] = useState([]);
  const [balanceUpdateTime, setBalanceUpdateTime] = useState(new Date());

  // Rating State
  const [ratings, setRatings] = useState([]);
  const [currentRating, setCurrentRating] = useState(0);

  // Chat State
  const [messages, setMessages] = useState([{ type: 'bot', text: 'Hello! How can I help you today?' }]);
  const [chatInput, setChatInput] = useState('');

  // Arrow game keyboard handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (tab !== 'games') return;
      if (e.key === 'ArrowLeft') {
        setArrowBoxX(prev => Math.max(10, prev - 5));
      } else if (e.key === 'ArrowRight') {
        setArrowBoxX(prev => Math.min(90, prev + 5));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tab]);

  // Auto-update balance every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setBalance(prev => ({
        ...prev,
        pi: prev.pi + (Math.random() - 0.45) * 0.01,
        btc: prev.btc + (Math.random() - 0.45) * 0.0001,
        eth: prev.eth + (Math.random() - 0.45) * 0.001,
        usdt: prev.usdt + (Math.random() - 0.45) * 1
      }));
      setBalanceUpdateTime(new Date());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Products
  const phones = [
    { id: 63, name: 'Samsung Galaxy S26 Ultra', usd: 899.99, pi: 0.00287, icon: '📱' },
    { id: 64, name: 'Samsung Galaxy S26', usd: 799.99, pi: 0.00255, icon: '📱' },
    { id: 67, name: 'iPhone 16 Pro Max', usd: 999.99, pi: 0.00318, icon: '📱' },
    { id: 68, name: 'iPhone 16 Pro', usd: 899.99, pi: 0.00287, icon: '📱' },
  ];

  const vehicles = [
    { id: 1, name: 'Toyota Corolla 2024', usd: 19999, pi: 0.0637, icon: '🚗' },
    { id: 5, name: 'Mazda CX-5 2024', usd: 27000, pi: 0.0859, icon: '🚙' },
    { id: 11, name: 'Toyota Land Cruiser 2024', usd: 70000, pi: 0.2228, icon: '🚙' },
  ];

  const handleSend = () => {
    const amount = 0.5;
    setBalance(prev => ({ ...prev, pi: prev.pi - amount }));
    setTransactions(prev => [...prev, { type: 'send', amount, time: new Date().toLocaleTimeString() }]);
  };

  const handleReceive = () => {
    const amount = 1.0;
    setBalance(prev => ({ ...prev, pi: prev.pi + amount }));
    setTransactions(prev => [...prev, { type: 'receive', amount, time: new Date().toLocaleTimeString() }]);
  };

  const handleSwap = () => {
    const swapAmount = balance.pi * 0.5;
    const receivedUsdt = swapAmount * 314159 * 1.05;
    setBalance(prev => ({ ...prev, pi: prev.pi - swapAmount, usdt: prev.usdt + receivedUsdt }));
    setTransactions(prev => [...prev, { type: 'swap', amount: swapAmount, time: new Date().toLocaleTimeString() }]);
  };

  const handleAddRating = (stars) => {
    setCurrentRating(stars);
    setRatings(prev => [...prev, { stars, time: new Date().toLocaleTimeString() }]);
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    setMessages(prev => [...prev, { type: 'user', text: chatInput }, { type: 'bot', text: 'I understand. Thank you for your message!' }]);
    setChatInput('');
  };

  const translations = {
    en: {
      store: 'Store', trading: 'Trading', chat: 'Chat', games: 'Games', settings: 'Settings',
      phones: 'Phones', vehicles: 'Vehicles', wallet: 'Wallet', send: 'Send', receive: 'Receive',
      swap: 'Swap', balance: 'Balance', pi: 'Pi Network', btc: 'Bitcoin', eth: 'Ethereum', usdt: 'USDT',
      arrowGame: 'Arrow Game - Use LEFT/RIGHT arrow keys to move', score: 'Score', rating: 'Rating', price: 'Price'
    },
    sw: {
      store: 'Soko', trading: 'Biashara', chat: 'Mazungumzo', games: 'Michezo', settings: 'Mipango',
      phones: 'Simu', vehicles: 'Magari', wallet: 'Pochi', send: 'Tuma', receive: 'Pokea',
      swap: 'Badilisha', balance: 'Balansi', pi: 'Pi Network', btc: 'Bitcoin', eth: 'Ethereum', usdt: 'USDT',
      arrowGame: 'Mchezo wa Mshale - Tumia mshale wa KUSHOTO/KULIA kuhamia', score: 'Alama', rating: 'Tathmini', price: 'Bei'
    }
  };

  const t = translations[language] || translations.en;

  return (
    <div className={`min-h-screen relative transition-colors duration-300 ${darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Bendera na Uhuishaji */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes wave {
          0% { transform: translateY(0) rotate(0deg) skewX(0deg); }
          25% { transform: translateY(-3px) rotate(1.5deg) skewX(1deg); }
          50% { transform: translateY(1px) rotate(-1.5deg) skewX(-1deg); }
          75% { transform: translateY(-2px) rotate(0.7deg) skewX(0.7deg); }
          100% { transform: translateY(0) rotate(0deg) skewX(0deg); }
        }
        .animate-flag-wave {
          animation: wave 4s ease-in-out infinite;
          transform-origin: left center;
        }
      `}} />

      {/* AI Assistant Floating Button */}
      <Link 
        href="/chat"
        className="fixed top-24 right-4 z-40 flex items-center gap-2 rounded-full border border-yellow-500/30 bg-purple-950/80 p-3 backdrop-blur-md hover:bg-purple-900/90 transition shadow-xl animate-bounce"
        style={{ animationDuration: '3s' }}
      >
        <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
        <span className="hidden sm:inline text-xs font-bold text-yellow-400">Msaidizi wa AI</span>
      </Link>

      {/* Header ya Kifahari */}
      <header className={`sticky top-0 z-30 backdrop-blur-md border-b ${darkMode ? 'bg-gray-900/80 border-gray-800' : 'bg-white/80 border-gray-200'} p-4 shadow-md`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              src="/flag.svg" 
              alt="PHCL Flag" 
              className="w-10 h-auto object-contain filter drop-shadow-[0_0_8px_rgba(234,179,8,0.4)] animate-flag-wave" 
            />
            <h1 className="text-2xl font-black bg-gradient-to-r from-yellow-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              PHCL Super
            </h1>
          </div>
          <div className="flex gap-4 items-center">
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)} 
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`}
            >
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
            </select>
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className={`p-2 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700 text-yellow-400' : 'bg-gray-100 border-gray-300 text-gray-700'}`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-8 pb-32">
        {/* Store Tab */}
        {tab === 'store' && (
          <div className="space-y-10">
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><span>📱</span> {t.phones}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {phones.map(p => (
                  <div key={p.id} className={`p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] shadow-xl ${darkMode ? 'bg-gray-900/90 border-gray-800 hover:border-blue-500/50' : 'bg-white border-gray-200 hover:border-blue-400'}`}>
                    <div className="text-5xl mb-4 p-3 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl w-fit">{p.icon}</div>
                    <p className="font-bold text-base mb-1">{p.name}</p>
                    <p className="text-sm font-semibold opacity-75">${p.usd.toFixed(2)}</p>
                    <p className="text-sm font-extrabold text-yellow-500 mt-1">Π{p.pi.toFixed(6)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><span>🚗</span> {t.vehicles}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vehicles.map(v => (
                  <div key={v.id} className={`p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] shadow-xl ${darkMode ? 'bg-gray-900/90 border-gray-800 hover:border-purple-500/50' : 'bg-white border-gray-200 hover:border-purple-400'}`}>
                    <div className="text-5xl mb-4 p-3 bg-gradient-to-br from-yellow-500/10 to-red-500/10 rounded-xl w-fit">{v.icon}</div>
                    <p className="font-bold text-base mb-1">{v.name}</p>
                    <p className="text-sm font-semibold opacity-75">${v.usd.toFixed(2)}</p>
                    <p className="text-sm font-extrabold text-yellow-500 mt-1">Π{v.pi.toFixed(6)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Trading Tab */}
        {tab === 'trading' && (
          <div className="space-y-6">
            <div className={`p-6 rounded-2xl border shadow-2xl ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><span>💰</span> {t.wallet}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-xs font-medium text-gray-400">{t.pi}</p>
                  <p className="text-2xl font-black text-yellow-500 mt-1">Π{balance.pi.toFixed(4)}</p>
                </div>
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-xs font-medium text-gray-400">{t.btc}</p>
                  <p className="text-2xl font-black text-orange-400 mt-1">₿{balance.btc.toFixed(5)}</p>
                </div>
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-xs font-medium text-gray-400">{t.eth}</p>
                  <p className="text-2xl font-black text-blue-400 mt-1">Ξ{balance.eth.toFixed(3)}</p>
                </div>
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-xs font-medium text-gray-400">{t.usdt}</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">${balance.usdt.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mb-8">
                <button onClick={handleSend} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-105">💸 {t.send}</button>
                <button onClick={handleReceive} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-105">📥 {t.receive}</button>
                <button onClick={handleSwap} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-105">🔄 {t.swap}</button>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-3">Transaction History</h3>
                <div className="space-y-2 text-sm">
                  {transactions.slice(-5).reverse().map((tx, i) => (
                    <div key={i} className={`p-3 rounded-lg flex justify-between border ${darkMode ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                      <span className="font-semibold uppercase text-blue-400">{tx.type}</span>
                      <span className="font-bold">Π{tx.amount.toFixed(4)}</span>
                      <span className="text-gray-400 text-xs">{tx.time}</span>
                    </div>
                  ))}
                  {transactions.length === 0 && <p className="text-gray-500 italic">No transactions yet.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Tab */}
        {tab === 'chat' && (
          <div className={`p-6 rounded-2xl border max-w-2xl mx-auto shadow-2xl ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><span>🤖</span> AI Chat</h2>
            <div className="space-y-4 mb-4 h-72 overflow-y-auto p-3 rounded-xl border border-gray-800/30 bg-black/20">
              {messages.map((msg, i) => (
                <div key={i} className={`p-3.5 rounded-2xl max-w-[80%] text-sm ${msg.type === 'user' ? 'bg-blue-600 text-white ml-auto rounded-br-none' : 'bg-gray-800 text-gray-200 mr-auto rounded-bl-none border border-gray-700'}`}>
                  {msg.text}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type message..." 
                className={`flex-1 p-3 rounded-xl border outline-none font-medium ${darkMode ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'}`} 
              />
              <button onClick={handleSendMessage} className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg transition-transform hover:scale-105"><Send size={20} /></button>
            </div>
          </div>
        )}

        {/* Games Tab */}
        {tab === 'games' && (
          <div className={`p-6 rounded-2xl border shadow-2xl max-w-3xl mx-auto ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><span>🎮</span> {t.arrowGame}</h2>
            <div className={`h-64 rounded-2xl border-4 relative mb-4 overflow-hidden shadow-inner ${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-gray-100 border-gray-300'}`}>
              <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-sm font-bold">
                <span>Score: {score}</span>
                <span className="text-xs text-gray-400">Use Arrow Keys ← →</span>
              </div>
              <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                <div style={{ left: `${arrowBoxX}%` }} className="absolute w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl transform -translate-x-1/2 transition-all flex items-center justify-center text-white font-bold shadow-xl">▶</div>
              </div>
            </div>
            <p className="text-sm font-semibold text-center text-gray-400">Position: {arrowBoxX}%</p>
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div className={`p-6 rounded-2xl border max-w-xl mx-auto shadow-2xl ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><span>⭐</span> {t.rating}</h2>
            <div className="flex justify-center gap-3 mb-6">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => handleAddRating(s)} className={`text-4xl transition-transform hover:scale-125 ${currentRating >= s ? 'text-yellow-400' : 'text-gray-600'}`}>
                  ★
                </button>
              ))}
            </div>
            <p className="mb-6 font-bold text-center text-lg">Average Rating: {ratings.length > 0 ? (ratings.reduce((a, b) => a + b.stars, 0) / ratings.length).toFixed(2) : 0} / 5</p>
          </div>
        )}
      </main>

      {/* Bottom Luxury Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t ${darkMode ? 'bg-gray-900/90 border-gray-800' : 'bg-white/90 border-gray-200'} shadow-2xl`}>
        <div className="max-w-7xl mx-auto flex justify-around">
          {[
            { id: 'store', label: t.store, icon: '🛍️' },
            { id: 'trading', label: t.trading, icon: '💹' },
            { id: 'chat', label: t.chat, icon: '🤖' },
            { id: 'games', label: t.games, icon: '🎮' },
            { id: 'settings', label: t.settings, icon: '⚙️' }
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => setTab(item.id)} 
              className={`flex-1 py-3 text-center font-bold text-xs transition-all ${tab === item.id ? 'text-blue-500 border-t-2 border-blue-500 bg-blue-500/5' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <div className="text-xl mb-1">{item.icon}</div>
              <div>{item.label}</div>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}