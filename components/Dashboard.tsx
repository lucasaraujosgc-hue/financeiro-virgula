import React from 'react';
import { Transaction, TransactionType, Bank, Forecast } from '../types';
import { ArrowUpCircle, ArrowDownCircle, Wallet, AlertCircle, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  banks: Bank[];
  forecasts: Forecast[];
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, banks, forecasts }) => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // 1. Calculate General Total Balance (All Time) - STRICTLY FROM TRANSACTIONS (Lançamentos)
  const allTimeIncome = transactions
    .filter(t => t.type === TransactionType.CREDIT)
    .reduce((acc, curr) => acc + curr.value, 0);

  const allTimeExpense = transactions
    .filter(t => t.type === TransactionType.DEBIT)
    .reduce((acc, curr) => acc + curr.value, 0);

  const totalBalance = allTimeIncome - allTimeExpense;

  // 2. Calculate Current Month Realized
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

  // 3. Calculate Current Month Forecast
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

  // Prepare Chart Data (Last 15 days for better visual)
  const chartData = transactions.slice(0, 15).reverse().map(t => ({
    name: t.date.split('-').slice(1).join('/'),
    amount: t.type === TransactionType.CREDIT ? t.value : -t.value,
    balance: 0 
  }));

  // Cumulative balance calculation for chart
  let runningBalance = totalBalance - (chartData.reduce((acc, curr) => acc + curr.amount, 0)); 
  const processedChartData = chartData.map(d => {
    runningBalance += d.amount;
    return { ...d, balance: runningBalance };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 font-medium">{MONTHS[currentMonth]} de {currentYear}</p>
      </div>

      {/* Cards de Resumo - Compact Version */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card Saldo */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 text-white shadow-lg shadow-blue-200 flex flex-col justify-between h-32">
          <div>
            <div className="flex justify-between items-start mb-2">
                <div className="p-1.5 bg-white/20 rounded-lg">
                   <Wallet className="w-4 h-4 text-white" />
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold bg-white/20 px-2 py-0.5 rounded-full">Saldo Atual</span>
            </div>
            <div className="text-2xl font-bold mb-0.5">
                R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-blue-100 text-xs">Apenas lançamentos efetivados</div>
        </div>

        {/* Card Receitas */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between h-32">
          <div>
            <div className="flex justify-between items-start mb-1">
                <div className="p-1.5 bg-emerald-50 rounded-lg">
                   <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Receitas</span>
            </div>
            <div className="text-xl font-bold text-gray-900">
                R$ {monthRealizedIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          
          <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-xs">
             <span className="text-gray-500 flex items-center gap-1"><TrendingUp size={12}/> Previsto:</span>
             <span className="font-bold text-emerald-600">+ {monthForecastIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Card Despesas */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between h-32">
          <div>
            <div className="flex justify-between items-start mb-1">
                <div className="p-1.5 bg-rose-50 rounded-lg">
                   <ArrowDownCircle className="w-4 h-4 text-rose-600" />
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">Despesas</span>
            </div>
            <div className="text-xl font-bold text-gray-900">
                R$ {monthRealizedExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-xs">
             <span className="text-gray-500 flex items-center gap-1"><TrendingDown size={12}/> Previsto:</span>
             <span className="font-bold text-rose-600">+ {monthForecastExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Saldos (Left Big) & Charts (Right Small) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1 (Big): Bank Balances */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
             <h3 className="font-semibold text-gray-800 mb-6">Saldos por Banco</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {banks.map(bank => (
                    <div key={bank.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white p-1.5 border border-gray-200 flex items-center justify-center">
                                <img src={bank.logo} alt={bank.name} className="max-w-full max-h-full object-contain" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm">{bank.name}</h4>
                                <p className="text-xs text-gray-500 max-w-[120px] truncate" title={bank.nickname}>{bank.nickname || 'Conta Corrente'}</p>
                            </div>
                        </div>
                        <span className={`font-bold ${bank.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            R$ {bank.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                ))}
             </div>
        </div>

        {/* Column 2 (Small): Chart & Status */}
        <div className="space-y-6">
             {/* Small Chart */}
             <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 text-sm">Evolução do Saldo</h3>
                <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={processedChartData}>
                        <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                        </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis hide dataKey="name" />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip 
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}}
                        />
                        <Area 
                        type="monotone" 
                        dataKey="balance" 
                        stroke="#0ea5e9" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorBalance)" 
                        />
                    </AreaChart>
                    </ResponsiveContainer>
                </div>
             </div>

             {/* Status */}
             <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 text-sm">Status Geral</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-medium text-gray-600">Conciliados</span>
                        </div>
                        <span className="font-bold text-gray-900">{reconciledCount}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-medium text-gray-600">Pendentes</span>
                        </div>
                        <span className="font-bold text-gray-900">{pendingCount}</span>
                    </div>
                </div>
             </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;