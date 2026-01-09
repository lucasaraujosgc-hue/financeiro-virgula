import React, { useState, useEffect } from 'react';
import { Users, LayoutDashboard, FileText, Trash2, LogOut, ShieldAlert, BarChart } from 'lucide-react';

interface AdminPanelProps {
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'audit'>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [auditData, setAuditData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const getHeaders = () => ({
      'Content-Type': 'application/json',
      'user-id': 'admin'
  });

  useEffect(() => {
      fetchStats();
  }, []);

  useEffect(() => {
      if (activeTab === 'users') fetchUsers();
      if (activeTab === 'audit') fetchAuditData();
  }, [activeTab]);

  const fetchStats = async () => {
      try {
          const res = await fetch('/api/admin/global-data', { headers: getHeaders() });
          if(res.ok) setStats(await res.json());
      } catch (e) { console.error(e); }
  };

  const fetchUsers = async () => {
      setLoading(true);
      try {
          const res = await fetch('/api/admin/users', { headers: getHeaders() });
          if(res.ok) setUsers(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
  };

  const fetchAuditData = async () => {
      setLoading(true);
      try {
          const res = await fetch('/api/admin/audit-transactions', { headers: getHeaders() });
          if(res.ok) setAuditData(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
  };

  const handleDeleteUser = async (id: number, email: string) => {
      if (confirm(`ATENÇÃO: Você está prestes a excluir a empresa ${email} e TODOS os seus dados (lançamentos, bancos, etc). Esta ação é irreversível. Confirmar?`)) {
          try {
              const res = await fetch(`/api/admin/users/${id}`, {
                  method: 'DELETE',
                  headers: getHeaders()
              });
              if (res.ok) {
                  alert("Usuário removido com sucesso.");
                  fetchUsers();
                  fetchStats();
              }
          } catch (e) {
              alert("Erro ao excluir usuário.");
          }
      }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
          <div className="p-6 border-b border-slate-800 flex items-center gap-2">
              <ShieldAlert className="text-red-500" size={24}/>
              <h1 className="font-bold text-lg text-white">Admin Master</h1>
          </div>
          <nav className="flex-1 p-4 space-y-2">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                  <LayoutDashboard size={20}/> Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'users' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                  <Users size={20}/> Gerenciar Usuários
              </button>
              <button 
                onClick={() => setActiveTab('audit')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'audit' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                  <FileText size={20}/> Auditoria Global
              </button>
          </nav>
          <div className="p-4 border-t border-slate-800">
              <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                  <LogOut size={20}/> Sair
              </button>
          </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-black p-8">
          
          {/* Dashboard View */}
          {activeTab === 'dashboard' && stats && (
              <div className="space-y-8 animate-in fade-in duration-500">
                  <h2 className="text-2xl font-bold text-white mb-6">Visão Geral do Sistema</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                          <div className="flex items-center justify-between mb-4">
                              <h3 className="text-slate-400 font-medium">Usuários Cadastrados</h3>
                              <Users className="text-blue-500" size={24}/>
                          </div>
                          <p className="text-3xl font-bold text-white">{stats.users?.count || 0}</p>
                      </div>
                      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                          <div className="flex items-center justify-between mb-4">
                              <h3 className="text-slate-400 font-medium">Lançamentos Totais</h3>
                              <BarChart className="text-emerald-500" size={24}/>
                          </div>
                          <p className="text-3xl font-bold text-white">{stats.transactions?.count || 0}</p>
                      </div>
                      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                          <div className="flex items-center justify-between mb-4">
                              <h3 className="text-slate-400 font-medium">Volume Financeiro</h3>
                              <FileText className="text-amber-500" size={24}/>
                          </div>
                          <p className="text-2xl font-bold text-white">R$ {(stats.transactions?.totalValue || 0).toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                          <div className="flex items-center justify-between mb-4">
                              <h3 className="text-slate-400 font-medium">Arquivos OFX</h3>
                              <FileText className="text-purple-500" size={24}/>
                          </div>
                          <p className="text-3xl font-bold text-white">{stats.imports?.count || 0}</p>
                      </div>
                  </div>
              </div>
          )}

          {/* Users View */}
          {activeTab === 'users' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                  <h2 className="text-2xl font-bold text-white">Gerenciamento de Empresas</h2>
                  <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-800 text-slate-400 font-bold">
                              <tr>
                                  <th className="px-6 py-4">ID</th>
                                  <th className="px-6 py-4">Razão Social</th>
                                  <th className="px-6 py-4">CNPJ</th>
                                  <th className="px-6 py-4">Email</th>
                                  <th className="px-6 py-4">Telefone</th>
                                  <th className="px-6 py-4 text-center">Ações</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                              {loading ? (
                                  <tr><td colSpan={6} className="text-center py-8">Carregando...</td></tr>
                              ) : users.map(user => (
                                  <tr key={user.id} className="hover:bg-slate-800/50">
                                      <td className="px-6 py-4 text-slate-500">#{user.id}</td>
                                      <td className="px-6 py-4 font-medium text-white">{user.razao_social}</td>
                                      <td className="px-6 py-4 text-slate-300">{user.cnpj}</td>
                                      <td className="px-6 py-4 text-slate-300">{user.email}</td>
                                      <td className="px-6 py-4 text-slate-300">{user.phone}</td>
                                      <td className="px-6 py-4 text-center">
                                          <button 
                                            onClick={() => handleDeleteUser(user.id, user.email)}
                                            className="p-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors"
                                            title="Excluir Empresa e Dados"
                                          >
                                              <Trash2 size={18}/>
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {/* Audit View */}
          {activeTab === 'audit' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                  <h2 className="text-2xl font-bold text-white">Auditoria Global (Últimos 500 lançamentos)</h2>
                  <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                      <div className="overflow-auto max-h-[80vh] custom-scroll">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-800 text-slate-400 font-bold sticky top-0">
                                <tr>
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4">Empresa</th>
                                    <th className="px-6 py-4">Descrição</th>
                                    <th className="px-6 py-4 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {loading ? (
                                    <tr><td colSpan={4} className="text-center py-8">Carregando...</td></tr>
                                ) : auditData.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-800/50">
                                        <td className="px-6 py-4 text-slate-400 font-mono">{t.date}</td>
                                        <td className="px-6 py-4 text-blue-400 font-medium">{t.razao_social}</td>
                                        <td className="px-6 py-4 text-slate-200">{t.description}</td>
                                        <td className={`px-6 py-4 text-right font-bold ${t.type === 'credito' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {t.type === 'debito' ? '-' : '+'} R$ {t.value.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                      </div>
                  </div>
              </div>
          )}
      </main>
    </div>
  );
};

export default AdminPanel;