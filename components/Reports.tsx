import React, { useState, useEffect } from 'react';
import { Transaction, Category } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, Line } from 'recharts';
import { ChevronLeft, ChevronRight, Filter, Download, CalendarRange, Percent, Activity, TrendingUp } from 'lucide-react';

interface ReportsProps {
  transactions: Transaction[];
  categories: Category[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const Reports: React.FC<ReportsProps> = () => {
  const [activeTab, setActiveTab] = useState<'cashflow' | 'dre' | 'analysis'>('cashflow');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  // States for Daily Flow Chart (Cash Cycle)
  const [cycleData, setCycleData] = useState<any[]>([]);
  const [cycleStartDate, setCycleStartDate] = useState(() => {
      const date = new Date();
      date.setDate(1); // First day of current month
      return date.toISOString().split('T')[0];
  });
  const [cycleEndDate, setCycleEndDate] = useState(() => {
      const date = new Date();
      return date.toISOString().split('T')[0];
  });

  // Helper to fetch data based on active tab
  const fetchData = async () => {
      setLoading(true);
      setData(null); // Clear data immediately to avoid stale render crash
      const userId = localStorage.getItem('finance_app_auth') ? JSON.parse(localStorage.getItem('finance_app_auth')!).id : null;
      if (!userId) return;

      let endpoint = '';
      if (activeTab === 'cashflow') endpoint = `/api/reports/cash-flow?year=${year}&month=${month}`;
      if (activeTab === 'dre') endpoint = `/api/reports/dre?year=${year}&month=${month}`;
      if (activeTab === 'analysis') endpoint = `/api/reports/analysis?year=${year}&month=${month}`;

      try {
          const res = await fetch(endpoint, {
              headers: { 'user-id': String(userId) }
          });
          if (res.ok) {
              setData(await res.json());
          }
      } catch (error) {
          console.error(error);
      } finally {
          setLoading(false);
      }
  };

  const fetchCycleData = async () => {
      const userId = localStorage.getItem('finance_app_auth') ? JSON.parse(localStorage.getItem('finance_app_auth')!).id : null;
      if (!userId) return;

      try {
          const res = await fetch(`/api/reports/daily-flow?startDate=${cycleStartDate}&endDate=${cycleEndDate}`, {
              headers: { 'user-id': String(userId) }
          });
          if (res.ok) {
              setCycleData(await res.json());
          }
      } catch (error) {
          console.error("Failed to fetch daily flow", error);
      }
  };

  // Initial Fetch & On Change
  useEffect(() => {
      fetchData();
  }, [activeTab, year, month]);

  // Fetch Cycle Data when tab is cashflow or dates change
  useEffect(() => {
      if (activeTab === 'cashflow') {
          fetchCycleData();
      }
  }, [activeTab, cycleStartDate, cycleEndDate]);

  // Fixed Navigation Logic
  const handlePrevMonth = () => {
      if (month === 0) {
          setMonth(11);
          setYear(prev => prev - 1);
      } else {
          setMonth(prev => prev - 1);
      }
  };

  const handleNextMonth = () => {
      if (month === 11) {
          setMonth(0);
          setYear(prev => prev + 1);
      } else {
          setMonth(prev => prev + 1);
      }
  };

  const renderCashFlow = () => {
      // Validate correct data shape for Cashflow summary
      if (!data || typeof data.totalReceitas === 'undefined') return null;
      
      return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Cards Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-surface p-4 rounded-xl border border-slate-800">
                      <p className="text-slate-400 text-sm">Saldo Inicial</p>
                      <p className="text-xl font-bold text-white">R$ {data.startBalance.toFixed(2)}</p>
                  </div>
                  <div className="bg-surface p-4 rounded-xl border border-slate-800">
                      <p className="text-emerald-400 text-sm">Receitas</p>
                      <p className="text-xl font-bold text-emerald-500">+ R$ {data.totalReceitas.toFixed(2)}</p>
                  </div>
                  <div className="bg-surface p-4 rounded-xl border border-slate-800">
                      <p className="text-rose-400 text-sm">Despesas</p>
                      <p className="text-xl font-bold text-rose-500">- R$ {data.totalDespesas.toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                      <p className="text-sky-400 text-sm">Saldo Final</p>
                      <p className={`text-xl font-bold ${data.endBalance >= 0 ? 'text-sky-400' : 'text-rose-400'}`}>
                          R$ {data.endBalance.toFixed(2)}
                      </p>
                  </div>
              </div>

              {/* Cash Cycle Chart (Evolution) */}
              <div className="bg-surface p-6 rounded-xl border border-slate-800">
                  <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                      <div>
                          <h3 className="text-white font-bold text-lg flex items-center gap-2">
                              <CalendarRange className="text-primary" size={20}/> Evolução Diária do Caixa
                          </h3>
                          <p className="text-slate-400 text-sm">Entradas e saídas de dinheiro por data específica</p>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700">
                          <input 
                            type="date" 
                            className="bg-transparent text-white text-sm outline-none border-b border-slate-600 focus:border-primary pb-1"
                            value={cycleStartDate}
                            onChange={(e) => setCycleStartDate(e.target.value)}
                          />
                          <span className="text-slate-500 text-xs">até</span>
                          <input 
                            type="date" 
                            className="bg-transparent text-white text-sm outline-none border-b border-slate-600 focus:border-primary pb-1"
                            value={cycleEndDate}
                            onChange={(e) => setCycleEndDate(e.target.value)}
                          />
                      </div>
                  </div>
                  
                  <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={cycleData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                              <XAxis 
                                dataKey="date" 
                                tickFormatter={(str) => str ? str.split('-').slice(1).join('/') : ''}
                                tick={{fill: '#94a3b8', fontSize: 12}}
                              />
                              <YAxis hide />
                              <Tooltip 
                                  contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px'}}
                                  labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                              />
                              <Legend />
                              <Bar dataKey="income" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                              <Bar dataKey="expense" name="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                              <Line type="monotone" dataKey="net" name="Resultado Líquido" stroke="#3b82f6" strokeWidth={2} dot={{r: 4}} />
                          </ComposedChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              {/* Pies */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Income Chart */}
                  <div className="bg-surface p-6 rounded-xl border border-slate-800">
                      <h3 className="text-white font-semibold mb-4">Receitas por Categoria</h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie data={data.receitasByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#10b981">
                                      {data.receitasByCategory.map((_: any, index: number) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                  </Pie>
                                  <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b'}} />
                                  <Legend />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  {/* Expense Chart */}
                  <div className="bg-surface p-6 rounded-xl border border-slate-800">
                      <h3 className="text-white font-semibold mb-4">Despesas por Categoria</h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie data={data.despesasByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#ef4444">
                                      {data.despesasByCategory.map((_: any, index: number) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                  </Pie>
                                  <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b'}} />
                                  <Legend />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderDRE = () => {
      // Validate correct data shape for DRE
      if (!data || typeof data.receitaBruta === 'undefined') return null;

      const DreRow = ({ label, value, isTotal = false, isSubtotal = false, indent = false }: any) => (
          <div className={`flex justify-between items-center py-3 border-b border-slate-800 ${isTotal ? 'bg-slate-900/50 font-bold text-white px-2 rounded' : ''} ${isSubtotal ? 'font-semibold text-slate-200' : 'text-slate-400'}`}>
              <span className={`${indent ? 'pl-6' : ''}`}>{label}</span>
              <span className={`${(value || 0) < 0 ? 'text-rose-500' : (isTotal ? 'text-sky-400' : 'text-slate-200')}`}>
                  R$ {(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
          </div>
      );

      return (
          <div className="bg-surface rounded-xl border border-slate-800 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
              <h3 className="text-xl font-bold text-white mb-6 text-center border-b border-slate-800 pb-4">
                  Demonstração do Resultado do Exercício (Simplificado)
              </h3>
              
              <DreRow label="Receita Bruta de Vendas" value={data.receitaBruta} isSubtotal />
              <DreRow label="(-) Deduções e Impostos" value={-data.deducoes} indent />
              <DreRow label="(=) Receita Líquida" value={data.receitaLiquida} isTotal />
              
              <div className="h-4"></div>
              
              <DreRow label="(-) Custos (CMV/CSP)" value={-data.cmv} indent />
              <DreRow label="(=) Lucro Bruto" value={data.resultadoBruto} isTotal />
              
              <div className="h-4"></div>
              
              <DreRow label="(-) Despesas Operacionais" value={-data.despesasOperacionais} indent />
              <DreRow label="(=) Resultado Operacional" value={data.resultadoOperacional} isTotal />
              
              <div className="h-4"></div>
              
              <DreRow label="(+/-) Resultado Financeiro" value={data.resultadoFinanceiro} />
              <DreRow label="(+/-) Resultado Não Operacional" value={data.resultadoNaoOperacional} />
              
              <div className="h-4"></div>
              
              <DreRow label="(=) Resultado Antes IR/CSLL" value={data.resultadoAntesImpostos} isTotal />
              <DreRow label="(-) Provisão Impostos" value={-data.impostos} indent />
              
              <div className="mt-4 p-4 bg-emerald-900/20 border border-emerald-900/50 rounded-lg flex justify-between items-center">
                  <span className="text-lg font-bold text-emerald-400">LUCRO / PREJUÍZO LÍQUIDO</span>
                  <span className={`text-xl font-bold ${(data.lucroLiquido || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      R$ {(data.lucroLiquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
              </div>
          </div>
      );
  };

  const renderAnalysis = () => {
      // Validate correct data shape for Analysis
      if (!data || !data.receitas) return null;

      // KPI Helper
      const KPI = ({ title, value, icon, tooltip }: any) => (
          <div className="bg-surface p-4 rounded-xl border border-slate-800 shadow-sm flex flex-col justify-between h-full">
              <div className="flex justify-between items-start mb-2">
                  <div className="p-1.5 bg-slate-800 rounded-lg text-primary border border-slate-700">
                      {icon}
                  </div>
                  <span className={`text-xl font-bold ${value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {value.toFixed(2)}%
                  </span>
              </div>
              <div>
                  <h4 className="text-slate-200 font-semibold text-sm">{title}</h4>
                  <p className="text-slate-500 text-xs mt-1">{tooltip}</p>
              </div>
          </div>
      );

      return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* KPIs Row */}
              {data.kpis && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <KPI 
                        title="Margem de Contribuição" 
                        value={data.kpis.margemContribuicaoPct} 
                        icon={<Percent size={18}/>}
                        tooltip="Quanto sobra da receita para pagar custos fixos e gerar lucro."
                      />
                      <KPI 
                        title="Resultado Operacional" 
                        value={data.kpis.resultadoOperacionalPct} 
                        icon={<Activity size={18}/>}
                        tooltip="Proporção de lucro operacional sobre a receita líquida."
                      />
                      <KPI 
                        title="Resultado Líquido" 
                        value={data.kpis.resultadoLiquidoPct} 
                        icon={<TrendingUp size={18}/>}
                        tooltip="Lucro líquido final como porcentagem da receita bruta."
                      />
                  </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-surface p-6 rounded-xl border border-slate-800">
                      <h3 className="text-white font-bold mb-4">Análise de Receitas</h3>
                      <div className="space-y-3">
                          {Object.entries(data.receitas).map(([name, value]: any) => (
                              <div key={name}>
                                  <div className="flex justify-between text-sm mb-1">
                                      <span className="text-slate-300">{name}</span>
                                      <span className="text-emerald-400 font-bold">R$ {value.toFixed(2)}</span>
                                  </div>
                                  <div className="w-full bg-slate-800 rounded-full h-2">
                                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(value / data.totalReceitas) * 100}%` }}></div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="bg-surface p-6 rounded-xl border border-slate-800">
                      <h3 className="text-white font-bold mb-4">Análise de Despesas</h3>
                      <div className="space-y-3">
                          {Object.entries(data.despesas).map(([name, value]: any) => (
                              <div key={name}>
                                  <div className="flex justify-between text-sm mb-1">
                                      <span className="text-slate-300">{name}</span>
                                      <span className="text-rose-400 font-bold">R$ {value.toFixed(2)}</span>
                                  </div>
                                  <div className="w-full bg-slate-800 rounded-full h-2">
                                      <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${(value / data.totalDespesas) * 100}%` }}></div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Relatórios Financeiros</h1>
          <p className="text-slate-400">Análise completa da saúde financeira</p>
        </div>
        
        {/* Date Filters */}
        <div className="flex items-center gap-2 bg-surface p-1 rounded-lg border border-slate-800">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-800 rounded text-slate-400"><ChevronLeft size={16}/></button>
            <div className="px-4 text-center min-w-[140px]">
                <span className="block text-xs text-slate-500 font-bold">MÊS DE REFERÊNCIA</span>
                <span className="block text-sm font-bold text-white">{MONTHS[month]} / {year}</span>
            </div>
            <button onClick={handleNextMonth} className="p-2 hover:bg-slate-800 rounded text-slate-400"><ChevronRight size={16}/></button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex gap-1 bg-surface p-1 rounded-xl border border-slate-800 w-full md:w-fit">
          <button 
            onClick={() => { setActiveTab('cashflow'); setData(null); }}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'cashflow' ? 'bg-primary text-slate-900 shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:text-white'}`}
          >
              Fluxo de Caixa
          </button>
          <button 
            onClick={() => { setActiveTab('dre'); setData(null); }}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'dre' ? 'bg-primary text-slate-900 shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:text-white'}`}
          >
              DRE Gerencial
          </button>
          <button 
            onClick={() => { setActiveTab('analysis'); setData(null); }}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'analysis' ? 'bg-primary text-slate-900 shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:text-white'}`}
          >
              Análise Detalhada
          </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
          {loading ? (
              <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
          ) : (
              <>
                {activeTab === 'cashflow' && renderCashFlow()}
                {activeTab === 'dre' && renderDRE()}
                {activeTab === 'analysis' && renderAnalysis()}
              </>
          )}
      </div>
    </div>
  );
};

export default Reports;