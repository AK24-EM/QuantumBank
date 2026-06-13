import {
  Shield, Zap, Globe, ArrowRight, CheckCircle2, TrendingUp, Lock, Smartphone,
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: 'login') => void;
}

const features = [
  { icon: <Shield className="w-6 h-6" />, title: 'Bank-Grade Security', desc: '256-bit encryption and multi-factor authentication on every transaction.' },
  { icon: <Zap className="w-6 h-6" />, title: 'Instant Transfers', desc: 'Move money between accounts in real-time, 24/7.' },
  { icon: <Globe className="w-6 h-6" />, title: 'Global Access', desc: 'Manage your finances from anywhere in the world.' },
  { icon: <TrendingUp className="w-6 h-6" />, title: 'Smart Investing', desc: 'AI-powered portfolio insights and automated savings.' },
];

const stats = [
  { value: '$12B+', label: 'Assets Under Management' },
  { value: '2M+', label: 'Active Customers' },
  { value: '99.9%', label: 'Uptime Guarantee' },
  { value: '4.9★', label: 'Customer Rating' },
];

export default function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#0B1426] text-white overflow-hidden">
      <nav className="flex items-center justify-between px-6 lg:px-12 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-lg">
            Q
          </div>
          <span className="text-xl font-bold">QuantumBank</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="hidden sm:block text-gray-400 hover:text-white transition-colors text-sm">
            Features
          </button>
          <button className="hidden sm:block text-gray-400 hover:text-white transition-colors text-sm">
            Pricing
          </button>
          <button
            onClick={() => onNavigate('login')}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Sign In
          </button>
        </div>
      </nav>

      <section className="relative px-6 lg:px-12 pt-16 pb-24 max-w-7xl mx-auto">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-sm mb-6">
              <Lock className="w-4 h-4" />
              Production Banking Platform
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Banking for the{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Quantum Age
              </span>
            </h1>
            <p className="text-gray-400 text-lg mb-8 max-w-lg leading-relaxed">
              Experience next-generation digital banking with instant transfers, smart investing,
              and enterprise-grade security — all in one beautiful platform.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => onNavigate('login')}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Open Dashboard
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="px-8 py-4 border border-white/20 rounded-xl font-semibold hover:bg-white/5 transition-colors">
                Learn More
              </button>
            </div>
            <div className="flex items-center gap-6 mt-10 text-sm text-gray-500">
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> FDIC Insured</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> No Hidden Fees</span>
              <span className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-cyan-400" /> Mobile Ready</span>
            </div>
          </div>

          <div className="relative">
            <div className="bg-gradient-to-br from-[#1a2744] to-[#0f1a30] rounded-3xl p-8 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-gray-400 text-sm">Total Balance</p>
                  <p className="text-4xl font-bold mt-1">$205,601.07</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { name: 'Primary Checking', balance: '$24,850.75', change: '+2.4%' },
                  { name: 'High-Yield Savings', balance: '$52,300.00', change: '+4.8%' },
                  { name: 'Quantum Invest', balance: '$128,450.32', change: '+12.1%' },
                ].map((acc) => (
                  <div key={acc.name} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div>
                      <p className="font-medium">{acc.name}</p>
                      <p className="text-gray-400 text-sm">{acc.balance}</p>
                    </div>
                    <span className="text-emerald-400 text-sm font-medium">{acc.change}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 lg:px-12 py-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-6 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-3xl font-bold text-cyan-400">{stat.value}</p>
              <p className="text-gray-400 text-sm mt-2">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 lg:px-12 py-20 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Why QuantumBank?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-cyan-500/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4">
                {f.icon}
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
