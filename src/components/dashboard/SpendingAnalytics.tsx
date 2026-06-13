import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import { Database, RefreshCw, Zap } from 'lucide-react';
import type { Transaction } from '../../types';
import { getAnalytics, type AnalyticsResult } from '../../services/analyticsService';
import { formatCurrency } from '../../utils/format';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface SpendingAnalyticsProps {
  transactions: Transaction[];
}

export default function SpendingAnalytics({ transactions }: SpendingAnalyticsProps) {
  const [result, setResult] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await getAnalytics(transactions);
    setResult(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [transactions]);

  const maxHeat = result ? Math.max(...result.data.heatmap.map((c) => c.count), 1) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Spending Analytics</h3>
          <p className="text-sm text-gray-500">Server-computed · Redis-cached results</p>
        </div>
        <div className="flex items-center gap-3">
          {result && (
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
              {result.fromCache ? (
                <><Database className="w-3.5 h-3.5 text-cyan-500" /> Cache hit</>
              ) : (
                <><Zap className="w-3.5 h-3.5 text-amber-500" /> Computed fresh</>
              )}
              <span className="text-gray-300">|</span>
              <span>{result.latencyMs}ms</span>
            </div>
          )}
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !result ? (
        <div className="grid lg:grid-cols-2 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`bg-white rounded-2xl border border-gray-100 p-6 animate-pulse ${i === 3 ? 'lg:col-span-2' : ''}`}>
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-6" />
              <div className="h-48 bg-gray-50 rounded-xl" />
            </div>
          ))}
        </div>
      ) : result && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h4 className="font-medium text-gray-900 mb-1">Monthly Spending by Category</h4>
            <p className="text-xs text-gray-400 mb-6">Debit transactions · completed only</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={result.data.categorySpending.slice(0, 8)} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="amount" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h4 className="font-medium text-gray-900 mb-1">12-Month Income vs Expense</h4>
            <p className="text-xs text-gray-400 mb-6">Trend analysis across all accounts</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={result.data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={false} name="Income" />
                <Line type="monotone" dataKey="expense" stroke="#f97316" strokeWidth={2} dot={false} name="Expense" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <h4 className="font-medium text-gray-900 mb-1">Transaction Frequency Heatmap</h4>
            <p className="text-xs text-gray-400 mb-6">Activity by day of week and hour (UTC)</p>
            <div className="overflow-x-auto">
              <div className="inline-grid gap-1" style={{ gridTemplateColumns: '40px repeat(24, 20px)' }}>
                <div />
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="text-[9px] text-gray-400 text-center">{h}</div>
                ))}
                {DAYS.map((day, dayIdx) => (
                  <div key={day} className="contents">
                    <div className="text-xs text-gray-500 flex items-center">{day}</div>
                    {Array.from({ length: 24 }, (_, hour) => {
                      const cell = result.data.heatmap.find((c) => c.day === dayIdx && c.hour === hour);
                      const intensity = (cell?.count ?? 0) / maxHeat;
                      return (
                        <div
                          key={`${dayIdx}-${hour}`}
                          title={`${day} ${hour}:00 — ${cell?.count ?? 0} transactions`}
                          className="w-5 h-5 rounded-sm"
                          style={{
                            backgroundColor: intensity === 0
                              ? '#f3f4f6'
                              : `rgba(6, 182, 212, ${0.15 + intensity * 0.85})`,
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
              <span>Less</span>
              {[0.1, 0.3, 0.5, 0.7, 1].map((v) => (
                <div key={v} className="w-4 h-4 rounded-sm" style={{ backgroundColor: `rgba(6, 182, 212, ${0.15 + v * 0.85})` }} />
              ))}
              <span>More</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
