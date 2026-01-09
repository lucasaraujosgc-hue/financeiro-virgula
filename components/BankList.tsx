import React, { useState, useEffect } from 'react';
import { Bank } from '../types';
import { Plus, Power, Edit2, X, Trash2 } from 'lucide-react';

interface BankListProps {
  banks: Bank[];
  onUpdateBank: (bank: Bank) => void;
  onAddBank: (bank: Omit<Bank, 'id' | 'balance' | 'active'>) => void;
  onDeleteBank: (id: number) => void;
}

const BankList: React.FC<BankListProps> = ({ banks, onUpdateBank, onAddBank, onDeleteBank }) => {
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<{name: string, logo: string} | null>(null);
  const [newBankData, setNewBankData] = useState({ nickname: '', accountNumber: '' });
  
  // Dynamic list of available banks fetched from APIok
  const [availablePresets, setAvailablePresets] = useState<{id: number, name: string, logo: string}[]>([]);

  useEffect(() => {
      if (isAddModalOpen) {
          fetchGlobalBanks();
      }
  }, [isAddModalOpen]);

  const fetchGlobalBanks = async () => {
      try {
          const res = await fetch('/api/global-banks');
          if (res.ok) {
              setAvailablePresets(await res.json());
          }
      } catch (e) {
          console.error("Failed to fetch global banks", e);
      }
  };

  const activeBanks = banks.filter(b => b.active);

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBank) {
      onUpdateBank(editingBank);
      setEditingBank(null);
    }
  };

  const handleCreateBank = (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedPreset) {
          onAddBank({
              name: selectedPreset.name,
              logo: selectedPreset.logo,
              nickname: newBankData.nickname,
              accountNumber: newBankData.accountNumber
          });
          setIsAddModalOpen(false);
          setSelectedPreset(null);
          setNewBankData({ nickname: '', accountNumber: '' });
      }
  };

  const handleDeleteClick = (id: number) => {
      if(confirm('Tem certeza que deseja excluir esta conta? O histórico de lançamentos será preservado, mas não será mais possível vincular novos lançamentos.')) {
          onDeleteBank(id);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Contas Bancárias</h1>
          <p className="text-slate-400">Gerencie suas contas e saldos</p>
        </div>
        <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-slate-900 rounded-lg hover:bg-primaryHover font-medium transition-colors shadow-sm shadow-emerald-900/20"
        >
          <Plus size={18} />
          Nova Conta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeBanks.length === 0 ? (
            <div className="col-span-full py-10 text-center bg-surface rounded-xl border border-slate-800 border-dashed">
                <p className="text-slate-400">Nenhuma conta bancária ativa.</p>
                <p className="text-sm text-slate-500">Clique em "Nova Conta" para adicionar.</p>
            </div>
        ) : (
            activeBanks.map((bank) => (
            <div key={bank.id} className="group bg-surface rounded-xl p-6 border border-slate-800 shadow-sm hover:border-slate-700 transition-all duration-200">
                <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-white p-2 border border-slate-700 flex items-center justify-center overflow-hidden">
                        <img src={bank.logo} alt={bank.name} className="max-w-full max-h-full object-contain" onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40';
                        }}/>
                    </div>
                    <div>
                    <h3 className="font-bold text-slate-200">{bank.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Ativo
                    </span>
                    </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button 
                        onClick={() => setEditingBank(bank)}
                        className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button 
                        onClick={() => handleDeleteClick(bank.id)}
                        className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
                </div>
                
                <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Agência/Conta</span>
                    <span className="font-medium text-slate-300">{bank.accountNumber || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Apelido</span>
                    <span className="font-medium text-slate-300">{bank.nickname || '-'}</span>
                </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-sm text-slate-500">Saldo Atual</span>
                    <span className={`font-bold text-lg ${bank.balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        R$ {bank.balance.toFixed(2)}
                    </span>
                </div>
            </div>
            ))
        )}
      </div>

      {/* Add Bank Modal */}
      {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
            <div className="relative bg-surface border border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <h3 className="font-semibold text-white">
                        {selectedPreset ? `Nova Conta: ${selectedPreset.name}` : 'Selecionar Instituição'}
                    </h3>
                    <button onClick={() => { setIsAddModalOpen(false); setSelectedPreset(null); }} className="text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                
                {!selectedPreset ? (
                    /* Step 1: Select Bank Preset */
                    <div className="p-6 overflow-y-auto custom-scroll">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {availablePresets.map((preset, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => setSelectedPreset(preset)}
                                    className="flex flex-col items-center gap-3 p-4 rounded-xl border border-slate-800 bg-slate-900 hover:border-primary hover:bg-slate-800/80 transition-all text-center group"
                                >
                                    <div className="w-12 h-12 rounded-lg bg-white p-2 flex items-center justify-center group-hover:shadow-sm shadow-emerald-900/20">
                                        <img src={preset.logo} alt={preset.name} className="max-w-full max-h-full object-contain" />
                                    </div>
                                    <span className="font-medium text-slate-300 text-sm group-hover:text-white">{preset.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Step 2: Fill Details */
                    <form onSubmit={handleCreateBank} className="p-6 space-y-4 text-slate-300">
                        <div className="flex items-center gap-4 mb-4 p-4 bg-slate-900 rounded-lg border border-slate-800">
                             <div className="w-12 h-12 bg-white rounded-lg p-2 flex items-center justify-center">
                                 <img src={selectedPreset.logo} alt={selectedPreset.name} className="max-w-full max-h-full object-contain"/>
                             </div>
                             <div>
                                 <p className="text-sm text-slate-500">Banco selecionado</p>
                                 <p className="font-bold text-white">{selectedPreset.name}</p>
                             </div>
                             <button type="button" onClick={() => setSelectedPreset(null)} className="ml-auto text-sm text-primary hover:underline">Alterar</button>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-400">Apelido da Conta (Opcional)</label>
                            <input 
                                type="text" 
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-white placeholder-slate-600"
                                value={newBankData.nickname}
                                onChange={e => setNewBankData({...newBankData, nickname: e.target.value})}
                                placeholder="Ex: Conta Principal, Reserva, PJ..."
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-400">Número da Conta/Agência</label>
                            <input 
                                type="text" 
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-white placeholder-slate-600"
                                value={newBankData.accountNumber}
                                onChange={e => setNewBankData({...newBankData, accountNumber: e.target.value})}
                                placeholder="0000-0"
                            />
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button 
                                type="button" 
                                onClick={() => setSelectedPreset(null)}
                                className="flex-1 px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 font-medium transition-colors"
                            >
                                Voltar
                            </button>
                            <button 
                                type="submit"
                                className="flex-1 px-4 py-2 bg-primary text-slate-900 rounded-lg hover:bg-primaryHover font-medium transition-colors shadow-sm shadow-emerald-900/50"
                            >
                                Criar Conta
                            </button>
                        </div>
                    </form>
                )}
            </div>
          </div>
      )}

      {/* Edit Bank Modal */}
      {editingBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditingBank(null)} />
          <div className="relative bg-surface border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <h3 className="font-semibold text-white">Editar Conta - {editingBank.name}</h3>
              <button onClick={() => setEditingBank(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveBank} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-400">Apelido da Conta</label>
                <input 
                    type="text" 
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-white placeholder-slate-600"
                    value={editingBank.nickname || ''}
                    onChange={e => setEditingBank({...editingBank, nickname: e.target.value})}
                    placeholder="Ex: Conta Principal"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-400">Número da Conta</label>
                <input 
                    type="text" 
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-white"
                    value={editingBank.accountNumber}
                    onChange={e => setEditingBank({...editingBank, accountNumber: e.target.value})}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                 <button
                    type="button"
                    onClick={() => setEditingBank({...editingBank, active: !editingBank.active})}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                        editingBank.active 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
                        : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                    }`}
                 >
                    <Power size={16} />
                    {editingBank.active ? 'Conta Ativa' : 'Conta Arquivada'}
                 </button>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                    type="button" 
                    onClick={() => setEditingBank(null)}
                    className="flex-1 px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 font-medium transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-slate-900 rounded-lg hover:bg-primaryHover font-medium transition-colors shadow-sm shadow-emerald-900/50"
                >
                    Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankList;