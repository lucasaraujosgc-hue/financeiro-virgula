import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, Bank, Category, CategoryType } from '../types';
import { Search, Plus, Trash2, Check, X, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';

interface TransactionsProps {
  userId: number;
  transactions: Transaction[];
  banks: Bank[];
  categories: Category[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: number) => void;
  onReconcile: (id: number) => void;
}

const Transactions: React.FC<TransactionsProps> = ({ 
  userId, transactions, banks, categories, onAddTransaction, onDeleteTransaction, onReconcile 
}) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedBankId, setSelectedBankId] = useState<number | 'all'>('all');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    value: '',
    type: TransactionType.DEBIT,
    bankId: banks[0]?.id || 0,
    categoryId: 0, 
  });

  const getHeaders = () => ({
      'Content-Type': 'application/json',
      'user-id': String(userId)
  });

  useEffect(() => {
    if (isModalOpen && !editingId) {
       setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        value: '',
        type: TransactionType.DEBIT,
        bankId: banks[0]?.id || 0,
        categoryId: 0, 
       });
    }
  }, [isModalOpen, editingId, banks]);

  const handleEditClick = (t: Transaction) => {
      setEditingId(t.id);
      setFormData({
          date: t.date,
          description: t.description,
          value: String(t.value),
          type: t.type,
          bankId: t.bankId,
          categoryId: t.categoryId || 0
      });
      setIsModalOpen(true);
  };

  const filteredTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    const [y, m] = t.date.split('-');
    const yearMatch = parseInt(y) === selectedYear;
    const monthMatch = (parseInt(m) - 1) === selectedMonth;
    const bankMatch = selectedBankId === 'all' || t.bankId === selectedBankId;
    
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || t.type === typeFilter;

    return yearMatch && monthMatch && bankMatch && matchesSearch && matchesType;
  });

  const totalIncome = filteredTransactions.filter(t => t.type === TransactionType.CREDIT).reduce((a, b) => a + b.value, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === TransactionType.DEBIT).reduce((a, b) => a + b.value, 0);
  const periodBalance = totalIncome - totalExpense;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      date: formData.date,
      description: formData.description,
      value: Math.abs(Number(formData.value)), 
      type: formData.type,
      bankId: Number(formData.bankId),
      categoryId: Number(formData.categoryId),
      reconciled: false
    };

    if (editingId) {
        try {
            await fetch(`/api/transactions/${editingId}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            window.location.reload(); 
        } catch (error) {
            alert("Erro ao editar");
        }
    } else {
        onAddTransaction({ ...payload, summary: '' });
    }

    setIsModalOpen(false);
    setEditingId(null);
  };

  const availableCategories = categories.filter(c => 
    formData.type === TransactionType.CREDIT 
      ? c.type === CategoryType.INCOME 
      : c.type === CategoryType.EXPENSE
  );

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-2xl font-bold text-white">
            Lançamentos - {MONTHS[selectedMonth]}/{selectedYear}
        </h1>
       </div>

      {/* Filters Header */}
      <div className="bg-surface p-4 rounded-xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
           <div className="flex gap-4 w-full md:w-auto">
               <div>
                   <label className="text-xs font-semibold text-slate-500 block mb-1">Selecionar Ano</label>
                   <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                       <button onClick={() => setSelectedYear(selectedYear - 1)} className="px-3 py-1 hover:bg-slate-800 rounded-md text-sm text-slate-300"><ChevronLeft size={16}/></button>
                       <span className="px-4 py-1 font-semibold text-white">{selectedYear}</span>
                       <button onClick={() => setSelectedYear(selectedYear + 1)} className="px-3 py-1 hover:bg-slate-800 rounded-md text-sm text-slate-300"><ChevronRight size={16}/></button>
                   </div>
               </div>
               <div className="flex-1">
                   <label className="text-xs font-semibold text-slate-500 block mb-1">Filtrar por Banco</label>
                   <select 
                     className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-primary"
                     value={selectedBankId}
                     onChange={e => setSelectedBankId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                   >
                       <option value="all">Todos os Bancos</option>
                       {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                   </select>
               </div>
           </div>
           
           <button 
             onClick={() => { setEditingId(null); setIsModalOpen(true); }}
             className="px-4 py-2 bg-primary text-slate-900 rounded-lg hover:bg-primaryHover font-medium flex items-center gap-2 shadow-sm shadow-emerald-900/20"
           >
               <Plus size={18}/> Novo Lançamento
           </button>
      </div>

       {/* Month Navigation & Summary */}
       <div className="bg-surface rounded-xl border border-slate-800 shadow-sm overflow-hidden">
           <div className="flex flex-col lg:flex-row">
               <div className="lg:w-1/3 border-b lg:border-b-0 lg:border-r border-slate-800 p-4 flex items-center justify-between">
                    <button onClick={() => setSelectedMonth(prev => prev === 0 ? 11 : prev - 1)} className="p-2 hover:bg-slate-800 rounded-full text-primary"><ChevronLeft/></button>
                    <div className="font-bold text-xl text-primary">{MONTHS[selectedMonth]}</div>
                    <button onClick={() => setSelectedMonth(prev => prev === 11 ? 0 : prev + 1)} className="p-2 hover:bg-slate-800 rounded-full text-primary"><ChevronRight/></button>
               </div>
               
               <div className="flex-1 grid grid-cols-3 divide-x divide-slate-800">
                    <div className="p-4 text-center">
                        <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Receitas</div>
                        <div className="text-xl font-bold text-emerald-500">R$ {totalIncome.toFixed(2)}</div>
                    </div>
                    <div className="p-4 text-center">
                        <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Despesas</div>
                        <div className="text-xl font-bold text-rose-500">R$ {totalExpense.toFixed(2)}</div>
                    </div>
                    <div className="p-4 text-center bg-slate-900/50">
                        <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Saldo do Mês</div>
                        <div className={`text-xl font-bold ${periodBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            R$ {periodBalance.toFixed(2)}
                        </div>
                    </div>
               </div>
           </div>
       </div>

      {/* Internal Search */}
      <div className="bg-surface px-4 py-2 border border-slate-800 rounded-lg shadow-sm flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Buscar por descrição neste mês..."
            className="w-full pl-10 pr-4 py-2 bg-transparent border-none outline-none text-sm text-white placeholder-slate-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="h-6 w-px bg-slate-700"></div>
        <select 
            className="bg-transparent text-sm text-slate-400 outline-none"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">Todos os tipos</option>
            <option value={TransactionType.CREDIT}>Receitas</option>
            <option value={TransactionType.DEBIT}>Despesas</option>
          </select>
      </div>

      {/* Table */}
      <div className="bg-surface border border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center">
            <h3 className="font-semibold text-slate-200">Lançamentos Detalhados</h3>
            <span className="text-xs bg-slate-800 border border-slate-700 px-2 py-1 rounded text-slate-400">
                {filteredTransactions.length} registros
            </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-950 text-slate-400 font-medium border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Banco</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTransactions.length === 0 ? (
                  <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                          Nenhum lançamento encontrado neste período
                      </td>
                  </tr>
              ) : (
                  filteredTransactions.map((t) => {
                    const category = categories.find(c => c.id === t.categoryId);
                    const bank = banks.find(b => b.id === t.bankId);
                    
                    return (
                      <tr key={t.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 text-slate-400 font-mono">
                            {new Date(t.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-200">{t.description}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!category ? 'bg-red-900/30 text-red-400 border border-red-900/50' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                            {category?.name || 'Sem Categoria'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 flex items-center gap-2">
                            {bank && <img src={bank.logo} className="w-5 h-5 rounded-full object-contain bg-white p-0.5"/>}
                            {bank?.name}
                        </td>
                        <td className={`px-6 py-4 text-right font-medium ${t.type === TransactionType.CREDIT ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {t.type === TransactionType.DEBIT ? '- ' : '+ '}
                          R$ {t.value.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {t.reconciled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-medium">
                              <Check size={12} /> Conciliado
                            </span>
                          ) : (
                            <button 
                                onClick={() => onReconcile(t.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-medium hover:bg-amber-500/20 transition-colors"
                            >
                              Pendente
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleEditClick(t)}
                            className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => onDeleteTransaction(t.id)}
                            className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal (Add/Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-surface border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <h3 className="font-semibold text-white">{editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-400">Tipo</label>
                    <select 
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-white"
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value as TransactionType})}
                    >
                        <option value={TransactionType.DEBIT}>Despesa (-)</option>
                        <option value={TransactionType.CREDIT}>Receita (+)</option>
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-400">Data</label>
                    <input 
                        type="date" 
                        required
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-white"
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-400">Descrição</label>
                <input 
                    type="text" 
                    required
                    placeholder="Ex: Supermercado"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-white placeholder-slate-600"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-400">Valor (R$)</label>
                <input 
                    type="number" 
                    required
                    step="0.01"
                    placeholder="0,00"
                    className={`w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all font-mono font-bold ${
                        formData.type === TransactionType.DEBIT ? 'text-rose-500' : 'text-emerald-500'
                    }`}
                    value={formData.value}
                    onChange={e => {
                        const val = e.target.value;
                        const numVal = parseFloat(val);
                        let newType = formData.type;
                        if (!isNaN(numVal)) {
                            if (numVal < 0) newType = TransactionType.DEBIT;
                            if (numVal > 0) newType = TransactionType.CREDIT;
                        }
                        setFormData(prev => ({ ...prev, value: val, type: newType }));
                    }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-400">Banco</label>
                    <select 
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-white"
                        value={formData.bankId}
                        onChange={e => setFormData({...formData, bankId: Number(e.target.value)})}
                    >
                        {banks.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-400">Categoria</label>
                    <select 
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-white"
                        value={formData.categoryId}
                        onChange={e => setFormData({...formData, categoryId: Number(e.target.value)})}
                    >
                        {availableCategories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 font-medium transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-slate-900 rounded-lg hover:bg-primaryHover font-medium transition-colors shadow-sm shadow-emerald-900/50"
                >
                    {editingId ? 'Salvar Alterações' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;