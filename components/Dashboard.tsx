import React from 'react';
import { Transaction, TransactionType, Bank } from '../types';
import { ArrowUpCircle, ArrowDownCircle, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  banks: Bank[];
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, banks }) => {
  // Calculate Totals
  const totalIncome = transactions
    .filter(t => t.type === TransactionType.CREDIT)
    .reduce((acc, curr) => acc + curr.value, 0);

  const totalExpense = transactions
    .filter(t => t.type === TransactionType.DEBIT)
    .reduce((acc, curr) => acc + curr.value, 0);

  const totalBalance = totalIncome - totalExpense;

  const reconciledCount = transactions.filter(t => t.reconciled).length;
  const pendingCount = transactions.filter(t => !t.reconciled).length;

  // Prepare Chart Data (Last 7 days simplified)
  const chartData = transactions.slice(0, 10).reverse().map(t => ({
    name: t.date.split('-').slice(1).join('/'),
    amount: t.type === TransactionType.CREDIT ? t.value : -t.value,
    balance: 0 // Would calculate cumulative in real app
  }));

  // Simple cumulative calculation for chart demo
  let runningBalance = 0;
  const processedChartData = chartData.map(d => {
    runningBalance += d.amount;
    return { ...d, balance: runningBalance };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Visão geral da sua saúde financeira</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg shadow-blue-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">Total Geral</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-blue-100 text-sm">Saldo Consolidado</div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <ArrowUpCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+ Entradas</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-gray-400 text-sm">Receitas do período</div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-rose-50 rounded-lg">
              <ArrowDownCircle className="w-6 h-6 text-rose-600" />
            </div>
            <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full">- Saídas</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-gray-400 text-sm">Despesas do período</div>
        </div>
      </div>

      {/* Chart & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-6">Fluxo de Caixa (Últimos dias)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={processedChartData}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
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

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <h3 className="font-semibold text-gray-800 mb-4">Status dos Lançamentos</h3>
          
          <div className="space-y-4 flex-1">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium text-gray-600">Conciliados</span>
              </div>
              <span className="font-bold text-gray-900">{reconciledCount}</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-medium text-gray-600">Pendentes</span>
              </div>
              <span className="font-bold text-gray-900">{pendingCount}</span>
            </div>

            <div className="mt-auto pt-4 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3">Saldos por Banco</h4>
                {banks.map(bank => (
                    <div key={bank.id} className="flex items-center justify-between mb-2 last:mb-0">
                        <div className="flex items-center gap-2">
                            <img src={bank.logo} alt={bank.name} className="w-5 h-5 rounded-full object-cover" />
                            <span className="text-sm text-gray-600">{bank.name}</span>
                        </div>
                        {/* Mocking individual balances roughly */}
                        <span className="text-sm font-medium text-gray-900">
                            R$ {(totalBalance / banks.length).toLocaleString('pt-BR', {maximumFractionDigits:0})}
                        </span>
                    </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;