import { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ArrowLeft, Atom } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
  onBack: () => void;
}

export default function LoginPage({ onLogin, onBack }: LoginPageProps) {
  const [email, setEmail] = useState('aayush@quantumbank.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#0B1426] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </button>

        <div className="bg-[#1a2744] rounded-3xl p-8 border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <Atom className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Welcome back</h1>
              <p className="text-gray-400 text-sm">Sign in to QuantumBank</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Email address</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-[#0B1426] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-[#0B1426] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-white/20 bg-[#0B1426] text-cyan-500 focus:ring-cyan-500" />
                Remember me
              </label>
              <button type="button" className="text-cyan-400 hover:text-cyan-300">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Demo credentials are pre-filled. Click Sign In to continue.
          </p>
        </div>
      </div>
    </div>
  );
}
