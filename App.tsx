import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import BankList from './components/BankList';
import Reports from './components/Reports';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import PreSignUp from './components/PreSignUp';
import SignUp from './components/SignUp';
import ResetPassword from './components/ResetPassword';
import Forecasts from './components/Forecasts';
import OFXImports from './components/OFXImports';
import Categories from './components/Categories';
import KeywordRules from './components/KeywordRules';
import { Transaction, Bank, Category, Forecast, KeywordRule } from './types';

function App() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null); // Store user info
  const [authView, setAuthView] = useState<'login' | 'forgot' | 'presignup' | 'signup' | 'reset'>('login');
  const [urlToken, setUrlToken] = useState<string | null>(null); // For handling email links
  const [isLoading, setIsLoading] = useState(false);

  // App State
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data State
  const [banks, setBanks] = useState<Bank[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [keywordRules, setKeywordRules] = useState<KeywordRule[]>([]);

  // Check LocalStorage & URL Params on Mount
  useEffect(() => {
    // 1. Check URL Params for Email Links (Reset Password or Signup)
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const token = params.get('token');

    if (action && token) {
        setUrlToken(token);
        if (action === 'signup') {
            setAuthView('signup');
        } else if (action === 'reset') {
            setAuthView('reset');
        }
        // Clean URL to avoid re-triggering on refresh (optional, but good UX)
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        // 2. Only check local storage if no URL action
        const savedAuth = localStorage.getItem('finance_app_auth');
        if (savedAuth) {
            const userData = JSON.parse(savedAuth);
            setUser(userData);
            setIsAuthenticated(true);
        }
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
          fetchForecasts(),
          fetchKeywordRules()
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

  const fetchKeywordRules = async () => {
      try {
          const res = await fetch('/api/keyword-rules', { headers: getHeaders() });
          if (res.ok) setKeywordRules(await res.json());
      } catch (e) { console.error(e) }
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

  const handleEditTransaction = async (id: number, updatedTx: Omit<Transaction, 'id'>) => {
      try {
          const res = await fetch(`/api/transactions/${id}`, {
              method: 'PUT',
              headers: getHeaders(),
              body: JSON.stringify(updatedTx)
          });
          
          if (res.ok) {
              setTransactions(prev => prev.map(t => 
                  t.id === id ? { ...updatedTx, id, ofxImportId: t.ofxImportId } : t
              ));
          } else {
              throw new Error("Erro ao atualizar");
          }
      } catch (error) {
          alert("Erro ao editar transação");
          console.error(error);
      }
  };

  const handleBatchUpdateTransaction = async (ids: number[], categoryId: number) => {
     try {
         const res = await fetch('/api/transactions/batch-update', {
             method: 'PATCH',
             headers: getHeaders(),
             body: JSON.stringify({ transactionIds: ids, categoryId })
         });
         
         if (res.ok) {
             setTransactions(prev => prev.map(t => 
                ids.includes(t.id) ? { ...t, categoryId, reconciled: true } : t
             ));
         } else {
             throw new Error("Falha na atualização em lote");
         }
     } catch (e) {
         alert("Erro ao atualizar em lote");
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

  const handleAddKeywordRule = async (rule: Omit<KeywordRule, 'id'>) => {
      try {
          const res = await fetch('/api/keyword-rules', {
              method: 'POST',
              headers: getHeaders(),
              body: JSON.stringify(rule)
          });
          if (res.ok) {
              const newRule = await res.json();
              setKeywordRules(prev => [...prev, newRule]);
          }
      } catch (e) {
          alert("Erro ao adicionar regra");
      }
  };

  const handleDeleteKeywordRule = async (id: number) => {
      if(confirm('Deseja excluir esta regra?')) {
          try {
              const res = await fetch(`/api/keyword-rules/${id}`, { 
                  method: 'DELETE',
                  headers: getHeaders() 
              });
              if (res.ok) {
                  setKeywordRules(prev => prev.filter(r => r.id !== id));
              }
          } catch (e) {
              alert("Erro ao excluir regra");
          }
      }
  };

  const handleLogout = () => {
      if (confirm('Deseja realmente sair?')) {
          setIsAuthenticated(false);
          setAuthView('login');
          setActiveTab('dashboard');
          setUser(null);
          setUrlToken(null);
          localStorage.removeItem('finance_app_auth');
          setBanks([]);
          setTransactions([]);
          setCategories([]);
          setForecasts([]);
          setKeywordRules([]);
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

  const handleCompleteSignUp = async (data: any) => {
    setIsLoading(true);
    try {
        const res = await fetch('/api/complete-signup', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        if (res.ok) {
            alert("Conta criada com sucesso! Faça login para continuar.");
            setAuthView('login');
            setUrlToken(null);
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
    if (authView === 'presignup') {
        return <PreSignUp onBack={() => setAuthView('login')} isLoading={isLoading} />;
    }
    if (authView === 'signup') {
        return <SignUp token={urlToken} onSignUp={handleCompleteSignUp} isLoading={isLoading} />;
    }
    if (authView === 'reset') {
        return <ResetPassword token={urlToken || ''} onSuccess={() => setAuthView('login')} />;
    }
    return (
      <Login 
        onLogin={handleLogin} 
        onForgotPassword={() => setAuthView('forgot')} 
        onSignUp={() => setAuthView('presignup')}
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
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onReconcile={handleReconcile}
            onBatchUpdate={handleBatchUpdateTransaction}
          />
        );
      case 'import':
        return (
            <OFXImports 
                userId={user.id} 
                banks={banks.filter(b => b.active)} 
                keywordRules={keywordRules}
                onTransactionsImported={fetchTransactions} 
            />
        );
      case 'rules':
        return (
            <KeywordRules
                categories={categories}
                rules={keywordRules}
                onAddRule={handleAddKeywordRule}
                onDeleteRule={handleDeleteKeywordRule}
            />
        );
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