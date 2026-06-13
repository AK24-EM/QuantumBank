import type { AnalyticsData, HeatmapCell, MonthlyTrend, Transaction } from '../types';

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  key: string;
  data: AnalyticsData;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(transactions: Transaction[]): string {
  return `analytics:${transactions.length}:${transactions[0]?.id ?? 'empty'}`;
}

function computeCategorySpending(transactions: Transaction[]) {
  const map = new Map<string, number>();
  transactions
    .filter((t) => t.type === 'debit' && t.status === 'completed')
    .forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + t.amount));

  return Array.from(map.entries())
    .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount);
}

function computeMonthlyTrend(transactions: Transaction[]): MonthlyTrend[] {
  const months: MonthlyTrend[] = [];
  const now = new Date(2026, 5, 1);

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    const monthTxs = transactions.filter((t) => t.date.startsWith(monthKey) && t.status === 'completed');
    const income = monthTxs.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const expense = monthTxs.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

    months.push({ month: label, income: Math.round(income), expense: Math.round(expense) });
  }

  return months;
}

function computeHeatmap(transactions: Transaction[]): HeatmapCell[] {
  const grid = new Map<string, number>();

  transactions
    .filter((t) => t.status === 'completed')
    .forEach((t) => {
      const d = new Date(t.timestamp);
      const key = `${d.getDay()}-${d.getHours()}`;
      grid.set(key, (grid.get(key) ?? 0) + 1);
    });

  const cells: HeatmapCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      cells.push({ day, hour, count: grid.get(`${day}-${hour}`) ?? 0 });
    }
  }
  return cells;
}

function computeAnalytics(transactions: Transaction[]): AnalyticsData {
  return {
    categorySpending: computeCategorySpending(transactions),
    monthlyTrend: computeMonthlyTrend(transactions),
    heatmap: computeHeatmap(transactions),
    computedAt: new Date().toISOString(),
  };
}

export interface AnalyticsResult {
  data: AnalyticsData;
  fromCache: boolean;
  latencyMs: number;
}

export async function getAnalytics(transactions: Transaction[]): Promise<AnalyticsResult> {
  const start = performance.now();
  const key = cacheKey(transactions);
  const cached = cache.get(key);

  if (cached && Date.now() < cached.expiresAt) {
    await new Promise((r) => setTimeout(r, 8));
    return { data: cached.data, fromCache: true, latencyMs: Math.round(performance.now() - start) };
  }

  await new Promise((r) => setTimeout(r, 45));
  const data = computeAnalytics(transactions);
  cache.set(key, { key, data, expiresAt: Date.now() + CACHE_TTL_MS });

  return { data, fromCache: false, latencyMs: Math.round(performance.now() - start) };
}

export function invalidateAnalyticsCache() {
  cache.clear();
}
