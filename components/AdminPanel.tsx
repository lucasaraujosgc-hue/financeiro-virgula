import React, { useState, useEffect } from 'react';
import { Users, LayoutDashboard, FileText, Trash2, LogOut, ShieldAlert, BarChart, Eye, X, Download, Calendar, Receipt, ArrowUpRight, FileSpreadsheet } from 'lucide-react';

interface AdminPanelProps {
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'audit'>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [auditData, setAuditData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // User Detail View State
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<'transactions' | 'forecasts' | 'files'>('transactions');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  const handleOpenUser = async (user: any) => {
      setSelectedUser(user);
      setLoading(true);
      
      const today = new Date();
      setStartDate(new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]);
      setEndDate(new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0]);

      try {
          const res = await fetch(`/api/admin/users/${user.id}/full-data`, { headers: getHeaders() });
          if (res.ok) {
              setUserDetails(await res.json());
          }
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const handleDeleteUser = async (id: number, email: string) => {
      if (confirm(`ATENÇÃO: Você está prestes a excluir a empresa ${email} e TODOS os seus dados. Confirmar?`)) {
          try {
              const res = await fetch(`/api/admin/users/${id}`, {
                  method: 'DELETE',
                  headers: getHeaders()
              });
              if (res.ok) {
                  alert("Usuário removido com sucesso.");
                  fetchUsers();
                  fetchStats();
                  setSelectedUser(null);
              }
          } catch (e) {
              alert("Erro ao excluir usuário.");
          }
      }
  };

  const handleExportExcel = (data: any[], filename: string) => {
      if (!data || data.length === 0) return alert("Sem dados para exportar.");
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(obj => Object.values(obj).map(v => `"${v}"`).join(','));
      const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${filename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleDownloadOFX = (importId: number) => {
      // Abre nova aba enviando userId na URL para autenticação
      window.open(`/api/admin/ofx-download/${importId}?userId=admin`, '_blank');
  };

  const filterByDate = (items: any[]) => {
      if (!items) return [];
      return items.filter(item => {
          const d = item.date || item.import_date;
          if (!d) return false;
          const itemDate = d.split('T')[0];
          return itemDate >= startDate && itemDate <= endDate;
      });
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
          <div className="p-6 border-b border-slate-800 flex items-center gap-2">
              <ShieldAlert className="text-red-500" size={24}/>
              <h1 className="font-bold text-lg text-white">Admin Master</h1>
          </div>
          <nav className="flex-1 p-4 space-y-2">
              <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><LayoutDashboard size={20}/> Dashboard</button>
              <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'users' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><Users size={20}/> Usuários</button>
              <button onClick={() => setActiveTab('audit')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'audit' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><FileText size={20}/> Auditoria</button>
          </nav>
          <div className="p-4 border-t border-slate-800">
              <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"><LogOut size={20}/> Sair</button>
          </div>
      </aside>

      <main className="flex-1 overflow-auto bg-black p-8 relative">
          {activeTab === 'dashboard' && stats && (
              <div className="space-y-8 animate-in fade-in duration-500">
                  <h2 className="text-2xl font-bold text-white mb-6">Visão Geral</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><h3 className="text-slate-400 font-medium">Usuários</h3><p className="text-3xl font-bold text-white">{stats.users?.count || 0}</p></div>
                      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><h3 className="text-slate-400 font-medium">Lançamentos</h3><p className="text-3xl font-bold text-white">{stats.transactions?.count || 0}</p></div>
                      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><h3 className="text-slate-400 font-medium">Volume</h3><p className="text-2xl font-bold text-white">R$ {(stats.transactions?.totalValue || 0).toLocaleString('pt-BR')}</p></div>
                      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><h3 className="text-slate-400 font-medium">OFX</h3><p className="text-3xl font-bold text-white">{stats.imports?.count || 0}</p></div>
                  </div>
              </div>
          )}

          {activeTab === 'users' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                  <h2 className="text-2xl font-bold text-white">Gerenciamento de Empresas</h2>
                  <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-800 text-slate-400 font-bold">
                              <tr><th className="px-6 py-4">ID</th><th className="px-6 py-4">Razão Social</th><th className="px-6 py-4">CNPJ</th><th className="px-6 py-4">Email</th><th className="px-6 py-4 text-center">Ações</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                              {loading ? <tr><td colSpan={5} className="text-center py-8">Carregando...</td></tr> : users.map(user => (
                                  <tr key={user.id} className="hover:bg-slate-800/50">
                                      <td className="px-6 py-4 text-slate-500">#{user.id}</td>
                                      <td className="px-6 py-4 font-medium text-white">{user.razao_social}</td>
                                      <td className="px-6 py-4 text-slate-300">{user.cnpj}</td>
                                      <td className="px-6 py-4 text-slate-300">{user.email}</td>
                                      <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                                          <button onClick={() => handleOpenUser(user)} className="p-2 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20"><Eye size={18}/></button>
                                          <button onClick={() => handleDeleteUser(user.id, user.email)} className="p-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20"><Trash2 size={18}/></button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {activeTab === 'audit' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                  <h2 className="text-2xl font-bold text-white">Auditoria Global</h2>
                  <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden max-h-[80vh] overflow-y-auto custom-scroll">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-800 text-slate-400 font-bold sticky top-0">
                              <tr><th className="px-6 py-4">Data</th><th className="px-6 py-4">Empresa</th><th className="px-6 py-4">Descrição</th><th className="px-6 py-4 text-right">Valor</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                              {auditData.map(t => (
                                  <tr key={t.id} className="hover:bg-slate-800/50">
                                      <td className="px-6 py-4 text-slate-400 font-mono">{t.date}</td>
                                      <td className="px-6 py-4 text-blue-400 font-medium">{t.razao_social}</td>
                                      <td className="px-6 py-4 text-slate-200">{t.description}</td>
                                      <td className={`px-6 py-4 text-right font-bold ${t.type === 'credito' ? 'text-emerald-500' : 'text-rose-500'}`}>{t.type === 'debito' ? '-' : '+'} R$ {t.value.toFixed(2)}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {selectedUser && (
              <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300">
                  <div className="bg-slate-900 border-b border-slate-800 p-6 flex justify-between items-center shadow-md">
                      <div><h2 className="text-2xl font-bold text-white">{selectedUser.razao_social}</h2><p className="text-slate-400 text-sm">{selectedUser.cnpj}</p></div>
                      <button onClick={() => setSelectedUser(null)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300"><X size={24}/></button>
                  </div>
                  <div className="flex-1 overflow-hidden flex flex-col p-6 max-w-7xl mx-auto w-full">
                      <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                          <div className="flex items-center gap-4">
                              <div><label className="text-xs font-bold text-slate-500 block mb-1">Início</label><input type="date" className="bg-slate-950 border border-slate-700 text-white rounded px-3 py-1.5" value={startDate} onChange={(e) => setStartDate(e.target.value)}/></div>
                              <div><label className="text-xs font-bold text-slate-500 block mb-1">Fim</label><input type="date" className="bg-slate-950 border border-slate-700 text-white rounded px-3 py-1.5" value={endDate} onChange={(e) => setEndDate(e.target.value)}/></div>
                          </div>
                          <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                              <button onClick={() => setDetailTab('transactions')} className={`px-4 py-2 rounded-md text-sm font-medium ${detailTab === 'transactions' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Lançamentos</button>
                              <button onClick={() => setDetailTab('forecasts')} className={`px-4 py-2 rounded-md text-sm font-medium ${detailTab === 'forecasts' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Previsões</button>
                              <button onClick={() => setDetailTab('files')} className={`px-4 py-2 rounded-md text-sm font-medium ${detailTab === 'files' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Arquivos OFX</button>
                          </div>
                      </div>
                      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-inner flex flex-col">
                          {loading ? <div className="flex-1 flex items-center justify-center text-slate-500">Carregando...</div> : (
                              <>
                                {detailTab === 'transactions' && userDetails && (
                                    <div className="flex-1 overflow-auto custom-scroll">
                                        <div className="p-4 border-b border-slate-800 flex justify-between bg-slate-800/30"><h3 className="font-bold text-white">Lançamentos</h3><button onClick={() => handleExportExcel(filterByDate(userDetails.transactions), 'lancamentos')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 rounded text-sm text-white"><Download size={16}/> Excel</button></div>
                                        <table className="w-full text-sm text-left"><thead className="bg-slate-950 text-slate-400 font-bold sticky top-0"><tr><th className="px-6 py-3">Data</th><th className="px-6 py-3">Descrição</th><th className="px-6 py-3 text-right">Valor</th></tr></thead>
                                        <tbody className="divide-y divide-slate-800">{filterByDate(userDetails.transactions).map((t: any) => (<tr key={t.id} className="hover:bg-slate-800/50"><td className="px-6 py-3 text-slate-400 font-mono">{t.date}</td><td className="px-6 py-3 text-slate-200">{t.description}</td><td className={`px-6 py-3 text-right font-bold ${t.type === 'credito' ? 'text-emerald-500' : 'text-rose-500'}`}>{t.value.toFixed(2)}</td></tr>))}</tbody></table>
                                    </div>
                                )}
                                {detailTab === 'files' && userDetails && (
                                    <div className="flex-1 overflow-auto custom-scroll">
                                        <div className="p-4 border-b border-slate-800 bg-slate-800/30"><h3 className="font-bold text-white">Arquivos</h3></div>
                                        <table className="w-full text-sm text-left"><thead className="bg-slate-950 text-slate-400 font-bold sticky top-0"><tr><th className="px-6 py-3">Data</th><th className="px-6 py-3">Arquivo</th><th className="px-6 py-3 text-center">Ação</th></tr></thead>
                                        <tbody className="divide-y divide-slate-800">{filterByDate(userDetails.ofxImports).map((file: any) => (<tr key={file.id} className="hover:bg-slate-800/50"><td className="px-6 py-3 text-slate-400">{new Date(file.import_date).toLocaleString()}</td><td className="px-6 py-3 text-slate-200">{file.file_name}</td><td className="px-6 py-3 text-center"><button onClick={() => handleDownloadOFX(file.id)} className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-xs text-white hover:bg-slate-700 flex items-center gap-2 mx-auto"><Download size={14}/> Baixar</button></td></tr>))}</tbody></table>
                                    </div>
                                )}
                              </>
                          )}
                      </div>
                  </div>
              </div>
          )}
      </main>
    </div>
  );
};

export default AdminPanel;