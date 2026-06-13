import { useState } from 'react';
import {
  ArrowLeftRight, Globe, Users, Calendar, Shield, Bell,
} from 'lucide-react';
import type { PaymentTab } from '../../types/payments';
import { usePaymentsStore } from '../../hooks/usePaymentsStore';
import PlatformStatusBanner from './PlatformStatusBanner';
import InternalTransferForm from './InternalTransferForm';
import ExternalTransferForm from './ExternalTransferForm';
import BeneficiaryManager from './BeneficiaryManager';
import ScheduledPayments from './ScheduledPayments';
import PaymentLimitsPanel from './PaymentLimitsPanel';

const tabs: { id: PaymentTab; label: string; icon: React.ReactNode }[] = [
  { id: 'internal', label: 'Internal Transfer', icon: <ArrowLeftRight className="w-4 h-4" /> },
  { id: 'external', label: 'External Transfer', icon: <Globe className="w-4 h-4" /> },
  { id: 'beneficiaries', label: 'Beneficiaries', icon: <Users className="w-4 h-4" /> },
  { id: 'scheduled', label: 'Scheduled', icon: <Calendar className="w-4 h-4" /> },
  { id: 'limits', label: 'Limits', icon: <Shield className="w-4 h-4" /> },
];

export default function PaymentsModule() {
  const store = usePaymentsStore();
  const [activeTab, setActiveTab] = useState<PaymentTab>('internal');
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="space-y-6">
      <PlatformStatusBanner
        degradedMode={store.degradedMode}
        chaosEnabled={store.chaosEnabled}
        queuedTransfers={store.queuedTransfers}
        onToggleDegraded={store.toggleDegradedMode}
        onToggleChaos={store.toggleChaosMode}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-2xl p-1.5 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {store.unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 text-white text-xs rounded-full flex items-center justify-center">
                {store.unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 top-12 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl z-40 max-h-96 overflow-y-auto">
                <div className="p-4 border-b border-gray-100 font-medium text-sm">Payment Notifications</div>
                {store.notifications.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400">No notifications</p>
                ) : (
                  store.notifications.slice(0, 10).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => store.markNotificationRead(n.id)}
                      className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 ${!n.read ? 'bg-cyan-50/30' : ''}`}
                    >
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {activeTab === 'internal' && <InternalTransferForm store={store} />}
      {activeTab === 'external' && <ExternalTransferForm store={store} />}
      {activeTab === 'beneficiaries' && <BeneficiaryManager store={store} />}
      {activeTab === 'scheduled' && <ScheduledPayments store={store} />}
      {activeTab === 'limits' && <PaymentLimitsPanel store={store} />}
    </div>
  );
}
