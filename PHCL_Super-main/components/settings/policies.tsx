'use client';

import { Shield, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface PoliciesProps {
  darkMode: boolean;
}

export function Policies({ darkMode }: PoliciesProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const policies = [
    {
      id: 1,
      title: 'Privacy Policy',
      icon: '🔒',
      content: 'We protect your personal information and ensure all data is handled according to international standards. Your privacy is our priority.'
    },
    {
      id: 2,
      title: 'Terms of Service',
      icon: '📜',
      content: 'By using PHCL Super app, you agree to our terms and conditions. Please read them carefully before proceeding.'
    },
    {
      id: 3,
      title: 'Refund Policy',
      icon: '💰',
      content: 'Refunds are processed within 7-14 business days. All requests must be submitted within 30 days of purchase.'
    },
    {
      id: 4,
      title: 'Security Policy',
      icon: '🛡️',
      content: 'We use 256-bit encryption and industry-standard security protocols to protect your account and transactions.'
    },
  ];

  return (
    <div className={`border rounded-lg p-4 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-sky-50 border-sky-200'}`}>
      <h3 className={`font-bold flex items-center gap-2 mb-4 ${darkMode ? 'text-gray-200' : ''}`}>
        <Shield size={20} />
        Policies & Compliance
      </h3>
      <div className="space-y-2">
        {policies.map((policy) => (
          <div key={policy.id} className={`border rounded ${darkMode ? 'bg-gray-600 border-gray-500' : 'bg-white border-sky-100'}`}>
            <button
              onClick={() => setExpanded(expanded === policy.id ? null : policy.id)}
              className={`w-full flex justify-between items-center p-3 hover:bg-opacity-80 transition-all`}
            >
              <span className={`font-bold text-sm flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
                <span className="text-lg">{policy.icon}</span>
                {policy.title}
              </span>
              <ChevronDown size={18} className={`transition-transform ${expanded === policy.id ? 'rotate-180' : ''}`} />
            </button>
            {expanded === policy.id && (
              <div className={`px-3 pb-3 border-t ${darkMode ? 'border-gray-500 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
                <p className="text-sm">{policy.content}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
