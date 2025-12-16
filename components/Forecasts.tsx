import React, { useState, useEffect } from 'react';
import { Bank, Category, Forecast, TransactionType, CategoryType } from '../types';
import { ChevronLeft, ChevronRight, Plus, Check, Trash2, CalendarDays } from 'lucide-react';

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

  // Form State
  const [formData, setFormData] = useState({
      description: '',
      value: '',
      type: TransactionType.DEBIT,
      date: new Date().toISOString().split('T')[0],
      categoryId: 0,
      bankId: banks[0]?.id || 0,
      installments: 1
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const groupId = Date.now().toString(); // Simple ID for the group
    const baseDate = new Date(formData.date);
    const installments = Math.max(1, Math.floor(Number(formData.installments)));
    const value = Math.abs(Number(formData.value));

    // Generate installment records
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
            installmentCurrent: i + 1,
            installmentTotal: installments,
            groupId: installments > 1 ? groupId : null
        };

        await fetch('/api/forecasts', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
    }

    setIsModalOpen(false);
    fetchForecasts();
    setFormData({ ...formData, description: '', value: '', installments: 1 });
  };

  const handleDelete = async (id: number) => {
      if(confirm('Deseja excluir esta previsão?')) {
          await fetch(`/api/forecasts/${id}`, { method: 'DELETE' });
          setForecasts(prev => prev.filter(f => f.id !== id));
      }
  };

  const handleRealize = async (id: number) => {
      if(confirm('Confirmar realização desta previsão?')) {
           // Mark as realized in Forecast
           await fetch(`/api/forecasts/${id}/realize`, { method: 'PATCH' });
           
           // Create actual transaction
           const forecast = forecasts.find(f => f.id === id);
           if (forecast) {
               await fetch('/api/transactions', {
                   method: 'POST',
                   headers: {'Content-Type': 'application/json'},
                   body: JSON.stringify({
                       date: forecast.date,
                       description: forecast.description + (forecast.installmentTotal ? ` (${forecast.installmentCurrent}/${forecast.installmentTotal})` : ''),
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
      const d = new Date(f.date);
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
             onClick={() => setIsModalOpen(true)}
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
                                       {f.installmentTotal ? (
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
                                           <button onClick={() => handleRealize(f.id)} className="p-1.5 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200" title="Efetivar">
                                               <Check size={16}/>
                                           </button>
                                       )}
                                       <button onClick={() => handleDelete(f.id)} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200" title="Excluir">
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

       {/* Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Nova Previsão</h3>
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
                <div>
                     <label className="text-sm text-gray-700 font-medium block mb-1">Repetição (Parcelas/Meses)</label>
                     <div className="flex items-center gap-2">
                        <CalendarDays className="text-gray-400" size={20}/>
                        <input 
                            type="number" min="1" max="360"
                            className="w-20 border border-gray-300 rounded-lg p-2 text-center"
                            value={formData.installments}
                            onChange={e => setFormData({...formData, installments: Number(e.target.value)})}
                        />
                        <span className="text-sm text-gray-500">vezes (1 = único)</span>
                     </div>
                </div>
                <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
                    <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
                </div>
            </form>
          </div>
        </div>
       )}
    </div>
  );
};

export default Forecasts;