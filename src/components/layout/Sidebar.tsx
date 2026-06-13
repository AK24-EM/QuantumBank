import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  CreditCard,
  Settings,
  LogOut,
  Atom,
  Activity,
} from 'lucide-react';
import type { Page } from '../../types';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  userName: string;
  userRole?: 'customer' | 'admin';
}

const navItems: { page: Page; label: string; icon: React.ReactNode }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { page: 'accounts', label: 'Accounts', icon: <Wallet className="w-5 h-5" /> },
  { page: 'transactions', label: 'Transactions', icon: <ArrowLeftRight className="w-5 h-5" /> },
  { page: 'transfer', label: 'Payments', icon: <ArrowLeftRight className="w-5 h-5" /> },
  { page: 'cards', label: 'Cards', icon: <CreditCard className="w-5 h-5" /> },
  { page: 'platform', label: 'Platform Health', icon: <Activity className="w-5 h-5" /> },
  { page: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
];

export default function Sidebar({ currentPage, onNavigate, onLogout, userName, userRole }: SidebarProps) {
  return (
    <aside className="w-64 bg-[#0B1426] text-white flex flex-col min-h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Atom className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">QuantumBank</h1>
            <p className="text-xs text-cyan-400/80">Production Banking</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ page, label, icon }) => (
          <button
            key={page}
            onClick={() => onNavigate(page)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              currentPage === page
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-300 border border-cyan-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-sm font-bold">
            {userName.split(' ').map((n) => n[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-gray-500">{userRole === 'admin' ? 'System Administrator' : 'Premium Member'}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
