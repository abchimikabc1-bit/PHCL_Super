'use client';

interface PreferencesProps {
  darkMode: boolean;
}

export function PreferencesSettings({ darkMode }: PreferencesProps) {
  return (
    <div className={`p-4 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-100 border-slate-200'}`}>
      <h3 className={`font-bold mb-2 ${darkMode ? 'text-gray-200' : ''}`}>Preferences</h3>
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" defaultChecked className="w-4 h-4" />
          <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Email Notifications</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" defaultChecked className="w-4 h-4" />
          <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Transaction Alerts</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" defaultChecked className="w-4 h-4" />
          <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Marketing Updates</span>
        </label>
      </div>
    </div>
  );
}
