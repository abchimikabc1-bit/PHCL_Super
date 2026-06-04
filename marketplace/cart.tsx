'use client';

import { getProductPrice, getCurrencySymbol, getCurrencyColor } from './currency-utils';

interface CartItem {
  id: number;
  name: string;
  icon: string;
  quantity: number;
  tzs: number;
  usd: number;
  pi: number;
}

interface CartProps {
  darkMode: boolean;
  cart: CartItem[];
  cartCurrency: string;
  onSetCartCurrency: (currency: string) => void;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemoveItem: (index: number) => void;
  onGetTotal: () => number;
}

export function ShoppingCart({
  darkMode,
  cart,
  cartCurrency,
  onSetCartCurrency,
  onUpdateQuantity,
  onRemoveItem,
  onGetTotal,
}: CartProps) {
  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-green-50'} rounded-lg p-6 mb-6`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : ''}`}>Shopping Cart</h2>
        <div className="flex gap-2">
          <button
            onClick={() => onSetCartCurrency('tzs')}
            className={`px-3 py-2 rounded-md font-bold transition-all ${
              cartCurrency === 'tzs'
                ? 'bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-lg'
                : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}
          >
            TZS
          </button>
          <button
            onClick={() => onSetCartCurrency('usd')}
            className={`px-3 py-2 rounded-md font-bold transition-all ${
              cartCurrency === 'usd'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-lg'
                : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}
          >
            USD
          </button>
          <button
            onClick={() => onSetCartCurrency('pi')}
            className={`px-3 py-2 rounded-md font-bold transition-all ${
              cartCurrency === 'pi'
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg'
                : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}
          >
            PI
          </button>
        </div>
      </div>
      <div className="space-y-3 mb-4">
        {cart.map((item, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-3 border rounded-lg ${
              darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="text-3xl">{item.icon}</span>
              <div className="flex-1">
                <p className={`font-bold ${darkMode ? 'text-white' : ''}`}>{item.name}</p>
                <p className={getCurrencyColor(cartCurrency)}>
                  {getCurrencySymbol(cartCurrency)} {getProductPrice(item, cartCurrency).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded font-bold"
              >
                -
              </button>
              <span className={`w-8 text-center font-bold ${darkMode ? 'text-white' : ''}`}>
                {item.quantity}
              </span>
              <button
                onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded font-bold"
              >
                +
              </button>
              <button
                onClick={() => onRemoveItem(index)}
                className="px-3 py-1 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white rounded font-bold ml-2"
              >
                Remove
              </button>
            </div>
            <p className={`font-bold text-lg ml-4 ${getCurrencyColor(cartCurrency)} w-24 text-right`}>
              {(getProductPrice(item, cartCurrency) * item.quantity).toFixed(2)}
            </p>
          </div>
        ))}
      </div>
      <div className={`border-t-2 pt-4 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
        <div className="flex justify-between items-center mb-4">
          <span className={`text-xl font-bold ${darkMode ? 'text-white' : ''}`}>Total:</span>
          <p className={`text-3xl font-bold ${getCurrencyColor(cartCurrency)}`}>
            {getCurrencySymbol(cartCurrency)} {onGetTotal().toFixed(2)}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold rounded-lg shadow-lg transition-all">
            Proceed to Checkout
          </button>
          <button className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold rounded-lg shadow-lg transition-all">
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
