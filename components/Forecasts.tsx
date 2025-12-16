import React, { useState, useEffect } from 'react';
import { Bank, Category, Forecast, TransactionType, CategoryType } from '../types';
import { ChevronLeft, ChevronRight, Plus, Check, Trash2, CalendarDays, Edit2, Repeat, Infinity, X } from 'lucide-react';

interface ForecastsProps {
  banks: Bank[];
  categories: Category[];
}

const Forecasts: React.FC<ForecastsProps> = ({ banks, categories }) => {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedBankId, setSelectedBankId] = useState<number | 'all'>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });

  // Form State
  const [formData, setFormData] = useState({
      description: '',
      value: '',
      type: TransactionType.DEBIT,
      date: new Date().toISOString().split('T')[0],
      categoryId: 0,
      bankId: banks[0]?.id || 0,
      installments: 1,
      isFixed: false
  });

  const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  useEffect(() => {
    fetchForecasts();
  }, []);

  const fetchForecasts = async () => {
    try {
        const res = await fetch('/api/forecasts');
        if (res.ok) setForecasts(await res.json());
    } catch (e) {
        console.error(e);
    }
  };

  const handleEditClick = (f: Forecast) => {
      setEditingId(f.id);
      setFormData({
          description: f.description,
          value: String(f.value),
          type: f.type,
          date: f.date,
          categoryId: f.categoryId,
          bankId: f.bankId,
          installments: 1, // Reset installments for edit simple mode (usually we block editing recurrence structure)
          isFixed: false
      });
      setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Math.abs(Number(formData.value));
    
    if (editingId) {
        // Edit Mode (Simple Update)
         await fetch(`/api/forecasts/${editingId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                date: formData.date,
                description: formData.description,
                value: value,
                type: formData.type,
                categoryId: Number(formData.categoryId),
                bankId: Number(formData.bankId)
            })
        });
    } else {
        // Create Mode
        const groupId = Date.now().toString(); 
        const baseDate = new Date(formData.date);
        
        // If Fixed, generate for 5 years (60 months) to simulate "Infinite"
        const installments = formData.isFixed ? 60 : Math.max(1, Math.floor(Number(formData.installments)));

        for (let i = 0; i < installments; i++) {
            const currentDate = new Date(baseDate);
            currentDate.setMonth(baseDate.getMonth() + i);
            
            const payload = {
                date: currentDate.toISOString().split('T')[0],
                description: formData.description,
                value: value,
                type: formData.type,
                categoryId: Number(formData.categoryId),
                bankId: Number(formData.bankId),
                installmentCurrent: formData.isFixed ? i + 1 : i + 1,
                installmentTotal: formData.isFixed ? 0 : installments, // 0 indicates fixed/infinite visually
                groupId: (installments > 1 || formData.isFixed) ? groupId : null
            };

            await fetch('/api/forecasts', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
        }
    }

    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ ...formData, description: '', value: '', installments: 1, isFixed: false });
    fetchForecasts();
  };

  const handleDeleteClick = (id: number) => {
      setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async (mode: 'single' | 'all' | 'future') => {
      if (!deleteModal.id) return;
      
      await fetch(`/api/forecasts/${deleteModal.id}?mode=${mode}`, { method: 'DELETE' });
      setDeleteModal({ isOpen: false, id: null });
      fetchForecasts();
  };

  const handleRealize = async (id: number) => {
      if(confirm('Confirmar realização desta previsão? Ela será movida para Lançamentos.')) {
           // Mark as realized in Forecast
           await fetch(`/api/forecasts/${id}/realize`, { method: 'PATCH' });
           
           // Create actual transaction
           const forecast = forecasts.find(f => f.id === id);
           if (forecast) {
               const descSuffix = forecast.installmentTotal 
                  ? ` (${forecast.installmentCurrent}/${forecast.installmentTotal})` 
                  : (forecast.groupId ? ' (Recorrente)' : '');

               await fetch('/api/transactions', {
                   method: 'POST',
                   headers: {'Content-Type': 'application/json'},
                   body: JSON.stringify({
                       date: forecast.date,
                       description: forecast.description + descSuffix,
                       value: forecast.value,
                       type: forecast.type,
                       categoryId: forecast.categoryId,
                       bankId: forecast.bankId,
                       reconciled: false
                   })
               });
           }
           fetchForecasts();
      }
  };

  // Filter Logic
  const filteredForecasts = forecasts.filter(f => {
      // Adjust for timezone issues with simple date strings by forcing UTC components if needed, or simple split
      const [y, m] = f.date.split('-'); 
      const yearMatch = parseInt(y) === selectedYear;
      const monthMatch = (parseInt(m) - 1) === selectedMonth;
      const bankMatch = selectedBankId === 'all' || f.bankId === selectedBankId;
      return yearMatch && monthMatch && bankMatch;
  });

  const totalIncome = filteredForecasts.filter(f => f.type === TransactionType.CREDIT).reduce((a, b) => a + b.value, 0);
  const totalExpense = filteredForecasts.filter(f => f.type === TransactionType.DEBIT).reduce((a, b) => a + b.value, 0);
  const projectedBalance = totalIncome - totalExpense;

  const availableCategories = categories.filter(c => 
    formData.type === TransactionType.CREDIT 
      ? c.type === CategoryType.INCOME 
      : c.type === CategoryType.EXPENSE
  );

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-2xl font-bold text-gray-900">
            Previsões Financeiras - {MONTHS[selectedMonth]}/{selectedYear}
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
               <Plus size={18}/> Nova Previsão
           </button>
       </div>

       {/* Month Navigation & Summary */}
       <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
           <div className="flex flex-col lg:flex-row">
               {/* Month Carousel */}
               <div className="lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-100 p-4 flex items-center justify-between">
                    <button onClick={() => setSelectedMonth(prev => prev === 0 ? 11 : prev - 1)} className="p-2 hover:bg-gray-100 rounded-full text-blue-600"><ChevronLeft/></button>
                    <div className="font-bold text-xl text-blue-700">{MONTHS[selectedMonth]}</div>
                    <button onClick={() => setSelectedMonth(prev => prev === 11 ? 0 : prev + 1)} className="p-2 hover:bg-gray-100 rounded-full text-blue-600"><ChevronRight/></button>
               </div>
               
               {/* Summary Cards */}
               <div className="flex-1 grid grid-cols-3 divide-x divide-gray-100">
                    <div className="p-4 text-center">
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Receitas Previstas</div>
                        <div className="text-xl font-bold text-emerald-600">R$ {totalIncome.toFixed(2)}</div>
                    </div>
                    <div className="p-4 text-center">
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Despesas Previstas</div>
                        <div className="text-xl font-bold text-rose-600">R$ {totalExpense.toFixed(2)}</div>
                    </div>
                    <div className="p-4 text-center bg-gray-50/50">
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Saldo Projetado</div>
                        <div className={`text-xl font-bold ${projectedBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            R$ {projectedBalance.toFixed(2)}
                        </div>
                    </div>
               </div>
           </div>
       </div>

       {/* Detailed List */}
       <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
           <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
               <h3 className="font-semibold text-gray-800">Previsões Detalhadas</h3>
               <span className="text-xs bg-white border border-gray-200 px-2 py-1 rounded text-gray-500">
                   {filteredForecasts.length} registros
               </span>
           </div>
           <table className="w-full text-sm text-left">
               <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                   <tr>
                       <th className="px-6 py-3">Banco</th>
                       <th className="px-6 py-3">Dia</th>
                       <th className="px-6 py-3">Descrição</th>
                       <th className="px-6 py-3 text-right">Valor</th>
                       <th className="px-6 py-3 text-center">Parcela</th>
                       <th className="px-6 py-3 text-center">Status</th>
                       <th className="px-6 py-3 text-center">Ações</th>
                   </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                   {filteredForecasts.length === 0 ? (
                       <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhuma previsão para este período.</td></tr>
                   ) : (
                       filteredForecasts.map(f => {
                           const bank = banks.find(b => b.id === f.bankId);
                           const day = f.date.split('-')[2];
                           const isFixed = f.installmentTotal === 0;
                           
                           return (
                               <tr key={f.id} className="hover:bg-gray-50">
                                   <td className="px-6 py-3">
                                       {bank && <img src={bank.logo} className="w-6 h-6 rounded object-contain" title={bank.name}/>}
                                   </td>
                                   <td className="px-6 py-3 text-gray-500">{day}/{selectedMonth+1}</td>
                                   <td className="px-6 py-3 font-medium text-gray-900">{f.description}</td>
                                   <td className={`px-6 py-3 text-right font-bold ${f.type === TransactionType.DEBIT ? 'text-rose-600' : 'text-emerald-600'}`}>
                                       {f.value.toFixed(2)}
                                   </td>
                                   <td className="px-6 py-3 text-center">
                                       {isFixed ? (
                                            <span className="flex items-center justify-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                <Infinity size={12}/> Fixo
                                            </span>
                                       ) : f.installmentTotal ? (
                                           <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-semibold">
                                               {f.installmentCurrent}/{f.installmentTotal}
                                           </span>
                                       ) : '-'}
                                   </td>
                                   <td className="px-6 py-3 text-center">
                                       {f.realized ? (
                                           <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">Realizado</span>
                                       ) : (
                                           <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold">Pendente</span>
                                       )}
                                   </td>
                                   <td className="px-6 py-3 text-center flex justify-center gap-2">
                                       {!f.realized && (
                                           <>
                                            <button onClick={() => handleRealize(f.id)} className="p-1.5 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200" title="Efetivar">
                                                <Check size={16}/>
                                            </button>
                                            <button onClick={() => handleEditClick(f)} className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200" title="Editar">
                                                <Edit2 size={16}/>
                                            </button>
                                           </>
                                       )}
                                       <button onClick={() => handleDeleteClick(f.id)} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200" title="Excluir">
                                           <Trash2 size={16}/>
                                       </button>
                                   </td>
                               </tr>
                           )
                       })
                   )}
               </tbody>
           </table>
       </div>

       {/* Edit/Create Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">{editingId ? 'Editar Previsão' : 'Nova Previsão'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-400"/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                     <div>
                         <label className="text-sm text-gray-700 font-medium">Tipo</label>
                         <select 
                            className="w-full mt-1 border border-gray-300 rounded-lg p-2"
                            value={formData.type}
                            onChange={e => setFormData({...formData, type: e.target.value as TransactionType})}
                         >
                             <option value={TransactionType.DEBIT}>Despesa</option>
                             <option value={TransactionType.CREDIT}>Receita</option>
                         </select>
                     </div>
                     <div>
                         <label className="text-sm text-gray-700 font-medium">Data Início</label>
                         <input 
                            type="date"
                            className="w-full mt-1 border border-gray-300 rounded-lg p-2"
                            value={formData.date}
                            onChange={e => setFormData({...formData, date: e.target.value})}
                         />
                     </div>
                </div>
                <div>
                     <label className="text-sm text-gray-700 font-medium">Descrição</label>
                     <input 
                        type="text" required
                        className="w-full mt-1 border border-gray-300 rounded-lg p-2"
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                     />
                </div>
                <div>
                     <label className="text-sm text-gray-700 font-medium">Valor</label>
                     <input 
                        type="number" step="0.01" required
                        className="w-full mt-1 border border-gray-300 rounded-lg p-2 font-bold"
                        value={formData.value}
                        onChange={e => setFormData({...formData, value: e.target.value})}
                     />
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div>
                         <label className="text-sm text-gray-700 font-medium">Banco</label>
                         <select 
                            className="w-full mt-1 border border-gray-300 rounded-lg p-2"
                            value={formData.bankId}
                            onChange={e => setFormData({...formData, bankId: Number(e.target.value)})}
                         >
                             {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                         </select>
                     </div>
                     <div>
                         <label className="text-sm text-gray-700 font-medium">Categoria</label>
                         <select 
                            className="w-full mt-1 border border-gray-300 rounded-lg p-2"
                            value={formData.categoryId}
                            onChange={e => setFormData({...formData, categoryId: Number(e.target.value)})}
                         >
                            <option value={0}>Selecione...</option>
                             {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </select>
                     </div>
                </div>
                
                {/* Recurrence Section - Only show on Create */}
                {!editingId && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <label className="text-sm font-semibold text-blue-800 mb-2 block flex items-center gap-2">
                            <Repeat size={14}/> Recorrência
                        </label>
                        
                        <div className="flex items-center gap-4 mb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={formData.isFixed}
                                    onChange={e => setFormData({...formData, isFixed: e.target.checked})}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="text-sm text-gray-700">Lançamento Fixo Mensal</span>
                            </label>
                        </div>

                        {!formData.isFixed && (
                             <div className="flex items-center gap-2">
                                <CalendarDays className="text-gray-400" size={20}/>
                                <input 
                                    type="number" min="1" max="360"
                                    className="w-20 border border-gray-300 rounded-lg p-1.5 text-center"
                                    value={formData.installments}
                                    onChange={e => setFormData({...formData, installments: Number(e.target.value)})}
                                />
                                <span className="text-sm text-gray-500">parcelas</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
                    <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
                </div>
            </form>
          </div>
        </div>
       )}

       {/* Delete Logic Modal */}
       {deleteModal.isOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteModal({ isOpen: false, id: null })} />
                <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in duration-200">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                        <Trash2 size={24}/>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Previsão</h3>
                    <p className="text-gray-500 mb-6 text-sm">Esta previsão parece fazer parte de uma recorrência. Como deseja excluir?</p>
                    
                    <div className="space-y-2">
                        <button onClick={() => confirmDelete('single')} className="w-full py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-sm">
                            Apenas esta previsão
                        </button>
                        <button onClick={() => confirmDelete('future')} className="w-full py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-sm">
                            Esta e as futuras
                        </button>
                        <button onClick={() => confirmDelete('all')} className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm shadow-sm">
                            Todas as ocorrências
                        </button>
                    </div>
                    <button onClick={() => setDeleteModal({ isOpen: false, id: null })} className="mt-4 text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                </div>
           </div>
       )}
    </div>
  );
};

export default Forecasts;