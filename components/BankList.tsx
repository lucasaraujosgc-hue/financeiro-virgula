import React from 'react';
import { Bank } from '../types';
import { Plus, Power, Edit2 } from 'lucide-react';

interface BankListProps {
  banks: Bank[];
}

const BankList: React.FC<BankListProps> = ({ banks }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contas Bancárias</h1>
          <p className="text-gray-500">Gerencie suas contas e saldos</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm shadow-blue-200">
          <Plus size={18} />
          Nova Conta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banks.map((bank) => (
          <div key={bank.id} className="group bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gray-50 p-2 border border-gray-100 flex items-center justify-center">
                    <img src={bank.logo} alt={bank.name} className="max-w-full max-h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{bank.name}</h3>
                  <span className="text-xs text-gray-500">{bank.active ? 'Ativo' : 'Inativo'}</span>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
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
        ))}
      </div>
    </div>
  );
};

export default BankList;