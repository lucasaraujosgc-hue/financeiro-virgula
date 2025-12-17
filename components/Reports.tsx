import React from 'react';
import { Transaction, Category, TransactionType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface ReportsProps {
  transactions: Transaction[];
  categories: Category[];
}

// Updated Colors for Dark Theme (Neon/Vibrant)
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];

const Reports: React.FC<ReportsProps> = ({ transactions, categories }) => {
  
  // Prepare data for Pie Chart (Expenses by Category)
  const expensesByCategory = categories
    .filter(c => c.type === 'despesa')
    .map(cat => {
      const total = transactions
        .filter(t => t.categoryId === cat.id && t.type === TransactionType.DEBIT)
        .reduce((sum, t) => sum + t.value, 0);
      return { name: cat.name, value: total };
    })
    .filter(item => item.value > 0);

  const monthlyData = [
    { name: 'Jan', Receita: 4000, Despesa: 2400 },
    { name: 'Fev', Receita: 3000, Despesa: 1398 },
    { name: 'Mar', Receita: 2000, Despesa: 9800 },
    { name: 'Abr', Receita: 2780, Despesa: 3908 },
    { name: 'Mai', Receita: 1890, Despesa: 4800 },
    { name: 'Jun', Receita: 2390, Despesa: 3800 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Relatórios</h1>
        <p className="text-slate-400">Análise detalhada das suas finanças</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses Pie Chart */}
        <div className="bg-surface p-6 rounded-xl border border-slate-800 shadow-sm">
          <h3 className="font-semibold text-slate-200 mb-6">Despesas por Categoria</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', color: '#f8fafc'}}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Income vs Expense Bar Chart */}
        <div className="bg-surface p-6 rounded-xl border border-slate-800 shadow-sm">
          <h3 className="font-semibold text-slate-200 mb-6">Receitas vs Despesas (Semestral)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <Tooltip 
                    contentStyle={{backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', color: '#f8fafc'}}
                    cursor={{fill: '#1e293b'}} 
                />
                <Legend iconType="circle" />
                <Bar dataKey="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* DRE Simplificado Table */}
      <div className="bg-surface rounded-xl border border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/30">
            <h3 className="font-semibold text-slate-200">DRE Simplificado (Mês Atual)</h3>
        </div>
        <div className="p-6">
            <table className="w-full text-sm">
                <tbody>
                    <tr className="border-b border-slate-800">
                        <td className="py-2 text-slate-400">Receita Bruta</td>
                        <td className="py-2 text-right font-medium text-emerald-500">R$ 15.000,00</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                        <td className="py-2 text-slate-400 pl-4">(-) Impostos</td>
                        <td className="py-2 text-right text-rose-500">R$ 1.500,00</td>
                    </tr>
                    <tr className="border-b border-slate-800 bg-slate-900/50">
                        <td className="py-2 font-semibold text-slate-200">(=) Receita Líquida</td>
                        <td className="py-2 text-right font-bold text-slate-200">R$ 13.500,00</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                        <td className="py-2 text-slate-400">(-) Despesas Operacionais</td>
                        <td className="py-2 text-right text-rose-500">R$ 5.000,00</td>
                    </tr>
                    <tr className="bg-sky-900/10">
                        <td className="py-3 font-bold text-white">(=) Resultado Líquido</td>
                        <td className="py-3 text-right font-bold text-sky-400">R$ 8.500,00</td>
                    </tr>
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;