import { useAppStore } from './hooks/useAppStore';
import LandingPage from './components/landing/LandingPage';
import LoginPage from './components/auth/LoginPage';
import Sidebar from './components/layout/Sidebar';
import Header, { getPageHeader } from './components/layout/Header';
import CustomerDashboard from './components/dashboard/CustomerDashboard';
import AccountsPage from './components/accounts/AccountsPage';
import TransactionsPage from './components/transactions/TransactionsPage';
import TransferPage from './components/transfer/TransferPage';
import CardsPage from './components/cards/CardsPage';
import LoansPage from './components/loans/LoansPage';
import PlatformPage from './components/platform/PlatformPage';
import SettingsPage from './components/settings/SettingsPage';
import type { Page } from './types';

function App() {
  const store = useAppStore();

  if (store.currentPage === 'landing') {
    return <LandingPage onNavigate={store.navigate} />;
  }

  if (store.currentPage === 'login') {
    return <LoginPage onLogin={store.login} onBack={() => store.navigate('landing')} />;
  }

  if (!store.user) {
    return <LoginPage onLogin={store.login} onBack={() => store.navigate('landing')} />;
  }

  const user = store.user;

  const renderPage = () => {
    switch (store.currentPage) {
      case 'dashboard':
        return <CustomerDashboard user={user} />;
      case 'accounts':
        return <AccountsPage />;
      case 'transactions':
        return <TransactionsPage />;
      case 'transfer':
        return <TransferPage />;
      case 'cards':
        return <CardsPage />;
      case 'loans':
        return <LoansPage />;
      case 'platform':
        return null;
      case 'settings':
        return <SettingsPage user={user} />;
      default:
        return <CustomerDashboard user={user} />;
    }
  };

  const header = getPageHeader(store.currentPage as Page);

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      <Sidebar
        currentPage={store.currentPage}
        onNavigate={store.navigate}
        onLogout={store.logout}
        userName={user.name}
        userRole={user.role}
      />
      {store.currentPage === 'platform' ? (
        <main className="ml-64">
          <PlatformPage user={user} />
        </main>
      ) : (
        <main className="ml-64 p-8">
          <Header title={header.title} subtitle={header.subtitle} />
          {renderPage()}
        </main>
      )}
    </div>
  );
}

export default App;
