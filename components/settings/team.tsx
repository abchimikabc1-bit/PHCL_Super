'use client';

import { Users, Plus, Trash2 } from 'lucide-react';

interface TeamProps {
  darkMode: boolean;
}

export function Team({ darkMode }: TeamProps) {
  const teamMembers = [
    { id: 1, name: 'John Admin', email: 'john@phub.tz', role: 'Admin', joined: '2024-01-01' },
    { id: 2, name: 'Jane Manager', email: 'jane@phub.tz', role: 'Manager', joined: '2024-02-15' },
    { id: 3, name: 'Bob Support', email: 'bob@phub.tz', role: 'Support', joined: '2024-03-20' },
  ];

  return (
    <div className={`border rounded-lg p-4 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-cyan-50 border-cyan-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-gray-200' : ''}`}>
          <Users size={20} />
          Team Members
        </h3>
        <button className="px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white text-sm font-bold rounded-md transition-all flex items-center gap-1">
          <Plus size={16} />
          Add Member
        </button>
      </div>
      <div className="space-y-2">
        {teamMembers.map((member) => (
          <div key={member.id} className={`flex justify-between items-center p-2 rounded border ${darkMode ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-200'}`}>
            <div>
              <p className={`font-bold text-sm ${darkMode ? 'text-white' : ''}`}>{member.name}</p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{member.email}</p>
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{member.role}</span>
            </div>
            <button className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-all">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
