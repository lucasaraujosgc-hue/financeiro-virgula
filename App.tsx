import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import BankList from './components/BankList';
import Reports from './components/Reports';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import SignUp from './components/SignUp';
import Forecasts from './components/Forecasts';
import OFXImports from './components/OFXImports';
import { Transaction, Bank, Category } from './types';

function App() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null); // Store user info
  const [authView, setAuthView] = useState<'login' | 'forgot' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);

  // App State
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data State
  const [banks, setBanks] = useState<Bank[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Check LocalStorage for "Remember Me"
  useEffect(() => {
    const savedAuth = localStorage.getItem('finance_app_auth');
    if (savedAuth) {
      const userData = JSON.parse(savedAuth);
      setUser(userData);
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch Core Data on Auth
  useEffect(() => {
    if (isAuthenticated) {
        fetchInitialData();
    }
  }, [isAuthenticated]);

  // Derived state updates (Balances)
  useEffect(() => {
    if (banks.length > 0 && transactions.length >= 0) {
        const updatedBanks = banks.map(bank => {
            const bankTxs = transactions.filter(t => t.bankId === bank.id);
            const balance = bankTxs.reduce((acc, t) => {
                return t.type === 'credito' ? acc + t.value : acc - t.value;
            }, 0);
            return { ...bank, balance };
        });
        
        // Simple check to avoid loop if nothing changed value-wise
        const hasChanged = updatedBanks.some((b, i) => b.balance !== banks[i].balance);
        if (hasChanged) setBanks(updatedBanks);
    }
  }, [transactions.length]); // Recalc mainly when transactions array size changes or fetched

  const fetchInitialData = async () => {
      await Promise.all([
          fetchBanks(),
          fetchCategories(),
          fetchTransactions()
      ]);
  };

  const fetchBanks = async () => {
      try {
          const res = await fetch('/api/banks');
          if (res.ok) setBanks(await res.json());
      } catch (e) { console.error(e) }
  };

  const fetchCategories = async () => {
      try {
          const res = await fetch('/api/categories');
          if (res.ok) setCategories(await res.json());
      } catch (e) { console.error(e) }
  };

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

  const handleUpdateBank = async (updatedBank: Bank) => {
      try {
          await fetch(`/api/banks/${updatedBank.id}`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(updatedBank)
          });
          setBanks(prev => prev.map(b => b.id === updatedBank.id ? updatedBank : b));
      } catch (e) {
          alert("Erro ao atualizar banco");
      }
  };

  const handleLogout = () => {
      if (confirm('Deseja realmente sair?')) {
          setIsAuthenticated(false);
          setAuthView('login');
          setActiveTab('dashboard');
          setUser(null);
          localStorage.removeItem('finance_app_auth');
      }
  };

  // Auth Handlers with API
  const handleLogin = async (data: any, rememberMe: boolean) => {
    setIsLoading(true);
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            const userData = await res.json();
            setUser(userData);
            setIsAuthenticated(true);
            if (rememberMe) {
              localStorage.setItem('finance_app_auth', JSON.stringify(userData));
            }
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
            alert("Cadastro realizado com sucesso! Um e-mail de confirmação foi enviado.");
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
        return <Dashboard transactions={transactions} banks={banks.filter(b => b.active)} />;
      case 'transactions':
        return (
          <Transactions 
            transactions={transactions} 
            banks={banks.filter(b => b.active)}
            categories={categories}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onReconcile={handleReconcile}
          />
        );
      case 'import':
        return <OFXImports banks={banks.filter(b => b.active)} onTransactionsImported={fetchTransactions} />;
      case 'banks':
        return <BankList banks={banks} onUpdateBank={handleUpdateBank} />;
      case 'categories':
        return (
             <div className="bg-white p-8 rounded-xl border border-gray-200 text-center">
                 <h2 className="text-2xl font-bold text-gray-800">Gerenciamento de Categorias</h2>
                 <p className="text-gray-500 mt-2">Funcionalidade em desenvolvimento.</p>
                 <div className="mt-6 flex flex-wrap gap-2 justify-center">
                     {categories.map(c => (
                         <span key={c.id} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                             {c.name}
                         </span>
                     ))}
                 </div>
             </div>
        );
      case 'reports':
        return <Reports transactions={transactions} categories={categories} />;
      case 'forecasts':
        return <Forecasts banks={banks.filter(b => b.active)} categories={categories} />;
      default:
        return <Dashboard transactions={transactions} banks={banks} />;
    }
  };

  return (
    <Layout 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onLogout={handleLogout}
        userName={user?.razaoSocial}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;