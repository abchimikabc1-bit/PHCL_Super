'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMarketplaceProductImage, MARKETPLACE_PRODUCTS } from '@/lib/marketplace-products';
import { formatCurrency, convertCurrency, CurrencyCode } from './currency';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'seller';
  text: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  sellerName: string;
  sellerAvatar: string;
  product: MarketplaceProduct;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: ChatMessage[];
}

export default function Chat({
  onNavigateToTrading,
}: {
  onNavigateToTrading?: (product: MarketplaceProduct) => void;
}) {
  const [selectedCurrency] = useState<CurrencyCode>('TZS');

  // Demo Conversations Data
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: 'conv-1',
      sellerName: 'Autos Tanzania Ltd',
      sellerAvatar: '🏎️',
      product: MARKETPLACE_PRODUCTS[0], // Mercedes C200
      lastMessage: 'Ndiyo, gari bado ipo! Unakaribishwa kufanya inspection.',
      lastMessageTime: '10:45 AM',
      unreadCount: 2,
      messages: [
        {
          id: 'm1',
          sender: 'user',
          text: 'Habari, hili gari la Mercedes C200 bado lipo sokoni?',
          timestamp: '10:40 AM',
        },
        {
          id: 'm2',
          sender: 'seller',
          text: 'Habari! Ndiyo, gari bado ipo! Unakaribishwa kufanya inspection.',
          timestamp: '10:45 AM',
        },
      ],
    },
    {
      id: 'conv-2',
      sellerName: 'iStore Mlimani City',
      sellerAvatar: '📱',
      product: MARKETPLACE_PRODUCTS[6], // iPhone 16 Pro Max
      lastMessage: 'Bei ya mwisho ni kama ilivyoonyeshwa, lakini tunaweza kuzungumza kidogo.',
      lastMessageTime: 'Juzi',
      unreadCount: 0,
      messages: [
        {
          id: 'm3',
          sender: 'user',
          text: 'Habari, simu hii ina warranty ya miezi mingapi?',
          timestamp: 'Juzi 14:00',
        },
        {
          id: 'm4',
          sender: 'seller',
          text: 'Ina warranty ya mwaka mmoja kutoka Apple Official Store.',
          timestamp: 'Juzi 14:05',
        },
        {
          id: 'm5',
          sender: 'seller',
          text: 'Bei ya mwisho ni kama ilivyoonyeshwa, lakini tunaweza kuzungumza kidogo.',
          timestamp: 'Juzi 14:06',
        },
      ],
    },
  ]);

  const [activeConvId, setActiveConvId] = useState<string>(conversations[0].id);
  const [inputText, setInputText] = useState('');

  const activeConv = conversations.find((c) => c.id === activeConvId) || conversations[0];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: 'user',
      text: inputText,
      timestamp: 'Punde Hivi',
    };

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === activeConvId) {
          return {
            ...conv,
            lastMessage: inputText,
            lastMessageTime: 'Punde Hivi',
            messages: [...conv.messages, newMessage],
          };
        }
        return conv;
      })
    );

    setInputText('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-6 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="border-b border-slate-800 pb-4">
          <span className="text-amber-500 font-bold text-xs tracking-wider uppercase">
            Marketplace Messenger
          </span>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            💬 Mazungumzo na Wauzaji
          </h1>
        </div>

        {/* Chat Main Window Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden min-h-[600px] shadow-2xl">
          {/* Left Sidebar: Conversations List (4 Cols) */}
          <div className="lg:col-span-4 border-r border-slate-800 p-4 space-y-3 bg-slate-950/40">
            <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-2">
              Chats Zako ({conversations.length})
            </h2>

            <div className="space-y-2">
              {conversations.map((conv) => {
                const isActive = conv.id === activeConvId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`p-3.5 rounded-2xl cursor-pointer transition flex items-center gap-3 ${
                      isActive
                        ? 'bg-amber-500/10 border border-amber-500/50'
                        : 'hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-2xl bg-slate-800 flex items-center justify-center text-xl flex-shrink-0 border border-slate-700">
                      {conv.sellerAvatar}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-sm text-slate-100 truncate">
                          {conv.sellerName}
                        </h3>
                        <span className="text-[10px] text-slate-500">{conv.lastMessageTime}</span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{conv.lastMessage}</p>
                    </div>

                    {conv.unreadCount > 0 && !isActive && (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Chat Box Window (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col justify-between bg-slate-900">
            {/* 1. Chat Top Bar (Seller + Product Info) */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg border border-slate-700">
                  {activeConv.sellerAvatar}
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">{activeConv.sellerName}</h3>
                  <span className="text-[10px] text-emerald-400 font-medium">● Yupo Hewani (Online)</span>
                </div>
              </div>

              {/* Product Reference Badge */}
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-2 rounded-xl">
                <img
                  src={activeConv.product.image || getMarketplaceProductImage(activeConv.product)}
                  alt={activeConv.product.name}
                  className="w-10 h-10 rounded-lg object-cover bg-slate-950"
                />
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-200 truncate max-w-[150px]">
                    {activeConv.product.name}
                  </p>
                  <p className="text-xs text-amber-400 font-extrabold">
                    {formatCurrency(
                      convertCurrency(activeConv.product.priceUSD, 'USD', selectedCurrency),
                      selectedCurrency
                    )}
                  </p>
                </div>
                {onNavigateToTrading && (
                  <button
                    onClick={() => onNavigateToTrading(activeConv.product)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg transition"
                  >
                    🤝 Fanya Ofa
                  </button>
                )}
              </div>
            </div>

            {/* 2. Messages Body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-4 max-h-[420px]">
              {activeConv.messages.map((msg) => {
                const isMe = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3.5 rounded-2xl text-sm ${
                        isMe
                          ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                          : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
                  </div>
                );
              })}
            </div>

            {/* 3. Input Text Box */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center gap-2">
              <input
                type="text"
                placeholder={`Mwandikie ${activeConv.sellerName} ujumbe...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition"
              />
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-3 rounded-2xl transition flex items-center gap-1 text-sm"
              >
                Tuma 🚀
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}