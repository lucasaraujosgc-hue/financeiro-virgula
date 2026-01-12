import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import BankList from './components/BankList';
import Reports from './components/Reports';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import SignUp from './components/SignUp';
import ResetPassword from './components/ResetPassword';
import FinalizeSignUp from './components/FinalizeSignUp';
import Forecasts from './components/Forecasts';
import OFXImports from './components/OFXImports';
import Categories from './components/Categories';
import KeywordRules from './components/KeywordRules';
import Tutorial from './components/Tutorial';
import AdminPanel from './components/AdminPanel'; 
import { Transaction, Bank, Category, Forecast, KeywordRule } from './types';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

function App() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null); 
  const [authView, setAuthView] = useState<'login' | 'forgot' | 'signup' | 'reset' | 'finalize'>('login');
  const [urlToken, setUrlToken] = useState<string | null>(null); 
  const [isLoading, setIsLoading] = useState(false);
  const [isAppError, setIsAppError] = useState(false);

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
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const token = params.get('token');

    if (action && token) {
        setUrlToken(token);
        if (action === 'finalize') {
            setAuthView('finalize');
        } else if (action === 'reset') {
            setAuthView('reset');
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        const savedAuth = localStorage.getItem('finance_app_auth');
        if (savedAuth) {
            try {
                const userData = JSON.parse(savedAuth);
                setUser(userData);
                setIsAuthenticated(true);
            } catch (e) {
                localStorage.removeItem('finance_app_auth');
            }
        }
    }
  }, []);

  // Fetch Core Data on Auth
  useEffect(() => {
    if (isAuthenticated && user?.id) {
        if (user.role !== 'admin') {
            fetchInitialData();
        }
    }
  }, [isAuthenticated, user]);

  // Derived state updates (Balances)
  // REVERTED: Balances now include ALL transactions (Pending + Reconciled) based on user request.
  useEffect(() => {
    if (banks.length > 0) {
        const updatedBanks = banks.map(bank => {
            const bankTxs = transactions.filter(t => t.bankId === bank.id);
            const balance = bankTxs.reduce((acc, t) => {
                const val = Number(t.value);
                // Adjust string matching to be robust ('credito', 'credit', etc)
                const isCredit = String(t.type).toLowerCase().includes('credit') || String(t.type).toLowerCase().includes('receita');
                return isCredit ? acc + val : acc - val;
            }, 0);
            return { ...bank, balance };
        });
        
        // Check if actually changed to avoid infinite loops
        const hasChanged = updatedBanks.some((b, i) => Math.abs(b.balance - banks[i].balance) > 0.001);
        if (hasChanged) setBanks(updatedBanks);
    }
  }, [transactions, banks.length]); 

  const getHeaders = () => {
    return {
        'Content-Type': 'application/json',
        'user-id': String(user?.id || '')
    };
  };

  const fetchInitialData = async () => {
      setIsAppError(false);
      try {
          await Promise.all([
              fetchBanks(),
              fetchCategories(),
              fetchTransactions(),
              fetchForecasts(),
              fetchKeywordRules()
          ]);
      } catch (e) {
          console.error("Critical Error fetching initial data", e);
          setIsAppError(true);
      }
  };

  const fetchBanks = async () => {
      const res = await fetch('/api/banks', { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch banks");
      setBanks(await res.json());
  };

  const fetchCategories = async () => {
      const res = await fetch('/api/categories', { headers: getHeaders() });
      if (res.ok) setCategories(await res.json());
  };

  const fetchTransactions = async () => {
      const res = await fetch('/api/transactions', { headers: getHeaders() });
      if (res.ok) setTransactions(await res.json());
  };

  const fetchForecasts = async () => {
      const res = await fetch('/api/forecasts', { headers: getHeaders() });
      if (res.ok) setForecasts(await res.json());
  };

  const fetchKeywordRules = async () => {
      const res = await fetch('/api/keyword-rules', { headers: getHeaders() });
      if (res.ok) setKeywordRules(await res.json());
  };

  // ... (Rest of CRUD handlers remain the same) ...
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
      } catch (e) { alert("Erro ao adicionar categoria"); }
  };

  const handleDeleteCategory = async (id: number) => {
      if(confirm('Deseja excluir esta categoria?')) {
          try {
              const res = await fetch(`/api/categories/${id}`, { method: 'DELETE', headers: getHeaders() });
              if (res.ok) setCategories(prev => prev.filter(c => c.id !== id));
          } catch (e) { alert("Erro ao excluir categoria"); }
      }
  };

  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    try {
        const res = await fetch('/api/transactions', { method: 'POST', headers: getHeaders(), body: JSON.stringify(newTx) });
        if (res.ok) {
            const savedTx = await res.json();
            setTransactions(prev => [savedTx, ...prev]);
        }
    } catch (error) { alert("Erro ao salvar transação"); }
  };

  const handleEditTransaction = async (id: number, updatedTx: Omit<Transaction, 'id'>) => {
      try {
          const res = await fetch(`/api/transactions/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(updatedTx) });
          if (res.ok) {
              setTransactions(prev => prev.map(t => t.id === id ? { ...updatedTx, id, ofxImportId: t.ofxImportId } : t));
          }
      } catch (error) { alert("Erro ao editar transação"); }
  };

  const handleBatchUpdateTransaction = async (ids: number[], categoryId: number) => {
     try {
         const res = await fetch('/api/transactions/batch-update', { method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ transactionIds: ids, categoryId }) });
         if (res.ok) {
             setTransactions(prev => prev.map(t => ids.includes(t.id) ? { ...t, categoryId, reconciled: true } : t));
         }
     } catch (e) { alert("Erro ao atualizar em lote"); }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir este lançamento?')) {
        try {
            await fetch(`/api/transactions/${id}`, { method: 'DELETE', headers: getHeaders() });
            setTransactions(prev => prev.filter(t => t.id !== id));
        } catch (error) { alert("Erro ao excluir"); }
    }
  };

  const handleReconcile = async (id: number) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    try {
        await fetch(`/api/transactions/${id}/reconcile`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ reconciled: !tx.reconciled }) });
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, reconciled: !t.reconciled } : t));
    } catch (error) { alert("Erro ao atualizar status"); }
  };

  const handleUpdateBank = async (updatedBank: Bank) => {
      try {
          await fetch(`/api/banks/${updatedBank.id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(updatedBank) });
          setBanks(prev => prev.map(b => b.id === updatedBank.id ? updatedBank : b));
      } catch (e) { alert("Erro ao atualizar banco"); }
  };

  const handleAddBank = async (newBank: Omit<Bank, 'id' | 'balance' | 'active'>) => {
      try {
          const res = await fetch('/api/banks', { method: 'POST', headers: getHeaders(), body: JSON.stringify(newBank) });
          if (res.ok) {
              const savedBank = await res.json();
              setBanks(prev => [...prev, savedBank]);
          }
      } catch (e) { alert("Erro ao criar conta bancária"); }
  };

  const handleDeleteBank = async (id: number) => {
      try {
          const res = await fetch(`/api/banks/${id}`, { method: 'DELETE', headers: getHeaders() });
          if(res.ok) setBanks(prev => prev.filter(b => b.id !== id));
      } catch (e) { alert("Erro ao excluir banco"); }
  };

  const handleAddKeywordRule = async (rule: Omit<KeywordRule, 'id'>) => {
      try {
          const res = await fetch('/api/keyword-rules', { method: 'POST', headers: getHeaders(), body: JSON.stringify(rule) });
          if (res.ok) {
              const newRule = await res.json();
              setKeywordRules(prev => [...prev, newRule]);
          }
      } catch (e) { alert("Erro ao adicionar regra"); }
  };

  const handleDeleteKeywordRule = async (id: number) => {
      if(confirm('Deseja excluir esta regra?')) {
          try {
              const res = await fetch(`/api/keyword-rules/${id}`, { method: 'DELETE', headers: getHeaders() });
              if (res.ok) setKeywordRules(prev => prev.filter(r => r.id !== id));
          } catch (e) { alert("Erro ao excluir regra"); }
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

  const handleLogin = async (data: any, rememberMe: boolean) => {
    setIsLoading(true);
    try {
        const res = await fetch('/api/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
        if (res.ok) {
            const userData = await res.json();
            setUser(userData);
            setIsAuthenticated(true);
            if (rememberMe) localStorage.setItem('finance_app_auth', JSON.stringify(userData));
        } else {
            const err = await res.json();
            alert(err.error || "Erro no login");
        }
    } catch (e) { alert("Erro de conexão"); } finally { setIsLoading(false); }
  };

  const handleForgotPassword = async (email: string) => {
      try {
          const res = await fetch('/api/recover-password', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email }) });
          if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      } catch (e: any) { throw new Error(e.message || "Erro ao recuperar senha"); }
  };

  if (isAppError) {
      return (
          <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white p-4 text-center">
              <div className="bg-red-500/10 p-4 rounded-full mb-4">
                  <AlertTriangle className="text-red-500 w-12 h-12" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Serviço Indisponível</h2>
              <p className="text-slate-400 mb-6 max-w-md">
                  Não foi possível conectar ao servidor. Verifique sua conexão ou tente novamente mais tarde.
              </p>
              <button 
                onClick={fetchInitialData}
                className="flex items-center gap-2 bg-primary px-6 py-2 rounded-lg text-slate-900 font-bold hover:bg-emerald-400"
              >
                  <RefreshCcw size={18} /> Tentar Novamente
              </button>
          </div>
      );
  }

  // Auth Flow Handling
  if (!isAuthenticated) {
    if (authView === 'forgot') return <ForgotPassword onBack={() => setAuthView('login')} onSubmit={handleForgotPassword} />;
    if (authView === 'signup') return <SignUp onBack={() => setAuthView('login')} isLoading={isLoading} />;
    if (authView === 'finalize') return <FinalizeSignUp token={urlToken || ''} onSuccess={() => { setAuthView('login'); setUrlToken(null); }} />;
    if (authView === 'reset') return <ResetPassword token={urlToken || ''} onSuccess={() => setAuthView('login')} />;
    return <Login onLogin={handleLogin} onForgotPassword={() => setAuthView('forgot')} onSignUp={() => setAuthView('signup')} isLoading={isLoading} />;
  }

  if (user?.role === 'admin') return <AdminPanel onLogout={handleLogout} />;

  const activeBanks = banks.filter(b => b.active);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard userId={user.id} transactions={transactions} banks={activeBanks} forecasts={forecasts} categories={categories} onRefresh={fetchInitialData} />;
      case 'transactions': return <Transactions userId={user.id} transactions={transactions} banks={activeBanks} categories={categories} onAddTransaction={handleAddTransaction} onEditTransaction={handleEditTransaction} onDeleteTransaction={handleDeleteTransaction} onReconcile={handleReconcile} onBatchUpdate={handleBatchUpdateTransaction} />;
      case 'import': return <OFXImports userId={user.id} banks={activeBanks} keywordRules={keywordRules} transactions={transactions} onTransactionsImported={fetchInitialData} />;
      case 'rules': return <KeywordRules categories={categories} rules={keywordRules} banks={activeBanks} onAddRule={handleAddKeywordRule} onDeleteRule={handleDeleteKeywordRule} />;
      case 'banks': return <BankList banks={banks} onUpdateBank={handleUpdateBank} onAddBank={handleAddBank} onDeleteBank={handleDeleteBank} />;
      case 'categories': return <Categories categories={categories} onAddCategory={handleAddCategory} onDeleteCategory={handleDeleteCategory} />;
      case 'reports': return <Reports transactions={transactions} categories={categories} />;
      case 'forecasts': return <Forecasts userId={user.id} banks={activeBanks} categories={categories} onUpdate={fetchInitialData} />;
      case 'tutorial': return <Tutorial />;
      default: return <Dashboard userId={user.id} transactions={transactions} banks={activeBanks} forecasts={forecasts} categories={categories} onRefresh={fetchInitialData} />;
    }
  };

  return <Layout activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} userName={user?.razaoSocial}>{renderContent()}</Layout>;
}

export default App;