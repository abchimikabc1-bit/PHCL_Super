'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Send } from 'lucide-react';

export default function Dashboard() {
  const [tab, setTab] = useState('store');
  const [language, setLanguage] = useState('en');
  const [darkMode, setDarkMode] = useState(false);
  const [selectedPhoneProduct, setSelectedPhoneProduct] = useState(null);
  
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

  // Send money function
  const handleSend = () => {
    const amount = 0.5;
    setBalance(prev => ({ ...prev, pi: prev.pi - amount }));
    setTransactions(prev => [...prev, { type: 'send', amount, time: new Date().toLocaleTimeString() }]);
  };

  // Receive money function
  const handleReceive = () => {
    const amount = 1.0;
    setBalance(prev => ({ ...prev, pi: prev.pi + amount }));
    setTransactions(prev => [...prev, { type: 'receive', amount, time: new Date().toLocaleTimeString() }]);
  };

  // Swap function
  const handleSwap = () => {
    const swapAmount = balance.pi * 0.5;
    const receivedUsdt = swapAmount * 314159 * 1.05;
    setBalance(prev => ({ ...prev, pi: prev.pi - swapAmount, usdt: prev.usdt + receivedUsdt }));
    setTransactions(prev => [...prev, { type: 'swap', amount: swapAmount, time: new Date().toLocaleTimeString() }]);
  };

  // Add rating
  const handleAddRating = (stars) => {
    setCurrentRating(stars);
    setRatings(prev => [...prev, { stars, time: new Date().toLocaleTimeString() }]);
  };

  // Send message
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

  const t = translations[language];

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b p-4`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">PHCL Super</h1>
          <div className="flex gap-4 items-center">
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={`px-4 py-2 rounded ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}>
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
            </select>
            <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Store Tab */}
        {tab === 'store' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">📱 {t.phones}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {phones.map(p => (
                  <div key={p.id} className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} hover:shadow-lg`}>
                    <p className="text-4xl mb-2">{p.icon}</p>
                    <p className="font-bold text-sm">{p.name}</p>
                    <p className="text-sm mt-2">${p.usd.toFixed(2)}</p>
                    <p className="text-sm text-purple-600">Π{p.pi.toFixed(6)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">🚗 {t.vehicles}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.map(v => (
                  <div key={v.id} className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} hover:shadow-lg`}>
                    <p className="text-4xl mb-2">{v.icon}</p>
                    <p className="font-bold text-sm">{v.name}</p>
                    <p className="text-sm mt-2">${v.usd.toFixed(2)}</p>
                    <p className="text-sm text-purple-600">Π{v.pi.toFixed(6)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Trading Tab */}
        {tab === 'trading' && (
          <div className="space-y-6">
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border`}>
              <h2 className="text-2xl font-bold mb-4">💰 {t.wallet}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">{t.pi}</p>
                  <p className="text-2xl font-bold">Π{balance.pi.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t.btc}</p>
                  <p className="text-2xl font-bold">₿{balance.btc.toFixed(5)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t.eth}</p>
                  <p className="text-2xl font-bold">Ξ{balance.eth.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t.usdt}</p>
                  <p className="text-2xl font-bold">${balance.usdt.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex gap-4 mb-6">
                <button onClick={handleSend} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold">💸 {t.send}</button>
                <button onClick={handleReceive} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold">📥 {t.receive}</button>
                <button onClick={handleSwap} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold">🔄 {t.swap}</button>
              </div>

              <div>
                <h3 className="font-bold mb-2">Transaction History</h3>
                <div className="space-y-1 text-sm">
                  {transactions.slice(-5).reverse().map((t, i) => (
                    <p key={i}>{t.type} Π{t.amount.toFixed(4)} - {t.time}</p>
                  ))}
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border`}>
              <h2 className="text-2xl font-bold mb-4">📊 Crypto Prices</h2>
              <p className="mb-2">Bitcoin: $65,420.50</p>
              <p className="mb-2">Ethereum: $3,450.75</p>
              <p className="mb-2">Pi Network: $314,159.00</p>
              <p>USDT: $1.00</p>
            </div>
          </div>
        )}

        {/* Chat Tab */}
        {tab === 'chat' && (
          <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border max-w-2xl`}>
            <h2 className="text-2xl font-bold mb-4">🤖 AI Chat</h2>
            <div className="space-y-4 mb-4 h-64 overflow-y-auto">
              {messages.map((msg, i) => (
                <div key={i} className={`p-3 rounded ${msg.type === 'user' ? 'bg-blue-600 text-white ml-auto' : 'bg-gray-200 text-gray-900'} max-w-xs`}>
                  {msg.text}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type message..." className={`flex-1 p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600' : 'border-gray-300'}`} />
              <button onClick={handleSendMessage} className="px-4 py-2 bg-blue-600 text-white rounded"><Send size={20} /></button>
            </div>
          </div>
        )}

        {/* Games Tab */}
        {tab === 'games' && (
          <div className="space-y-6">
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border`}>
              <h2 className="text-2xl font-bold mb-4">🎮 {t.arrowGame}</h2>
              <div className={`h-64 rounded-lg border-4 relative mb-4 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'}`}>
                <div className="absolute top-0 left-0 right-0 h-8 flex items-center px-4 text-sm font-bold">Score: {score}</div>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <div style={{ left: `${arrowBoxX}%` }} className="absolute w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg transform -translate-x-1/2 transition-all flex items-center justify-center text-white font-bold">▶</div>
                </div>
              </div>
              <p className="text-sm text-gray-500">Position: {arrowBoxX}%</p>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border`}>
            <h2 className="text-2xl font-bold mb-6">⭐ {t.rating}</h2>
            <div className="flex gap-2 mb-6">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => handleAddRating(s)} className={`text-4xl transition ${currentRating >= s ? 'text-yellow-400' : 'text-gray-400'}`}>
                  ★
                </button>
              ))}
            </div>
            <p className="mb-4 font-bold">Average Rating: {ratings.length > 0 ? (ratings.reduce((a, b) => a + b.stars, 0) / ratings.length).toFixed(2) : 0} / 5</p>
            <div className="space-y-2">
              {ratings.slice(-5).reverse().map((r, i) => (
                <p key={i} className="text-sm">{'★'.repeat(r.stars)} - {r.time}</p>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t`}>
        <div className="max-w-7xl mx-auto flex justify-around">
          {[
            { id: 'store', label: t.store, icon: '🛍️' },
            { id: 'trading', label: t.trading, icon: '💹' },
            { id: 'chat', label: t.chat, icon: '🤖' },
            { id: 'games', label: t.games, icon: '🎮' },
            { id: 'settings', label: t.settings, icon: '⚙️' }
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`flex-1 py-4 text-center font-bold text-sm ${tab === item.id ? 'text-blue-600 border-t-4 border-blue-600' : 'text-gray-500'}`}>
              <div className="text-2xl">{item.icon}</div>
              <div>{item.label}</div>
            </button>
          ))}
        </div>
      </nav>

      <div className="h-24"></div>
    </div>
  );
}
