'use client';

import { CheckCircle, Truck, CreditCard } from 'lucide-react';

interface CheckoutProps {
  darkMode: boolean;
  total: number;
  currency: string;
}

export function Checkout({ darkMode, total, currency }: CheckoutProps) {
  const steps = [
    { id: 1, title: 'Cart Review', icon: CheckCircle },
    { id: 2, title: 'Shipping', icon: Truck },
    { id: 3, title: 'Payment', icon: CreditCard },
  ];

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-emerald-50'} rounded-lg p-6`}>
      <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : ''}`}>Checkout</h2>
      
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${idx < 2 ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-blue-500 to-cyan-600'}`}>
                  <Icon className="text-white" size={24} />
                </div>
                <p className={`text-sm font-bold text-center ${darkMode ? 'text-white' : ''}`}>{step.title}</p>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-1 mt-2 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className={`border-t-2 pt-6 mb-6 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
        <div className="mb-4">
          <p className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : ''}`}>Order Summary</p>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Subtotal: {currency === 'usd' ? '$' : currency === 'tzs' ? 'TSh' : 'Π'} {total.toFixed(2)}</p>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Shipping: Free</p>
          <p className={`text-xl font-bold mt-2 ${currency === 'usd' ? 'text-yellow-600' : currency === 'tzs' ? 'text-black' : 'text-purple-600'}`}>Total: {currency === 'usd' ? '$' : currency === 'tzs' ? 'TSh' : 'Π'} {total.toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className={`font-bold mb-3 ${darkMode ? 'text-white' : ''}`}>Payment Method</h3>
        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900 dark:to-cyan-900">
          <input type="radio" name="payment" defaultChecked className="w-4 h-4" />
          <span className={`font-bold ${darkMode ? 'text-white' : ''}`}>Credit Card</span>
        </label>
        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
          <input type="radio" name="payment" className="w-4 h-4" />
          <span className={`font-bold ${darkMode ? 'text-white' : ''}`}>Pi Network</span>
        </label>
        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
          <input type="radio" name="payment" className="w-4 h-4" />
          <span className={`font-bold ${darkMode ? 'text-white' : ''}`}>Bank Transfer</span>
        </label>
      </div>

      <button className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold rounded-lg shadow-lg transition-all">
        Complete Purchase
      </button>
    </div>
  );
}
