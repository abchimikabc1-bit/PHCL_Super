'use client';

import { FileText } from 'lucide-react';

interface TermsProps {
  darkMode: boolean;
}

export function Terms({ darkMode }: TermsProps) {
  return (
    <div className={`border rounded-lg p-4 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-violet-50 border-violet-200'}`}>
      <h3 className={`font-bold flex items-center gap-2 mb-4 ${darkMode ? 'text-gray-200' : ''}`}>
        <FileText size={20} />
        Terms & Conditions
      </h3>
      <div className={`space-y-3 max-h-64 overflow-y-auto ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        <div>
          <h4 className={`font-bold text-sm mb-1 ${darkMode ? 'text-white' : ''}`}>1. User Responsibilities</h4>
          <p className="text-xs">You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.</p>
        </div>
        <div>
          <h4 className={`font-bold text-sm mb-1 ${darkMode ? 'text-white' : ''}`}>2. Prohibited Activities</h4>
          <p className="text-xs">Users must not engage in any illegal activities, fraud, or violations of any laws. Any suspicious activity may result in account suspension.</p>
        </div>
        <div>
          <h4 className={`font-bold text-sm mb-1 ${darkMode ? 'text-white' : ''}`}>3. Limitation of Liability</h4>
          <p className="text-xs">PHCL Super is provided as-is. We are not liable for any indirect or consequential damages arising from your use of our services.</p>
        </div>
        <div>
          <h4 className={`font-bold text-sm mb-1 ${darkMode ? 'text-white' : ''}`}>4. Modifications</h4>
          <p className="text-xs">We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of modified terms.</p>
        </div>
      </div>
      <label className="flex items-center gap-2 mt-4 p-2 bg-opacity-50 rounded">
        <input type="checkbox" className="w-4 h-4" />
        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>I agree to the Terms & Conditions</span>
      </label>
    </div>
  );
}
