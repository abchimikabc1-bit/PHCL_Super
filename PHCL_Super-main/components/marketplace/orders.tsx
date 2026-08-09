'use client';

import { Package, CheckCircle, Clock } from 'lucide-react';

interface OrdersProps {
  darkMode: boolean;
}

export function Orders({ darkMode }: OrdersProps) {
  const orders = [
    {
      id: 'ORD-001',
      date: '2024-06-01',
      items: 'Bitcoin Trading Pro x1',
      amount: 99.99,
      currency: 'usd',
      status: 'delivered',
      icon: '₿'
    },
    {
      id: 'ORD-002',
      date: '2024-05-28',
      items: 'Ethereum Wallet x2',
      amount: 299.98,
      currency: 'usd',
      status: 'in-transit',
      icon: 'Ξ'
    },
    {
      id: 'ORD-003',
      date: '2024-05-25',
      items: 'Pi Network Pack x1',
      amount: 49.99,
      currency: 'usd',
      status: 'processing',
      icon: 'Π'
    },
  ];

  const getStatusColor = (status: string) => {
    if (status === 'delivered') return 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 dark:from-emerald-900 dark:to-green-900 dark:text-emerald-300';
    if (status === 'in-transit') return 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 dark:from-blue-900 dark:to-cyan-900 dark:text-blue-300';
    return 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 dark:from-amber-900 dark:to-yellow-900 dark:text-amber-300';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'delivered') return <CheckCircle size={18} />;
    if (status === 'in-transit') return <Package size={18} />;
    return <Clock size={18} />;
  };

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-indigo-50'} rounded-lg p-6`}>
      <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : ''}`}>Order History</h2>
      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className={`border rounded-lg p-4 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{order.icon}</span>
                <div>
                  <p className={`font-bold ${darkMode ? 'text-white' : ''}`}>{order.id}</p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{order.date}</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)}
                <span className="text-xs font-bold capitalize">{order.status.replace('-', ' ')}</span>
              </div>
            </div>
            <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{order.items}</p>
            <p className={`text-lg font-bold ${order.currency === 'usd' ? 'text-yellow-600' : 'text-purple-600'}`}>${order.amount}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
