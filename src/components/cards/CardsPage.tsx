import { Wifi, Snowflake } from 'lucide-react';
import { cards, formatCurrency } from '../../data/mockData';

export default function CardsPage() {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {cards.map((card, i) => (
          <div
            key={card.id}
            className={`relative rounded-3xl p-8 text-white overflow-hidden min-h-[220px] flex flex-col justify-between ${
              i === 0
                ? 'bg-gradient-to-br from-[#0B1426] via-[#1a3a5c] to-[#0B1426]'
                : 'bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]'
            }`}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="relative flex items-center justify-between">
              <span className="text-lg font-bold tracking-wider uppercase">{card.type}</span>
              <Wifi className="w-6 h-6 opacity-60" />
            </div>
            <div className="relative">
              <p className="font-mono text-2xl tracking-[0.3em] mb-6">•••• •••• •••• {card.last4}</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-white/50 uppercase">Card Holder</p>
                  <p className="font-medium tracking-wide">{card.holder}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50 uppercase">Expires</p>
                  <p className="font-medium">{card.expiry}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {cards.map((card) => (
          <div key={card.id} className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-gray-900 capitalize">{card.type} •••• {card.last4}</p>
                <p className="text-sm text-gray-400">{card.status === 'active' ? 'Active' : 'Frozen'}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                card.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
              }`}>
                {card.status}
              </span>
            </div>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Spent this month</span>
                <span className="font-medium">{formatCurrency(card.spent)} / {formatCurrency(card.limit)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(card.spent / card.limit) * 100}%` }}
                />
              </div>
            </div>
            <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors">
              <Snowflake className="w-4 h-4" />
              Freeze Card
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
