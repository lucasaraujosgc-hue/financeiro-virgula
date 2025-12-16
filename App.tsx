import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import BankList from './components/BankList';
import Reports from './components/Reports';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import SignUp from './components/SignUp';
import { 
  INITIAL_BANKS, 
  INITIAL_CATEGORIES, 
  INITIAL_FORECASTS 
} from './services/mockData';
import { Transaction, Bank, Category, Forecast } from './types';

function App() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'forgot' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);

  // App State
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Static data for now, could be moved to DB later
  const [banks, setBanks] = useState<Bank[]>(INITIAL_BANKS);
  const [categories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [forecasts] = useState<Forecast[]>(INITIAL_FORECASTS);
  
  // Data fetched from API
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Derived state updates
  useEffect(() => {
    // Recalculate bank balances based on transactions (Client-side calculation for UI speed)
    const updatedBanks = INITIAL_BANKS.map(bank => {
      const bankTxs = transactions.filter(t => t.bankId === bank.id);
      const balance = bankTxs.reduce((acc, t) => {
        return t.type === 'credito' ? acc + t.value : acc - t.value;
      }, 0);
      return { ...bank, balance };
    });
    
    // Only update if visually different to avoid loops
    const hasChanged = updatedBanks.some((b, i) => b.balance !== banks[i].balance);
    if (hasChanged) {
      setBanks(updatedBanks);
    }
  }, [transactions, banks]);

  // Fetch Transactions on Auth success
  useEffect(() => {
    if (isAuthenticated) {
        fetchTransactions();
    }
  }, [isAuthenticated]);

  const fetchTransactions = async () => {
    try {
        const res = await fetch('/api/transactions');
        if (res.ok) {
            const data = await res.json();
            setTransactions(data);
        }
    } catch (error) {
        console.error("Failed to fetch transactions", error);
    }
  };

  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    try {
        const res = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTx)
        });
        if (res.ok) {
            const savedTx = await res.json();
            setTransactions(prev => [savedTx, ...prev]);
        }
    } catch (error) {
        alert("Erro ao salvar transação");
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir este lançamento?')) {
        try {
            await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
            setTransactions(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            alert("Erro ao excluir");
        }
    }
  };

  const handleReconcile = async (id: number) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    try {
        await fetch(`/api/transactions/${id}/reconcile`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reconciled: !tx.reconciled })
        });
        setTransactions(prev => prev.map(t => 
            t.id === id ? { ...t, reconciled: !t.reconciled } : t
        ));
    } catch (error) {
        alert("Erro ao atualizar status");
    }
  };

  // Auth Handlers with API
  const handleLogin = async (data: any) => {
    setIsLoading(true);
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            setIsAuthenticated(true);
        } else {
            const err = await res.json();
            alert(err.error || "Erro no login");
        }
    } catch (e) {
        alert("Erro de conexão");
    } finally {
        setIsLoading(false);
    }
  };

  const handleSignUp = async (data: any) => {
    setIsLoading(true);
    try {
        const res = await fetch('/api/signup', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        if (res.ok) {
            alert("Cadastro realizado! Faça login.");
            setAuthView('login');
        } else {
            const err = await res.json();
            alert(err.error || "Erro no cadastro");
        }
    } catch (e) {
        alert("Erro de conexão");
    } finally {
        setIsLoading(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
      try {
          const res = await fetch('/api/recover-password', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ email })
          });
          if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error);
          }
      } catch (e: any) {
          throw new Error(e.message || "Erro ao recuperar senha");
      }
  };

  // Auth Flow Handling
  if (!isAuthenticated) {
    if (authView === 'forgot') {
      return <ForgotPassword onBack={() => setAuthView('login')} onSubmit={handleForgotPassword} />;
    }
    if (authView === 'signup') {
        return <SignUp onSignUp={handleSignUp} onBack={() => setAuthView('login')} isLoading={isLoading} />;
    }
    return (
      <Login 
        onLogin={handleLogin} 
        onForgotPassword={() => setAuthView('forgot')} 
        onSignUp={() => setAuthView('signup')}
        isLoading={isLoading}
      />
    );
  }

  // Authenticated App Content
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard transactions={transactions} banks={banks} />;
      case 'transactions':
        return (
          <Transactions 
            transactions={transactions} 
            banks={banks} 
            categories={categories}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onReconcile={handleReconcile}
          />
        );
      case 'banks':
        return <BankList banks={banks} />;
      case 'reports':
        return <Reports transactions={transactions} categories={categories} />;
      case 'forecasts':
        return (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Módulo de Previsões</h2>
            <p className="text-gray-500">Este módulo será implementado na próxima versão.</p>
            <p className="text-sm text-gray-400 mt-4">Total de previsões cadastradas: {forecasts.length}</p>
          </div>
        );
      default:
        return <Dashboard transactions={transactions} banks={banks} />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default App;