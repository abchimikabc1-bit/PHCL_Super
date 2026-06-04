export default function Wallet() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">Wallet</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <p className="text-gray-600 mb-2">Your Balance</p>
          <p className="text-5xl font-bold text-blue-600">Π 1,234.56</p>
          <p className="text-sm text-gray-500 mt-4">1 Pi = $314,159</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button className="bg-red-600 text-white font-bold py-4 rounded-lg hover:bg-red-700 transition-all shadow-lg">Send Crypto</button>
          <button className="bg-green-600 text-white font-bold py-4 rounded-lg hover:bg-green-700 transition-all shadow-lg">Receive Crypto</button>
          <button className="bg-purple-600 text-white font-bold py-4 rounded-lg hover:bg-purple-700 transition-all shadow-lg">Swap Crypto</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Recent Transactions</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-3">
              <p className="font-bold text-gray-900">Received Pi Network</p>
              <p className="text-green-600 font-bold">+500 Π</p>
            </div>
            <div className="flex justify-between items-center border-b pb-3">
              <p className="font-bold text-gray-900">Sent Bitcoin</p>
              <p className="text-red-600 font-bold">-0.05 BTC</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
