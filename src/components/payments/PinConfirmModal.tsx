import { useState } from 'react';
import { X, Fingerprint, Lock, Shield } from 'lucide-react';
import { DEMO_PIN } from '../../config/paymentConfig';

interface PinConfirmModalProps {
  open: boolean;
  amount: string;
  label: string;
  onConfirm: (pin: string) => void;
  onClose: () => void;
  loading?: boolean;
}

export default function PinConfirmModal({ open, amount, label, onConfirm, onClose, loading }: PinConfirmModalProps) {
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState<'pin' | 'biometric'>('pin');
  const [bioLoading, setBioLoading] = useState(false);

  if (!open) return null;

  const handleBiometric = async () => {
    setBioLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setBioLoading(false);
    onConfirm(DEMO_PIN);
    setPin('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length === 4) {
      onConfirm(pin);
      setPin('');
    }
  };

  const handleClose = () => {
    setPin('');
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={handleClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-600" />
              <h3 className="font-semibold text-gray-900">Confirm Transfer</h3>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-xl">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="text-center mb-6">
            <p className="text-3xl font-bold text-gray-900">{amount}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>

          <div className="flex gap-2 mb-6 bg-gray-50 p-1 rounded-xl">
            <button
              onClick={() => setMode('pin')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'pin' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              <Lock className="w-4 h-4" /> PIN
            </button>
            <button
              onClick={() => setMode('biometric')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'biometric' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              <Fingerprint className="w-4 h-4" /> Biometric
            </button>
          </div>

          {mode === 'pin' ? (
            <form onSubmit={handleSubmit}>
              <label className="block text-sm text-gray-500 mb-2 text-center">Enter 4-digit Transaction PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full text-center text-2xl tracking-[0.5em] font-mono py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                placeholder="••••"
                autoFocus
              />
              <p className="text-xs text-gray-400 text-center mt-2">Demo PIN: 1234</p>
              <button
                type="submit"
                disabled={pin.length !== 4 || loading}
                className="w-full mt-4 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Confirm & Transfer'}
              </button>
            </form>
          ) : (
            <button
              onClick={handleBiometric}
              disabled={bioLoading || loading}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Fingerprint className={`w-5 h-5 ${bioLoading ? 'animate-pulse' : ''}`} />
              {bioLoading ? 'Authenticating...' : 'Authenticate with Biometric'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
