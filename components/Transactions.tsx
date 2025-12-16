import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, Bank, Category, CategoryType } from '../types';
import { Search, Plus, Trash2, Check, X, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';

interface TransactionsProps {
  transactions: Transaction[];
  banks: Bank[];
  categories: Category[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: number) => void;
  onReconcile: (id: number) => void;
}

const Transactions: React.FC<TransactionsProps> = ({ 
  transactions, banks, categories, onAddTransaction, onDeleteTransaction, onReconcile 
}) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedBankId, setSelectedBankId] = useState<number | 'all'>('all');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    value: '',
    type: TransactionType.DEBIT,
    bankId: banks[0]?.id || 0,
    categoryId: 0, 
  });

  // Reset/Set defaults
  useEffect(() => {
    if (isModalOpen && !editingId) {
       // Reset for new transaction
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

  // Filter Transactions based on Time and Bank
  const filteredTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    // Simple parsing to avoid TZ issues
    const [y, m] = t.date.split('-');
    const yearMatch = parseInt(y) === selectedYear;
    const monthMatch = (parseInt(m) - 1) === selectedMonth;
    const bankMatch = selectedBankId === 'all' || t.bankId === selectedBankId;
    
    // Additional Search/Type filters
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
        // Update Existing
        try {
            await fetch(`/api/transactions/${editingId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            // Force refresh logic is currently handled by parent re-fetching in a real app,
            // or we simulate it here. But in App.tsx `onAddTransaction` only adds. 
            // We need to trigger a refresh. Since onAddTransaction just adds to state,
            // we will need to reload page or use a refresh callback. 
            // For now, we will assume App will fetch or we reload.
            // A quick hack for this structure is calling `onAddTransaction` with a special flag or just refreshing window.
            // Better: Pass a refresh callback prop. But let's reuse `onAddTransaction` to trigger a fetch in App if possible,
            // or simply reload.
            window.location.reload(); 
        } catch (error) {
            alert("Erro ao editar");
        }
    } else {
        // Create New
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
        <h1 className="text-2xl font-bold text-gray-900">
            Lançamentos - {MONTHS[selectedMonth]}/{selectedYear}
        </h1>
       </div>

      {/* Filters Header */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
           <div className="flex gap-4 w-full md:w-auto">
               <div>
                   <label className="text-xs font-semibold text-gray-500 block mb-1">Selecionar Ano</label>
                   <div className="flex bg-gray-100 rounded-lg p-1">
                       <button onClick={() => setSelectedYear(selectedYear - 1)} className="px-3 py-1 hover:bg-white rounded-md text-sm"><ChevronLeft size={16}/></button>
                       <span className="px-4 py-1 font-semibold text-gray-700">{selectedYear}</span>
                       <button onClick={() => setSelectedYear(selectedYear + 1)} className="px-3 py-1 hover:bg-white rounded-md text-sm"><ChevronRight size={16}/></button>
                   </div>
               </div>
               <div className="flex-1">
                   <label className="text-xs font-semibold text-gray-500 block mb-1">Filtrar por Banco</label>
                   <select 
                     className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none"
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
             className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 shadow-sm shadow-blue-200"
           >
               <Plus size={18}/> Novo Lançamento
           </button>
      </div>

       {/* Month Navigation & Summary */}
       <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
           <div className="flex flex-col lg:flex-row">
               <div className="lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-100 p-4 flex items-center justify-between">
                    <button onClick={() => setSelectedMonth(prev => prev === 0 ? 11 : prev - 1)} className="p-2 hover:bg-gray-100 rounded-full text-blue-600"><ChevronLeft/></button>
                    <div className="font-bold text-xl text-blue-700">{MONTHS[selectedMonth]}</div>
                    <button onClick={() => setSelectedMonth(prev => prev === 11 ? 0 : prev + 1)} className="p-2 hover:bg-gray-100 rounded-full text-blue-600"><ChevronRight/></button>
               </div>
               
               <div className="flex-1 grid grid-cols-3 divide-x divide-gray-100">
                    <div className="p-4 text-center">
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Receitas</div>
                        <div className="text-xl font-bold text-emerald-600">R$ {totalIncome.toFixed(2)}</div>
                    </div>
                    <div className="p-4 text-center">
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Despesas</div>
                        <div className="text-xl font-bold text-rose-600">R$ {totalExpense.toFixed(2)}</div>
                    </div>
                    <div className="p-4 text-center bg-gray-50/50">
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Saldo do Mês</div>
                        <div className={`text-xl font-bold ${periodBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            R$ {periodBalance.toFixed(2)}
                        </div>
                    </div>
               </div>
           </div>
       </div>

      {/* Internal Search */}
      <div className="bg-white px-4 py-2 border border-gray-200 rounded-lg shadow-sm flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por descrição neste mês..."
            className="w-full pl-10 pr-4 py-2 bg-transparent border-none outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="h-6 w-px bg-gray-200"></div>
        <select 
            className="bg-transparent text-sm text-gray-600 outline-none"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">Todos os tipos</option>
            <option value={TransactionType.CREDIT}>Receitas</option>
            <option value={TransactionType.DEBIT}>Despesas</option>
          </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Lançamentos Detalhados</h3>
            <span className="text-xs bg-white border border-gray-200 px-2 py-1 rounded text-gray-500">
                {filteredTransactions.length} registros
            </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
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
            <tbody className="divide-y divide-gray-100">
              {filteredTransactions.length === 0 ? (
                  <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                          Nenhum lançamento encontrado neste período
                      </td>
                  </tr>
              ) : (
                  filteredTransactions.map((t) => {
                    const category = categories.find(c => c.id === t.categoryId);
                    const bank = banks.find(b => b.id === t.bankId);
                    
                    return (
                      <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-gray-500 font-mono">
                            {new Date(t.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">{t.description}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!category ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-gray-100 text-gray-800'}`}>
                            {category?.name || 'Sem Categoria'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 flex items-center gap-2">
                            {bank && <img src={bank.logo} className="w-5 h-5 rounded-full object-contain"/>}
                            {bank?.name}
                        </td>
                        <td className={`px-6 py-4 text-right font-medium ${t.type === TransactionType.CREDIT ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.type === TransactionType.DEBIT ? '- ' : '+ '}
                          R$ {t.value.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {t.reconciled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium">
                              <Check size={12} /> Conciliado
                            </span>
                          ) : (
                            <button 
                                onClick={() => onReconcile(t.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors"
                            >
                              Pendente
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleEditClick(t)}
                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => onDeleteTransaction(t.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">{editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Tipo</label>
                    <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value as TransactionType})}
                    >
                        <option value={TransactionType.DEBIT}>Despesa (-)</option>
                        <option value={TransactionType.CREDIT}>Receita (+)</option>
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Data</label>
                    <input 
                        type="date" 
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Descrição</label>
                <input 
                    type="text" 
                    required
                    placeholder="Ex: Supermercado"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Valor (R$)</label>
                <input 
                    type="number" 
                    required
                    step="0.01"
                    placeholder="0,00"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-mono font-bold ${
                        formData.type === TransactionType.DEBIT ? 'text-red-600' : 'text-emerald-600'
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
                    <label className="text-sm font-medium text-gray-700">Banco</label>
                    <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                        value={formData.bankId}
                        onChange={e => setFormData({...formData, bankId: Number(e.target.value)})}
                    >
                        {banks.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Categoria</label>
                    <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
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
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm shadow-blue-200"
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