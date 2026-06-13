import type { Account, NetWorthSummary } from '../types';

export function computeNetWorth(accounts: Account[]): NetWorthSummary {
  const totalAssets = accounts
    .filter((a) => !a.isLiability)
    .reduce((sum, a) => sum + a.balance, 0);

  const totalLiabilities = accounts
    .filter((a) => a.isLiability)
    .reduce((sum, a) => sum + a.balance, 0);

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
  };
}
