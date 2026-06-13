import { Bell, Shield, Moon, Globe } from 'lucide-react';
import type { User } from '../../types';

interface SettingsPageProps {
  user: User;
}

export default function SettingsPage({ user }: SettingsPageProps) {
  const toggles = [
    { icon: <Bell className="w-5 h-5" />, label: 'Push Notifications', desc: 'Receive alerts for transactions', default: true },
    { icon: <Shield className="w-5 h-5" />, label: 'Two-Factor Authentication', desc: 'Extra security for your account', default: true },
    { icon: <Moon className="w-5 h-5" />, label: 'Dark Mode', desc: 'Switch to dark theme', default: false },
    { icon: <Globe className="w-5 h-5" />, label: 'International Transfers', desc: 'Enable cross-border payments', default: false },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Profile</h3>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xl font-bold text-white">
            {user.avatar}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <p className="text-xs text-gray-400 mt-1">Member since {user.memberSince}</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Full Name</label>
            <input defaultValue={user.name} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Email</label>
            <input defaultValue={user.email} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Preferences</h3>
        <div className="space-y-4">
          {toggles.map((toggle) => (
            <div key={toggle.label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600">
                  {toggle.icon}
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{toggle.label}</p>
                  <p className="text-xs text-gray-400">{toggle.desc}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={toggle.default} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500" />
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
