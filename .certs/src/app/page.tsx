export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600 px-4">
      <div className="text-center space-y-8">
        <h1 className="text-6xl font-bold text-white drop-shadow-lg">PHCL Super</h1>
        <p className="text-2xl text-blue-100 drop-shadow">Cryptocurrency Trading & Marketplace</p>
        
        <div className="flex gap-4 justify-center flex-wrap">
          <a href="/dashboard" className="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105">
            Enter Dashboard
          </a>
          <a href="/privacy-policy" className="px-8 py-4 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-400 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105">
            Privacy Policy
          </a>
        </div>

        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-white">
          <div className="bg-white/10 p-4 rounded-lg backdrop-blur">
            <p className="text-3xl mb-2">💹</p>
            <p className="font-semibold">Trade Crypto</p>
          </div>
          <div className="bg-white/10 p-4 rounded-lg backdrop-blur">
            <p className="text-3xl mb-2">🛍️</p>
            <p className="font-semibold">Marketplace</p>
          </div>
          <div className="bg-white/10 p-4 rounded-lg backdrop-blur">
            <p className="text-3xl mb-2">🎮</p>
            <p className="font-semibold">Games</p>
          </div>
          <div className="bg-white/10 p-4 rounded-lg backdrop-blur">
            <p className="text-3xl mb-2">🤖</p>
            <p className="font-semibold">AI Chat</p>
          </div>
        </div>
      </div>
    </div>
  );
}
