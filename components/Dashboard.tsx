import React, { useState } from 'react';
import { Transaction, TransactionType, Bank, Forecast, Category, CategoryType } from '../types';
import { ArrowUpCircle, ArrowDownCircle, Wallet, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, Plus, Minus, X, ThumbsUp, ThumbsDown, Repeat, CalendarDays, AlertTriangle, CalendarClock, Check, Trash2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  userId: number;
  transactions: Transaction[];
  banks: Bank[];
  forecasts: Forecast[];
  categories: Category[];
  onRefresh: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ userId, transactions, banks, forecasts, categories, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false);
  const [formData, setFormData] = useState({
      description: '',
      value: '',
      type: TransactionType.DEBIT,
      date: new Date().toISOString().split('T')[0],
      categoryId: 0,
      bankId: 0,
      installments: 1,
      isFixed: false
  });

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);

  const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const getHeaders = () => ({
      'Content-Type': 'application/json',
      'user-id': String(userId)
  });

  // Calculate Overdue Forecasts (Before current month start, not realized)
  const overdueForecasts = forecasts.filter(f => {
      const fDate = new Date(f.date);
      // Ajuste para garantir comparação correta ignorando horas (apenas datas)
      const fDateMidnight = new Date(fDate.getFullYear(), fDate.getMonth(), fDate.getDate());
      return fDateMidnight < startOfCurrentMonth && !f.realized;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const overdueIncome = overdueForecasts.filter(f => f.type === TransactionType.CREDIT).reduce((acc, curr) => acc + curr.value, 0);
  const overdueExpense = overdueForecasts.filter(f => f.type === TransactionType.DEBIT).reduce((acc, curr) => acc + curr.value, 0);

  // Initialize form when opening modal
  const openModal = (type: TransactionType) => {
      setFormData({
          description: '',
          value: '',
          type: type,
          date: new Date().toISOString().split('T')[0],
          categoryId: 0,
          bankId: banks[0]?.id || 0,
          installments: 1,
          isFixed: false
      });
      setIsModalOpen(true);
  };

  const handleRealizeForecast = async (forecast: Forecast) => {
      if(!confirm('Confirmar realização desta previsão pendente?')) return;

      try {
        // 1. Mark as realized
        await fetch(`/api/forecasts/${forecast.id}/realize`, { 
            method: 'PATCH',
            headers: getHeaders()
        });
        
        // 2. Create transaction
        const descSuffix = forecast.installmentTotal 
            ? ` (${forecast.installmentCurrent}/${forecast.installmentTotal})` 
            : (forecast.groupId ? ' (Recorrente Atrasado)' : ' (Atrasado)');

        await fetch('/api/transactions', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                date: forecast.date, // Mantém a data original ou poderia ser new Date().toISOString() se quisesse data atual
                description: forecast.description + descSuffix,
                value: forecast.value,
                type: forecast.type,
                categoryId: forecast.categoryId,
                bankId: forecast.bankId,
                reconciled: false
            })
        });

        onRefresh();
        // Se não houver mais atrasados, fecha o modal
        if (overdueForecasts.length <= 1) setIsOverdueModalOpen(false);

      } catch (error) {
          alert("Erro ao efetivar previsão.");
      }
  };

  const handleDeleteForecast = async (id: number) => {
      if(!confirm('Excluir esta previsão pendente?')) return;
      try {
          await fetch(`/api/forecasts/${id}`, { 
            method: 'DELETE',
            headers: getHeaders()
          });
          onRefresh();
          if (overdueForecasts.length <= 1) setIsOverdueModalOpen(false);
      } catch (e) {
          alert("Erro ao excluir.");
      }
  };

  const handleQuickSave = async (target: 'forecast' | 'transaction') => {
      if (!formData.description || !formData.value || !formData.bankId) {
          alert("Preencha todos os campos obrigatórios");
          return;
      }
      
      const value = Math.abs(Number(formData.value));
      const groupId = Date.now().toString();
      const baseDate = new Date(formData.date);
      
      const installments = formData.isFixed ? 60 : Math.max(1, Math.floor(Number(formData.installments)));

      try {
          for (let i = 0; i < installments; i++) {
              const currentDate = new Date(baseDate);
              currentDate.setMonth(baseDate.getMonth() + i);
              const dateStr = currentDate.toISOString().split('T')[0];
              
              const isRecurrent = installments > 1 || formData.isFixed;
              const currentInstallment = i + 1;
              
              if (target === 'transaction' && i === 0) {
                  const descSuffix = isRecurrent 
                    ? (formData.isFixed ? ' (Fixo)' : ` (${currentInstallment}/${installments})`)
                    : '';

                  await fetch('/api/transactions', {
                       method: 'POST',
                       headers: getHeaders(),
                       body: JSON.stringify({
                           date: dateStr,
                           description: formData.description + descSuffix,
                           value: value,
                           type: formData.type,
                           categoryId: Number(formData.categoryId),
                           bankId: Number(formData.bankId),
                           reconciled: false
                       })
                   });
              } else {
                  const payload = {
                      date: dateStr,
                      description: formData.description,
                      value: value,
                      type: formData.type,
                      categoryId: Number(formData.categoryId),
                      bankId: Number(formData.bankId),
                      installmentCurrent: currentInstallment,
                      installmentTotal: formData.isFixed ? 0 : installments,
                      groupId: isRecurrent ? groupId : null,
                      realized: false
                  };

                   await fetch('/api/forecasts', {
                      method: 'POST',
                      headers: getHeaders(),
                      body: JSON.stringify(payload)
                  });
              }
          }

          if (target === 'forecast') {
             alert("Previsões geradas com sucesso!");
          } else {
             alert(installments > 1 
                ? "1º lançamento efetivado e parcelas futuras agendadas!" 
                : "Lançamento efetivado com sucesso!");
          }

          setIsModalOpen(false);
          onRefresh();
      } catch (error) {
          alert("Erro ao salvar");
          console.error(error);
      }
  };

  const availableCategories = categories.filter(c => 
    formData.type === TransactionType.CREDIT 
      ? c.type === CategoryType.INCOME 
      : c.type === CategoryType.EXPENSE
  );

  const allTimeIncome = transactions
    .filter(t => t.type === TransactionType.CREDIT)
    .reduce((acc, curr) => acc + curr.value, 0);

  const allTimeExpense = transactions
    .filter(t => t.type === TransactionType.DEBIT)
    .reduce((acc, curr) => acc + curr.value, 0);

  const totalBalance = allTimeIncome - allTimeExpense;

  const currentMonthTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthRealizedIncome = currentMonthTransactions
    .filter(t => t.type === TransactionType.CREDIT)
    .reduce((acc, curr) => acc + curr.value, 0);

  const monthRealizedExpense = currentMonthTransactions
    .filter(t => t.type === TransactionType.DEBIT)
    .reduce((acc, curr) => acc + curr.value, 0);

  const currentMonthForecasts = forecasts.filter(f => {
      const d = new Date(f.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && !f.realized;
  });

  const monthForecastIncome = currentMonthForecasts
    .filter(f => f.type === TransactionType.CREDIT)
    .reduce((acc, curr) => acc + curr.value, 0);

  const monthForecastExpense = currentMonthForecasts
    .filter(f => f.type === TransactionType.DEBIT)
    .reduce((acc, curr) => acc + curr.value, 0);

  const reconciledCount = transactions.filter(t => t.reconciled).length;
  const pendingCount = transactions.filter(t => !t.reconciled).length;

  const chartData = transactions.slice(0, 15).reverse().map(t => ({
    name: t.date.split('-').slice(1).join('/'),
    amount: t.type === TransactionType.CREDIT ? t.value : -t.value,
    balance: 0 
  }));

  let runningBalance = totalBalance - (chartData.reduce((acc, curr) => acc + curr.amount, 0)); 
  const processedChartData = chartData.map(d => {
    runningBalance += d.amount;
    return { ...d, balance: runningBalance };
  });

  return (
    <div className="space-y-6">
      
      {/* Overdue Alert Banner */}
      {overdueForecasts.length > 0 && (
          <div 
            onClick={() => setIsOverdueModalOpen(true)}
            className="bg-amber-950/40 border border-amber-500/30 p-4 rounded-xl cursor-pointer hover:bg-amber-900/40 transition-all group animate-in fade-in slide-in-from-top-4"
          >
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30 group-hover:scale-110 transition-transform">
                          <AlertTriangle size={20} />
                      </div>
                      <div>
                          <h3 className="font-bold text-amber-400">Pendências de Meses Anteriores</h3>
                          <p className="text-sm text-amber-200/70">
                              Você possui <strong className="text-amber-100">{overdueForecasts.length} previsões</strong> não realizadas.
                          </p>
                      </div>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                      <div className="hidden md:block">
                          <p className="text-xs text-amber-200/70 uppercase">Receitas Pendentes</p>
                          <p className="font-bold text-emerald-400">R$ {overdueIncome.toFixed(2)}</p>
                      </div>
                      <div className="hidden md:block">
                          <p className="text-xs text-amber-200/70 uppercase">Despesas Pendentes</p>
                          <p className="font-bold text-rose-400">R$ {overdueExpense.toFixed(2)}</p>
                      </div>
                      <div className="bg-amber-500 text-slate-900 px-3 py-1 rounded-lg text-xs font-bold shadow-lg shadow-amber-900/20 group-hover:bg-amber-400 transition-colors">
                          Resolver
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="flex justify-between items-end">
        <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 font-medium">{MONTHS[currentMonth]} de {currentYear}</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => openModal(TransactionType.CREDIT)}
                className="w-10 h-10 rounded-full bg-primary hover:bg-primaryHover text-slate-900 flex items-center justify-center shadow-lg shadow-emerald-900/50 transition-all hover:scale-105"
                title="Nova Receita"
            >
                <Plus size={24} />
            </button>
            <button 
                onClick={() => openModal(TransactionType.DEBIT)}
                className="w-10 h-10 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-900/50 transition-all hover:scale-105"
                title="Nova Despesa"
            >
                <Minus size={24} />
            </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card Saldo */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-white shadow-lg border border-slate-700 flex flex-col justify-between h-32">
          <div>
            <div className="flex justify-between items-start mb-2">
                <div className="p-1.5 bg-slate-700/50 rounded-lg">
                   <Wallet className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold bg-slate-700/50 px-2 py-0.5 rounded-full text-slate-300">Saldo Atual</span>
            </div>
            <div className="text-2xl font-bold mb-0.5 text-white">
                R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-slate-400 text-xs">Apenas lançamentos efetivados</div>
        </div>

        {/* Card Receitas */}
        <div className="bg-surface rounded-xl p-4 border border-slate-800 shadow-sm flex flex-col justify-between h-32">
          <div>
            <div className="flex justify-between items-start mb-1">
                <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                   <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Receitas</span>
            </div>
            <div className="text-xl font-bold text-slate-100">
                R$ {monthRealizedIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
             <span className="text-slate-500 flex items-center gap-1"><TrendingUp size={12}/> Previsto:</span>
             <span className="font-bold text-emerald-500">+ {monthForecastIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Card Despesas */}
        <div className="bg-surface rounded-xl p-4 border border-slate-800 shadow-sm flex flex-col justify-between h-32">
          <div>
            <div className="flex justify-between items-start mb-1">
                <div className="p-1.5 bg-rose-500/10 rounded-lg">
                   <ArrowDownCircle className="w-4 h-4 text-rose-500" />
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">Despesas</span>
            </div>
            <div className="text-xl font-bold text-slate-100">
                R$ {monthRealizedExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
             <span className="text-slate-500 flex items-center gap-1"><TrendingDown size={12}/> Previsto:</span>
             <span className="font-bold text-rose-500">+ {monthForecastExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Bank Balances */}
        <div className="lg:col-span-2 bg-surface p-6 rounded-xl border border-slate-800 shadow-sm">
             <h3 className="font-semibold text-slate-200 mb-6">Saldos por Banco</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {banks.map(bank => (
                    <div key={bank.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white p-1.5 flex items-center justify-center overflow-hidden">
                                <img src={bank.logo} alt={bank.name} className="max-w-full max-h-full object-contain" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-200 text-sm">{bank.name}</h4>
                                <p className="text-xs text-slate-500 max-w-[120px] truncate" title={bank.nickname}>{bank.nickname || 'Conta Corrente'}</p>
                            </div>
                        </div>
                        <span className={`font-bold ${bank.balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            R$ {bank.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                ))}
             </div>
        </div>

        {/* Column 2: Chart & Status */}
        <div className="space-y-6">
             {/* Small Chart */}
             <div className="bg-surface p-6 rounded-xl border border-slate-800 shadow-sm">
                <h3 className="font-semibold text-slate-200 mb-4 text-sm">Evolução do Saldo</h3>
                <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={processedChartData}>
                        <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                        <XAxis hide dataKey="name" />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip 
                            contentStyle={{backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', color: '#f8fafc', fontSize: '12px'}}
                            itemStyle={{color: '#10b981'}}
                        />
                        <Area 
                        type="monotone" 
                        dataKey="balance" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorBalance)" 
                        />
                    </AreaChart>
                    </ResponsiveContainer>
                </div>
             </div>

             {/* Status */}
             <div className="bg-surface p-6 rounded-xl border border-slate-800 shadow-sm">
                <h3 className="font-semibold text-slate-200 mb-4 text-sm">Status Geral</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/10">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-medium text-emerald-100">Conciliados</span>
                        </div>
                        <span className="font-bold text-white">{reconciledCount}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg border border-amber-500/10">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-medium text-amber-100">Pendentes</span>
                        </div>
                        <span className="font-bold text-white">{pendingCount}</span>
                    </div>
                </div>
             </div>
        </div>
      </div>

       {/* Overdue Items Modal */}
       {isOverdueModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsOverdueModalOpen(false)} />
            <div className="relative bg-surface border border-amber-500/30 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-amber-500/20 bg-amber-950/30 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                            <CalendarClock size={20}/>
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Pendências Anteriores</h3>
                            <p className="text-xs text-amber-200/70">Itens previstos até o mês passado não realizados</p>
                        </div>
                    </div>
                    <button onClick={() => setIsOverdueModalOpen(false)}><X size={20} className="text-slate-400 hover:text-white"/></button>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[60vh] custom-scroll">
                    <table className="w-full text-sm text-left">
                        <thead className="text-slate-400 font-medium border-b border-slate-800">
                            <tr>
                                <th className="pb-3 pl-2">Data</th>
                                <th className="pb-3">Descrição</th>
                                <th className="pb-3 text-right">Valor</th>
                                <th className="pb-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {overdueForecasts.map(f => (
                                <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="py-3 pl-2 text-amber-400 font-mono text-xs">
                                        {new Date(f.date).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="py-3 font-medium text-slate-200">
                                        {f.description}
                                        {f.installmentTotal ? (
                                            <span className="ml-2 text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                                                {f.installmentCurrent}/{f.installmentTotal}
                                            </span>
                                        ) : null}
                                    </td>
                                    <td className={`py-3 text-right font-bold ${f.type === TransactionType.DEBIT ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        R$ {f.value.toFixed(2)}
                                    </td>
                                    <td className="py-3 flex justify-center gap-2">
                                        <button 
                                            onClick={() => handleRealizeForecast(f)}
                                            className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded hover:bg-emerald-500/20 border border-emerald-500/20"
                                            title="Efetivar Lançamento"
                                        >
                                            <Check size={16}/>
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteForecast(f.id)}
                                            className="p-1.5 bg-rose-500/10 text-rose-500 rounded hover:bg-rose-500/20 border border-rose-500/20"
                                            title="Excluir Previsão"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-slate-950/50 border-t border-slate-800 text-center">
                    <p className="text-xs text-slate-500">
                        Total Pendente: <span className="text-emerald-500">R$ {overdueIncome.toFixed(2)}</span> (Rec) - <span className="text-rose-500">R$ {overdueExpense.toFixed(2)}</span> (Desp)
                    </p>
                </div>
            </div>
         </div>
       )}

       {/* Quick Add Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-surface border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 text-slate-200">
            <div className={`px-6 py-4 border-b border-slate-800 flex justify-between items-center ${formData.type === TransactionType.CREDIT ? 'bg-emerald-950/30' : 'bg-rose-950/30'}`}>
              <h3 className={`font-bold ${formData.type === TransactionType.CREDIT ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formData.type === TransactionType.CREDIT ? 'Nova Receita' : 'Nova Despesa'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-200"/></button>
            </div>
            
            <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                     <div>
                         <label className="text-sm text-slate-400 font-medium">Data</label>
                         <input 
                            type="date"
                            className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-primary"
                            value={formData.date}
                            onChange={e => setFormData({...formData, date: e.target.value})}
                         />
                     </div>
                     <div>
                         <label className="text-sm text-slate-400 font-medium">Valor</label>
                         <input 
                            type="number" step="0.01" required
                            className={`w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 font-bold outline-none focus:border-primary ${formData.type === TransactionType.CREDIT ? 'text-emerald-500' : 'text-rose-500'}`}
                            value={formData.value}
                            onChange={e => setFormData({...formData, value: e.target.value})}
                         />
                     </div>
                </div>
                <div>
                     <label className="text-sm text-slate-400 font-medium">Descrição</label>
                     <input 
                        type="text" required
                        className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-primary"
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                     />
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div>
                         <label className="text-sm text-slate-400 font-medium">Banco</label>
                         <select 
                            className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-primary"
                            value={formData.bankId}
                            onChange={e => setFormData({...formData, bankId: Number(e.target.value)})}
                         >
                             {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                         </select>
                     </div>
                     <div>
                         <label className="text-sm text-slate-400 font-medium">Categoria</label>
                         <select 
                            className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-primary"
                            value={formData.categoryId}
                            onChange={e => setFormData({...formData, categoryId: Number(e.target.value)})}
                         >
                            <option value={0}>Selecione...</option>
                             {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </select>
                     </div>
                </div>

                {/* Recurrence Options */}
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <label className="text-xs font-semibold text-slate-500 mb-2 block flex items-center gap-2">
                        <Repeat size={12}/> RECORRÊNCIA (OPCIONAL)
                    </label>
                    
                    <div className="flex items-center gap-4 mb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox"
                                checked={formData.isFixed}
                                onChange={e => setFormData({...formData, isFixed: e.target.checked})}
                                className="w-4 h-4 text-primary rounded border-slate-700 bg-slate-800"
                            />
                            <span className="text-sm text-slate-300">Fixo Mensal</span>
                        </label>
                    </div>

                    {!formData.isFixed && (
                            <div className="flex items-center gap-2">
                            <CalendarDays className="text-slate-500" size={16}/>
                            <input 
                                type="number" min="1" max="360"
                                className="w-16 bg-slate-950 border border-slate-700 rounded p-1 text-center text-sm text-white"
                                value={formData.installments}
                                onChange={e => setFormData({...formData, installments: Number(e.target.value)})}
                            />
                            <span className="text-sm text-slate-400">parcelas</span>
                        </div>
                    )}
                </div>

                <div className="pt-2 flex gap-3">
                    <button 
                        type="button"
                        onClick={() => handleQuickSave('forecast')}
                        className="flex-1 flex flex-col items-center justify-center gap-1 py-3 border border-slate-700 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
                    >
                        <ThumbsDown size={20} className="text-slate-500" />
                        <span className="text-xs font-semibold">Previsão (Futuro)</span>
                    </button>

                    <button 
                        type="button"
                        onClick={() => handleQuickSave('transaction')}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-slate-900 rounded-lg shadow-sm transition-colors ${
                            formData.type === TransactionType.CREDIT ? 'bg-primary hover:bg-primaryHover' : 'bg-rose-600 hover:bg-rose-700'
                        }`}
                    >
                        <ThumbsUp size={20} />
                        <span className="text-xs font-semibold">
                            {formData.installments > 1 || formData.isFixed ? 'Lançar 1ª + Previsões' : 'Lançamento (Hoje)'}
                        </span>
                    </button>
                </div>
            </div>
          </div>
        </div>
       )}
    </div>
  );
};

export default Dashboard;