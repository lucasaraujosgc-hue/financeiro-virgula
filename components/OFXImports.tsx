import React, { useState, useRef, useEffect } from 'react';
import { Bank, OFXImport, Transaction, TransactionType } from '../types';
import { FileUp, Trash2, Calendar, Database, FileSpreadsheet } from 'lucide-react';

interface OFXImportsProps {
  userId: number;
  banks: Bank[];
  onTransactionsImported: () => void; // Callback to refresh transaction list in App
}

const OFXImports: React.FC<OFXImportsProps> = ({ userId, banks, onTransactionsImported }) => {
  const [imports, setImports] = useState<OFXImport[]>([]);
  const [importConfig, setImportConfig] = useState({
    bankId: banks[0]?.id || 0,
    startDate: '',
    endDate: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getHeaders = () => ({
      'Content-Type': 'application/json',
      'user-id': String(userId)
  });

  // Load Imports History
  useEffect(() => {
      fetchImports();
  }, [userId]);

  // Update default bank ID
  useEffect(() => {
      if(banks.length > 0 && importConfig.bankId === 0) {
          setImportConfig(prev => ({...prev, bankId: banks[0].id}));
      }
  }, [banks]);

  const fetchImports = async () => {
      try {
          const res = await fetch('/api/ofx-imports', { headers: getHeaders() });
          if (res.ok) setImports(await res.json());
      } catch (e) {
          console.error(e);
      }
  };

  const processOFXFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      const transactionsRaw = content.split('<STMTTRN>');
      const start = importConfig.startDate ? new Date(importConfig.startDate) : null;
      const end = importConfig.endDate ? new Date(importConfig.endDate) : null;

      const transactionsToAdd: any[] = [];
      let ignored = 0;

      transactionsRaw.forEach(block => {
        const dateMatch = block.match(/<DTPOSTED>(\d{8})/);
        const amountMatch = block.match(/<TRNAMT>([\d.-]+)/);
        const memoMatch = block.match(/<MEMO>(.*?)[\r\n<]/);

        if (dateMatch && amountMatch && memoMatch) {
            const dateStr = dateMatch[1]; 
            const formattedDate = `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
            const txDate = new Date(formattedDate);
            
            // Date Filter
            if (start && txDate < start) { ignored++; return; }
            if (end && txDate > end) { ignored++; return; }

            const rawValue = parseFloat(amountMatch[1]);
            const type = rawValue < 0 ? TransactionType.DEBIT : TransactionType.CREDIT;
            
            transactionsToAdd.push({
                date: formattedDate,
                description: memoMatch[1].trim(),
                value: Math.abs(rawValue),
                type: type,
                bankId: Number(importConfig.bankId),
                categoryId: 0,
                reconciled: false
            });
        }
      });

      if (transactionsToAdd.length > 0) {
          // 1. Create Import Record
          try {
              const resImport = await fetch('/api/ofx-imports', {
                  method: 'POST',
                  headers: getHeaders(),
                  body: JSON.stringify({
                      fileName: file.name,
                      importDate: new Date().toISOString(),
                      bankId: Number(importConfig.bankId),
                      transactionCount: transactionsToAdd.length
                  })
              });
              const importData = await resImport.json();
              
              // 2. Add Transactions linked to Import
              for (const tx of transactionsToAdd) {
                   await fetch('/api/transactions', {
                       method: 'POST',
                       headers: getHeaders(),
                       body: JSON.stringify({ ...tx, ofxImportId: importData.id })
                   });
              }

              alert(`${transactionsToAdd.length} lançamentos importados com sucesso!`);
              fetchImports();
              onTransactionsImported();
              if (fileInputRef.current) fileInputRef.current.value = '';

          } catch (err) {
              alert("Erro ao salvar importação no servidor.");
          }
      } else {
          alert("Nenhum lançamento válido encontrado no período selecionado.");
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteImport = async (id: number) => {
      if(confirm('ATENÇÃO: Excluir esta importação irá apagar TODOS os lançamentos financeiros vinculados a ela. Deseja continuar?')) {
          try {
              const res = await fetch(`/api/ofx-imports/${id}`, { 
                  method: 'DELETE',
                  headers: getHeaders()
              });
              if (res.ok) {
                  setImports(prev => prev.filter(i => i.id !== id));
                  onTransactionsImported(); // Refresh main list
              }
          } catch (e) {
              alert("Erro ao excluir.");
          }
      }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gerenciador de OFX</h1>
        <p className="text-gray-500">Importe e gerencie seus arquivos bancários</p>
      </div>

      {/* Import Area */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
         <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileUp className="text-blue-600" size={20}/> Nova Importação
         </h2>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Conta Bancária</label>
                <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                    value={importConfig.bankId}
                    onChange={e => setImportConfig({...importConfig, bankId: Number(e.target.value)})}
                >
                    {banks.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>
            </div>
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Data Inicial (Opcional)</label>
                <input 
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                    value={importConfig.startDate}
                    onChange={e => setImportConfig({...importConfig, startDate: e.target.value})}
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Data Final (Opcional)</label>
                <input 
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                    value={importConfig.endDate}
                    onChange={e => setImportConfig({...importConfig, endDate: e.target.value})}
                />
            </div>
         </div>
         
         <div className="flex items-center gap-4">
             <input 
                type="file" 
                ref={fileInputRef}
                accept=".ofx"
                className="hidden"
                onChange={(e) => {
                    if (e.target.files?.[0]) processOFXFile(e.target.files[0]);
                }}
             />
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-lg shadow-blue-200"
             >
                <FileSpreadsheet size={20} />
                Selecionar Arquivo OFX
             </button>
             <p className="text-sm text-gray-500">Selecione o arquivo .ofx fornecido pelo seu banco.</p>
         </div>
      </div>

      {/* List Area */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
           <h3 className="font-semibold text-gray-800">Histórico de Importações</h3>
        </div>
        <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                    <th className="px-6 py-4">Data Importação</th>
                    <th className="px-6 py-4">Arquivo</th>
                    <th className="px-6 py-4">Banco</th>
                    <th className="px-6 py-4 text-center">Lançamentos</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {imports.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Nenhuma importação realizada.</td>
                    </tr>
                ) : (
                    imports.map(imp => {
                        const bank = banks.find(b => b.id === imp.bankId);
                        return (
                            <tr key={imp.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-gray-500">
                                    {new Date(imp.importDate).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-900">{imp.fileName}</td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    {bank && <img src={bank.logo} className="w-5 h-5 rounded-full" />}
                                    {bank?.name || 'Desconhecido'}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-bold">
                                        {imp.transactionCount}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => handleDeleteImport(imp.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="Excluir Importação e Lançamentos"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        );
                    })
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default OFXImports;