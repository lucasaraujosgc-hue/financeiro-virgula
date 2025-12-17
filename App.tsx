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
import Categories from './components/Categories';
import { Transaction, Bank, Category, Forecast } from './types';

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
  const [forecasts, setForecasts] = useState<Forecast[]>([]);

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
    if (isAuthenticated && user?.id) {
        fetchInitialData();
    }
  }, [isAuthenticated, user]);

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
  }, [transactions.length]); 

  const getHeaders = () => {
    return {
        'Content-Type': 'application/json',
        'user-id': String(user?.id || '')
    };
  };

  const fetchInitialData = async () => {
      await Promise.all([
          fetchBanks(),
          fetchCategories(),
          fetchTransactions(),
          fetchForecasts()
      ]);
  };

  const fetchBanks = async () => {
      try {
          const res = await fetch('/api/banks', { headers: getHeaders() });
          if (res.ok) setBanks(await res.json());
      } catch (e) { console.error(e) }
  };

  const fetchCategories = async () => {
      try {
          const res = await fetch('/api/categories', { headers: getHeaders() });
          if (res.ok) setCategories(await res.json());
      } catch (e) { console.error(e) }
  };

  const fetchTransactions = async () => {
    try {
        const res = await fetch('/api/transactions', { headers: getHeaders() });
        if (res.ok) {
            const data = await res.json();
            setTransactions(data);
        }
    } catch (error) {
        console.error("Failed to fetch transactions", error);
    }
  };

  const fetchForecasts = async () => {
    try {
        const res = await fetch('/api/forecasts', { headers: getHeaders() });
        if (res.ok) {
            setForecasts(await res.json());
        }
    } catch (error) {
        console.error("Failed to fetch forecasts", error);
    }
  };

  const handleAddCategory = async (category: Omit<Category, 'id'>) => {
      try {
          const res = await fetch('/api/categories', {
              method: 'POST',
              headers: getHeaders(),
              body: JSON.stringify(category)
          });
          if (res.ok) {
              const newCat = await res.json();
              setCategories(prev => [...prev, newCat]);
          }
      } catch (e) {
          alert("Erro ao adicionar categoria");
      }
  };

  const handleDeleteCategory = async (id: number) => {
      if(confirm('Deseja excluir esta categoria?')) {
          try {
              const res = await fetch(`/api/categories/${id}`, { 
                  method: 'DELETE',
                  headers: getHeaders() 
              });
              if (res.ok) {
                  setCategories(prev => prev.filter(c => c.id !== id));
              }
          } catch (e) {
              alert("Erro ao excluir categoria");
          }
      }
  };

  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    try {
        const res = await fetch('/api/transactions', {
            method: 'POST',
            headers: getHeaders(),
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
            await fetch(`/api/transactions/${id}`, { 
                method: 'DELETE',
                headers: getHeaders()
            });
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
            headers: getHeaders(),
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
              headers: getHeaders(),
              body: JSON.stringify(updatedBank)
          });
          setBanks(prev => prev.map(b => b.id === updatedBank.id ? updatedBank : b));
      } catch (e) {
          alert("Erro ao atualizar banco");
      }
  };

  const handleAddBank = async (newBank: Omit<Bank, 'id' | 'balance' | 'active'>) => {
      try {
          const res = await fetch('/api/banks', {
              method: 'POST',
              headers: getHeaders(),
              body: JSON.stringify(newBank)
          });
          if (res.ok) {
              const savedBank = await res.json();
              setBanks(prev => [...prev, savedBank]);
          }
      } catch (e) {
          alert("Erro ao criar conta bancária");
      }
  };

  const handleDeleteBank = async (id: number) => {
      try {
          const res = await fetch(`/api/banks/${id}`, { 
              method: 'DELETE',
              headers: getHeaders()
          });
          if(res.ok) {
              setBanks(prev => prev.filter(b => b.id !== id));
          }
      } catch (e) {
          alert("Erro ao excluir banco");
      }
  };

  const handleLogout = () => {
      if (confirm('Deseja realmente sair?')) {
          setIsAuthenticated(false);
          setAuthView('login');
          setActiveTab('dashboard');
          setUser(null);
          localStorage.removeItem('finance_app_auth');
          setBanks([]);
          setTransactions([]);
          setCategories([]);
          setForecasts([]);
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
        return (
          <Dashboard 
            userId={user.id}
            transactions={transactions} 
            banks={banks.filter(b => b.active)} 
            forecasts={forecasts}
            categories={categories}
            onRefresh={fetchInitialData}
          />
        );
      case 'transactions':
        return (
          <Transactions 
            userId={user.id}
            transactions={transactions} 
            banks={banks.filter(b => b.active)}
            categories={categories}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onReconcile={handleReconcile}
          />
        );
      case 'import':
        return <OFXImports userId={user.id} banks={banks.filter(b => b.active)} onTransactionsImported={fetchTransactions} />;
      case 'banks':
        return (
            <BankList 
                banks={banks} 
                onUpdateBank={handleUpdateBank} 
                onAddBank={handleAddBank}
                onDeleteBank={handleDeleteBank}
            />
        );
      case 'categories':
        return (
            <Categories 
                categories={categories} 
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
            />
        );
      case 'reports':
        return <Reports transactions={transactions} categories={categories} />;
      case 'forecasts':
        return <Forecasts userId={user.id} banks={banks.filter(b => b.active)} categories={categories} />;
      default:
        return <Dashboard userId={user.id} transactions={transactions} banks={banks} forecasts={forecasts} categories={categories} onRefresh={fetchInitialData} />;
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