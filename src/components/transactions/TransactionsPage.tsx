import TransactionFeed from '../dashboard/TransactionFeed';
import { accounts, transactions } from '../../data/mockData';

export default function TransactionsPage() {
  return <TransactionFeed transactions={transactions} accounts={accounts} limit={30} showFilters />;
}
