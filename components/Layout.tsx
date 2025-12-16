import React, { ReactNode } from 'react';
import { LayoutDashboard, Receipt, PieChart, Landmark, LogOut, Menu, ArrowUpRight, FileSpreadsheet, Tags, Scale, Calculator } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  userName?: string; // Add userName prop
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, onLogout, userName }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-100 flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}/>
            <div className="hidden w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
               <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="font-bold text-xl text-gray-800 tracking-tight">Sistema Fin.</span>
          </div>

          <nav className="flex-1 p-4 space-y-6 overflow-y-auto custom-scroll">
            
            {/* Main Action Group */}
            <div className="space-y-1">
                <button
                  onClick={() => { onTabChange('forecasts'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-all shadow-sm
                    ${activeTab === 'forecasts' 
                      ? 'bg-blue-600 text-white shadow-blue-200' 
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}
                  `}
                >
                  <ArrowUpRight size={20} />
                  Previsões
                </button>

                <button
                  onClick={() => { onTabChange('transactions'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${activeTab === 'transactions' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                >
                  <Receipt size={18} />
                  Lançamentos
                </button>

                <button
                  onClick={() => { onTabChange('import'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${activeTab === 'import' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                >
                  <FileSpreadsheet size={18} />
                  Importar Extrato
                </button>
            </div>

            {/* Cadastros */}
            <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Cadastros</div>
                <div className="space-y-1">
                    <button
                        onClick={() => { onTabChange('banks'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                            ${activeTab === 'banks' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                        `}
                    >
                        <Landmark size={18} />
                        Bancos
                    </button>
                    <button
                        onClick={() => { onTabChange('categories'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                            ${activeTab === 'categories' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                        `}
                    >
                        <Tags size={18} />
                        Categorias
                    </button>
                </div>
            </div>

            {/* Relatórios */}
            <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Relatórios</div>
                <div className="space-y-1">
                    <button
                        onClick={() => { onTabChange('reports'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                            ${activeTab === 'reports' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                        `}
                    >
                        <Calculator size={18} />
                        Fluxo de Caixa
                    </button>
                    <button
                        onClick={() => { onTabChange('reports'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                           text-gray-600 hover:bg-gray-50 hover:text-gray-900
                        `}
                    >
                        <Scale size={18} />
                        DRE Simplificado
                    </button>
                    <button
                        onClick={() => { onTabChange('reports'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                           text-gray-600 hover:bg-gray-50 hover:text-gray-900
                        `}
                    >
                        <PieChart size={18} />
                        Análises e Indicadores
                    </button>
                </div>
            </div>

            {/* Legacy Dashboard Link */}
            <div className="pt-4 border-t border-gray-100">
                 <button
                  onClick={() => { onTabChange('dashboard'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                >
                  <LayoutDashboard size={18} />
                  Visão Geral
                </button>
            </div>

          </nav>

          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-lg bg-gray-50">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs uppercase">
                {userName ? userName.substring(0,2) : 'EM'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{userName || 'Empresa'}</p>
                <p className="text-xs text-gray-500 truncate">Logado</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <span className="font-bold text-lg text-gray-800">Sistema Financeiro</span>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Menu size={24} />
          </button>
        </header>

        <div className="flex-1 overflow-auto custom-scroll p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;