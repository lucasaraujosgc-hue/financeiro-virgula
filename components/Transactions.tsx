import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, Bank, Category, CategoryType } from '../types';
import { Search, Filter, Plus, Trash2, Check, X, FileDown } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Transaction Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    value: '',
    type: TransactionType.DEBIT,
    bankId: banks[0]?.id || 0,
    categoryId: 0, // Will set default in useEffect
  });

  // Set default category when modal opens or type changes
  useEffect(() => {
    if (isModalOpen) {
      const availableCategories = categories.filter(c => 
        formData.type === TransactionType.CREDIT 
          ? c.type === CategoryType.INCOME 
          : c.type === CategoryType.EXPENSE
      );
      
      // If current category doesn't match the type, switch to the first available one
      const currentCat = categories.find(c => c.id === formData.categoryId);
      if (!currentCat || (formData.type === TransactionType.CREDIT && currentCat.type !== CategoryType.INCOME) || (formData.type === TransactionType.DEBIT && currentCat.type !== CategoryType.EXPENSE)) {
         setFormData(prev => ({ ...prev, categoryId: availableCategories[0]?.id || 0 }));
      }
    }
  }, [formData.type, isModalOpen, categories]);

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddTransaction({
      date: formData.date,
      description: formData.description,
      // Save absolute value, type determines the sign in logic
      value: Math.abs(Number(formData.value)), 
      type: formData.type,
      bankId: Number(formData.bankId),
      categoryId: Number(formData.categoryId),
      summary: '',
      reconciled: false
    });
    setIsModalOpen(false);
    setFormData({ ...formData, description: '', value: '' });
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const numVal = parseFloat(val);
    
    // Auto-detect type based on sign
    let newType = formData.type;
    if (!isNaN(numVal)) {
        if (numVal < 0) newType = TransactionType.DEBIT;
        if (numVal > 0) newType = TransactionType.CREDIT;
    }

    setFormData(prev => ({
        ...prev,
        value: val,
        type: newType
    }));
  };

  const availableCategories = categories.filter(c => 
    formData.type === TransactionType.CREDIT 
      ? c.type === CategoryType.INCOME 
      : c.type === CategoryType.EXPENSE
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lançamentos</h1>
          <p className="text-gray-500">Gerencie todas as suas entradas e saídas</p>
        </div>
        <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors">
                <FileDown size={18} />
                Importar OFX
            </button>
            <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm shadow-blue-200"
            >
            <Plus size={18} />
            Novo Lançamento
            </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por descrição..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="px-4 py-2 bg-gray-50 border-transparent rounded-lg focus:bg-white focus:border-blue-500 outline-none cursor-pointer"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">Todos os tipos</option>
            <option value={TransactionType.CREDIT}>Receitas</option>
            <option value={TransactionType.DEBIT}>Despesas</option>
          </select>
          <button className="p-2 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100">
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
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
                          Nenhum lançamento encontrado
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
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {category?.name || 'Geral'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{bank?.name}</td>
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
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => onDeleteTransaction(t.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">Novo Lançamento</h3>
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
                    placeholder="0,00 (use negativo para despesa)"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-mono font-bold ${
                        formData.type === TransactionType.DEBIT ? 'text-red-600' : 'text-emerald-600'
                    }`}
                    value={formData.value}
                    onChange={handleValueChange}
                />
                <p className="text-xs text-gray-500">
                    Dica: Digite um valor negativo (-) para identificar automaticamente como despesa.
                </p>
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
                    Salvar
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