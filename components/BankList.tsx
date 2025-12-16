import React, { useState } from 'react';
import { Bank } from '../types';
import { Plus, Power, Edit2, X, Trash2 } from 'lucide-react';

interface BankListProps {
  banks: Bank[];
  onUpdateBank: (bank: Bank) => void;
  onAddBank: (bank: Omit<Bank, 'id' | 'balance' | 'active'>) => void;
  onDeleteBank: (id: number) => void;
}

const AVAILABLE_BANKS_PRESETS = [
  { name: 'Nubank', logo: '/nubank.jpg' },
  { name: 'Itaú', logo: '/itau.png' },
  { name: 'Bradesco', logo: '/bradesco.jpg' },
  { name: 'Caixa Econômica', logo: '/caixa.png' },
  { name: 'Banco do Brasil', logo: '/bb.png' },
  { name: 'Santander', logo: '/santander.png' },
  { name: 'Inter', logo: '/inter.png' },
  { name: 'BTG Pactual', logo: '/btg_pactual.png' },
  { name: 'C6 Bank', logo: '/c6_bank.png' },
  { name: 'Sicredi', logo: '/sicredi.png' },
  { name: 'Sicoob', logo: '/sicoob.png' },
  { name: 'Mercado Pago', logo: '/mercado_pago.png' },
  { name: 'PagBank', logo: '/pagbank.png' },
  { name: 'Stone', logo: '/stone.png' },
  { name: 'Banco Safra', logo: '/safra.png' },
  { name: 'Banco Pan', logo: '/banco_pan.png' },
  { name: 'Banrisul', logo: '/banrisul.png' },
  { name: 'Neon', logo: '/neon.png' },
  { name: 'Caixa Registradora', logo: '/caixaf.png' },
];

const BankList: React.FC<BankListProps> = ({ banks, onUpdateBank, onAddBank, onDeleteBank }) => {
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<{name: string, logo: string} | null>(null);
  const [newBankData, setNewBankData] = useState({ nickname: '', accountNumber: '' });

  // Filter only active banks for main display (we now treat deleted as hard delete, so all in array are 'existing')
  // We can still keep the 'active' flag for "Archived" logic if desired, but for now lets show all
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
          <h1 className="text-2xl font-bold text-gray-900">Contas Bancárias</h1>
          <p className="text-gray-500">Gerencie suas contas e saldos</p>
        </div>
        <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm shadow-blue-200"
        >
          <Plus size={18} />
          Nova Conta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeBanks.length === 0 ? (
            <div className="col-span-full py-10 text-center bg-white rounded-xl border border-gray-200 border-dashed">
                <p className="text-gray-500">Nenhuma conta bancária ativa.</p>
                <p className="text-sm text-gray-400">Clique em "Nova Conta" para adicionar.</p>
            </div>
        ) : (
            activeBanks.map((bank) => (
            <div key={bank.id} className="group bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-50 p-2 border border-gray-100 flex items-center justify-center overflow-hidden">
                        <img src={bank.logo} alt={bank.name} className="max-w-full max-h-full object-contain" onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40';
                        }}/>
                    </div>
                    <div>
                    <h3 className="font-bold text-gray-900">{bank.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        Ativo
                    </span>
                    </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button 
                        onClick={() => setEditingBank(bank)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button 
                        onClick={() => handleDeleteClick(bank.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
                </div>
                
                <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Agência/Conta</span>
                    <span className="font-medium text-gray-900">{bank.accountNumber || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Apelido</span>
                    <span className="font-medium text-gray-900">{bank.nickname || '-'}</span>
                </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-sm text-gray-500">Saldo Atual</span>
                    <span className={`font-bold text-lg ${bank.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
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
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-900">
                        {selectedPreset ? `Nova Conta: ${selectedPreset.name}` : 'Selecionar Instituição'}
                    </h3>
                    <button onClick={() => { setIsAddModalOpen(false); setSelectedPreset(null); }} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>
                
                {!selectedPreset ? (
                    /* Step 1: Select Bank Preset */
                    <div className="p-6 overflow-y-auto custom-scroll">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {AVAILABLE_BANKS_PRESETS.map((preset, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => setSelectedPreset(preset)}
                                    className="flex flex-col items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-center group"
                                >
                                    <div className="w-12 h-12 rounded-lg bg-white p-2 border border-gray-100 flex items-center justify-center group-hover:shadow-sm">
                                        <img src={preset.logo} alt={preset.name} className="max-w-full max-h-full object-contain" />
                                    </div>
                                    <span className="font-medium text-gray-700 text-sm">{preset.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Step 2: Fill Details */
                    <form onSubmit={handleCreateBank} className="p-6 space-y-4">
                        <div className="flex items-center gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                             <div className="w-12 h-12 bg-white rounded-lg p-2 border border-gray-200 flex items-center justify-center">
                                 <img src={selectedPreset.logo} alt={selectedPreset.name} className="max-w-full max-h-full object-contain"/>
                             </div>
                             <div>
                                 <p className="text-sm text-gray-500">Banco selecionado</p>
                                 <p className="font-bold text-gray-900">{selectedPreset.name}</p>
                             </div>
                             <button type="button" onClick={() => setSelectedPreset(null)} className="ml-auto text-sm text-blue-600 hover:underline">Alterar</button>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Apelido da Conta (Opcional)</label>
                            <input 
                                type="text" 
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                value={newBankData.nickname}
                                onChange={e => setNewBankData({...newBankData, nickname: e.target.value})}
                                placeholder="Ex: Conta Principal, Reserva, PJ..."
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Número da Conta/Agência</label>
                            <input 
                                type="text" 
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                value={newBankData.accountNumber}
                                onChange={e => setNewBankData({...newBankData, accountNumber: e.target.value})}
                                placeholder="0000-0"
                            />
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button 
                                type="button" 
                                onClick={() => setSelectedPreset(null)}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            >
                                Voltar
                            </button>
                            <button 
                                type="submit"
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm shadow-blue-200"
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingBank(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">Editar Conta - {editingBank.name}</h3>
              <button onClick={() => setEditingBank(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveBank} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Apelido da Conta</label>
                <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                    value={editingBank.nickname || ''}
                    onChange={e => setEditingBank({...editingBank, nickname: e.target.value})}
                    placeholder="Ex: Conta Principal"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Número da Conta</label>
                <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                    value={editingBank.accountNumber}
                    onChange={e => setEditingBank({...editingBank, accountNumber: e.target.value})}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                 <button
                    type="button"
                    onClick={() => setEditingBank({...editingBank, active: !editingBank.active})}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        editingBank.active 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
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
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm shadow-blue-200"
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