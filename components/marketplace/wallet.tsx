'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CURRENCIES, 
  CurrencyCode, 
  PAYMENT_METHODS, 
  PaymentMethod, 
  formatCurrency, 
  convertCurrency 
} from './currency';

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'PURCHASE' | 'REFUND';
  amount: number;
  currency: CurrencyCode;
  provider: string;
  date: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

export default function Wallet() {
  // Demo Balances (Inaweza kutoka kwenye API/Database)
  const [balances, setBalances] = useState<Record<CurrencyCode, number>>({
    USD: 1450.00,
    TZS: 3850000,
    nTZS: 1200000.00,
    PI: 420.50,
  });

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DEPOSIT' | 'WITHDRAW'>('OVERVIEW');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('TZS');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>(PAYMENT_METHODS[2]); // Default M-Pesa
  const [amountInput, setAmountInput] = useState('');
  const [accountInput, setAccountInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Demo Miamala
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 'TX-9012',
      type: 'DEPOSIT',
      amount: 150000,
      currency: 'TZS',
      provider: 'MPESA',
      date: 'Leo, 14:20',
      status: 'COMPLETED',
    },
    {
      id: 'TX-8841',
      type: 'PURCHASE',
      amount: 850,
      currency: 'USD',
      provider: 'VISA',
      date: 'Juzi, 09:15',
      status: 'COMPLETED',
    },
    {
      id: 'TX-7310',
      type: 'DEPOSIT',
      amount: 15.0,
      currency: 'PI',
      provider: 'PI_NETWORK',
      date: '18 Julai, 2026',
      status: 'COMPLETED',
    },
  ]);

  // Chuja njia za malipo kulingana na sarafu iliyochaguliwa
  const availablePayments = PAYMENT_METHODS.filter((m) =>
    m.supportedCurrencies.includes(selectedCurrency)
  );

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amountInput);

    if (!numericAmount || numericAmount <= 0 || !accountInput) {
      alert('Tafadhali jaza kiasi na namba ya akaunti kwa usahihi!');
      return;
    }

    if (activeTab === 'WITHDRAW' && numericAmount > balances[selectedCurrency]) {
      alert('Salio lako halitoshi kufanya muamala huu!');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      // Badilisha salio kulingana na muamala
      setBalances((prev) => ({
        ...prev,
        [selectedCurrency]:
          activeTab === 'DEPOSIT'
            ? prev[selectedCurrency] + numericAmount
            : prev[selectedCurrency] - numericAmount,
      }));

      // Ongeza kwenye miamala
      const newTx: Transaction = {
        id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
        type: activeTab === 'DEPOSIT' ? 'DEPOSIT' : 'WITHDRAW',
        amount: numericAmount,
        currency: selectedCurrency,
        provider: selectedPayment.provider,
        date: 'Punde Hivi',
        status: 'COMPLETED',
      };

      setTransactions([newTx, ...transactions]);
      setIsProcessing(false);
      setAmountInput('');
      setAccountInput('');
      setActiveTab('OVERVIEW');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-amber-500 font-bold text-xs tracking-wider uppercase">
              Financial Engine & Digital Vault
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white flex items-center gap-3">
              💼 Wallet & Salio Lako
            </h1>
          </div>

          {/* Action Tabs */}
          <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex items-center gap-1">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'OVERVIEW'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              📊 Muhtasari
            </button>
            <button
              onClick={() => setActiveTab('DEPOSIT')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'DEPOSIT'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              📥 Weka Salio
            </button>
            <button
              onClick={() => setActiveTab('WITHDRAW')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'WITHDRAW'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              📤 Toa Salio
            </button>
          </div>
        </div>

        {/* 1. Multi-Currency Balances Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
            const config = CURRENCIES[code];
            const balance = balances[code] || 0;

            return (
              <motion.div
                key={code}
                whileHover={{ y: -4 }}
                className="bg-slate-900/90 border border-slate-800/90 p-5 rounded-3xl relative overflow-hidden group shadow-lg"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {config.name}
                  </span>
                  <span className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center font-bold text-amber-400 text-xs">
                    {config.symbol}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-100">
                    {formatCurrency(balance, code)}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Kisia: ~{formatCurrency(convertCurrency(balance, code, 'USD'), 'USD')}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 2. Main Interactive Area */}
        {activeTab === 'OVERVIEW' ? (
          /* Transaction History Table */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center justify-between">
              <span>📜 Kumbukumbu za Miamala (Transaction History)</span>
              <span className="text-xs text-slate-500 font-normal">Miamala ya Hivi Karibuni</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Muamala</th>
                    <th className="py-3 px-4">Njia (Provider)</th>
                    <th className="py-3 px-4">Tarehe</th>
                    <th className="py-3 px-4">Hali (Status)</th>
                    <th className="py-3 px-4 text-right">Kiasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-4 px-4 font-semibold text-slate-100 flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            tx.type === 'DEPOSIT' ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        {tx.type} ({tx.id})
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-slate-400">{tx.provider}</td>
                      <td className="py-4 px-4 text-xs text-slate-400">{tx.date}</td>
                      <td className="py-4 px-4">
                        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-500/20">
                          {tx.status}
                        </span>
                      </td>
                      <td
                        className={`py-4 px-4 font-bold text-right ${
                          tx.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-slate-100'
                        }`}
                      >
                        {tx.type === 'DEPOSIT' ? '+' : '-'}
                        {formatCurrency(tx.amount, tx.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Deposit & Withdraw Form Engine */
          <AnimatePresence mode="wait">
            <motion.form
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onSubmit={handleTransactionSubmit}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto space-y-6"
            >
              <h2 className="text-xl font-bold text-slate-100 border-b border-slate-800 pb-3 flex items-center justify-between">
                <span>
                  {activeTab === 'DEPOSIT' ? '📥 Weka Salio (Deposit)' : '📤 Toa Salio (Withdraw)'}
                </span>
                <span className="text-xs text-amber-500 font-mono">Fast Gateway</span>
              </h2>

              {/* Sarafu Switcher */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">1. Chagua Sarafu:</label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                    <button
                      type="button"
                      key={code}
                      onClick={() => {
                        setSelectedCurrency(code);
                        const valid = PAYMENT_METHODS.filter((m) =>
                          m.supportedCurrencies.includes(code)
                        );
                        if (valid.length > 0) setSelectedPayment(valid[0]);
                      }}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition ${
                        selectedCurrency === code
                          ? 'bg-amber-500 border-amber-500 text-slate-950'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">2. Chagua Njia ya Malipo:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availablePayments.map((method) => {
                    const isSelected = selectedPayment.id === method.id;
                    return (
                      <div
                        key={method.id}
                        onClick={() => setSelectedPayment(method)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="font-bold text-xs">{method.name}</span>
                        <div
                          className={`w-3.5 h-3.5 rounded-full border ${
                            isSelected ? 'border-amber-500 bg-amber-500' : 'border-slate-600'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Amount and Account Inputs */}
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Kiasi ({selectedCurrency}):
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder={`Weka kiasi cha ${selectedCurrency}`}
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {selectedPayment.accountDetailsHint}:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={selectedPayment.accountDetailsHint}
                    value={accountInput}
                    onChange={(e) => setAccountInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className={`w-full font-black py-4 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 text-slate-950 ${
                  activeTab === 'DEPOSIT'
                    ? 'bg-emerald-400 hover:bg-emerald-300'
                    : 'bg-amber-500 hover:bg-amber-400'
                }`}
              >
                {isProcessing ? (
                  <>🌀 Inachakata Muamala...</>
                ) : (
                  <>{activeTab === 'DEPOSIT' ? '📥 Thibitisha Kuweka Salio' : '📤 Thibitisha Kutoa Salio'}</>
                )}
              </button>
            </motion.form>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}