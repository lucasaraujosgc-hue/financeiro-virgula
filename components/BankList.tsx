import React, { useState } from 'react';
import { Bank } from '../types';
import { Plus, Power, Edit2, X } from 'lucide-react';

interface BankListProps {
  banks: Bank[];
  onUpdateBank: (bank: Bank) => void;
}

const BankList: React.FC<BankListProps> = ({ banks, onUpdateBank }) => {
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Filter only active banks for main display
  const activeBanks = banks.filter(b => b.active);
  // Filter inactive banks for "Add Bank" modal
  const inactiveBanks = banks.filter(b => !b.active);

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBank) {
      onUpdateBank(editingBank);
      setEditingBank(null);
    }
  };

  const handleActivateBank = (bank: Bank) => {
      onUpdateBank({ ...bank, active: true });
      setIsAddModalOpen(false);
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
                </div>
                </div>
                
                <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Agência/Conta</span>
                    <span className="font-medium text-gray-900">{bank.accountNumber}</span>
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

      {/* Add Bank Modal (Select from inactive) */}
      {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Adicionar Nova Conta</h3>
                    <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scroll">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {inactiveBanks.map(bank => (
                            <button 
                                key={bank.id}
                                onClick={() => handleActivateBank(bank)}
                                className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                            >
                                <div className="w-10 h-10 rounded bg-white p-1 border border-gray-100 flex items-center justify-center">
                                    <img src={bank.logo} alt={bank.name} className="max-w-full max-h-full object-contain" />
                                </div>
                                <span className="font-medium text-gray-700">{bank.name}</span>
                            </button>
                        ))}
                        {inactiveBanks.length === 0 && (
                            <p className="col-span-full text-center text-gray-500">Todos os bancos disponíveis já foram adicionados.</p>
                        )}
                    </div>
                </div>
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
                    {editingBank.active ? 'Conta Ativa' : 'Desativar Conta'}
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