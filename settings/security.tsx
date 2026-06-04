'use client';

interface SecurityProps {
  darkMode: boolean;
  isLoggedIn: boolean;
  onLogout: () => void;
}

export function SecuritySettings({ darkMode, isLoggedIn, onLogout }: SecurityProps) {
  return (
    <div className={`p-4 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-red-50 border-red-200'}`}>
      <h3 className={`font-bold mb-2 ${darkMode ? 'text-gray-200' : ''}`}>Security</h3>
      <button
        onClick={onLogout}
        className="w-full px-4 py-2 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-semibold shadow-md rounded-md transition-all"
      >
        Logout
      </button>
    </div>
  );
}
