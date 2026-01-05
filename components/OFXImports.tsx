import React, { useState, useRef, useEffect } from 'react';
import { Bank, OFXImport, Transaction, TransactionType, KeywordRule } from '../types';
import { FileUp, Trash2, Calendar, Database, FileSpreadsheet } from 'lucide-react';

interface OFXImportsProps {
  userId: number;
  banks: Bank[];
  keywordRules: KeywordRule[];
  onTransactionsImported: () => void; // Callback to refresh transaction list in App
}

const OFXImports: React.FC<OFXImportsProps> = ({ userId, banks, keywordRules, onTransactionsImported }) => {
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
            const description = memoMatch[1].trim();

            // KEYWORD RULE MATCHING
            let matchedCategoryId = 0;
            // Iterate rules to find a match
            for (const rule of keywordRules) {
                // Check Type Match
                if (rule.type === type) {
                    // Check Keyword Match (Case insensitive)
                    if (description.toLowerCase().includes(rule.keyword.toLowerCase())) {
                        matchedCategoryId = rule.categoryId;
                        break; // Stop at first match
                    }
                }
            }
            
            transactionsToAdd.push({
                date: formattedDate,
                description: description,
                value: Math.abs(rawValue),
                type: type,
                bankId: Number(importConfig.bankId),
                categoryId: matchedCategoryId,
                reconciled: matchedCategoryId > 0 // If rule matched, mark as reconciled? Optional, let's keep false or true based on preference. User didn't specify, but auto-cat implies logic. Keeping false for safety unless confirmed.
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
        <h1 className="text-2xl font-bold text-white">Gerenciador de OFX</h1>
        <p className="text-slate-400">Importe e gerencie seus arquivos bancários</p>
      </div>

      {/* Import Area */}
      <div className="bg-surface p-6 rounded-xl border border-slate-800 shadow-sm">
         <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <FileUp className="text-primary" size={20}/> Nova Importação
         </h2>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-400">Conta Bancária</label>
                <select 
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-white"
                    value={importConfig.bankId}
                    onChange={e => setImportConfig({...importConfig, bankId: Number(e.target.value)})}
                >
                    {banks.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>
            </div>
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-400">Data Inicial (Opcional)</label>
                <input 
                    type="date"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-white"
                    value={importConfig.startDate}
                    onChange={e => setImportConfig({...importConfig, startDate: e.target.value})}
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-400">Data Final (Opcional)</label>
                <input 
                    type="date"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-white"
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
                className="flex items-center gap-2 px-6 py-3 bg-primary text-slate-900 rounded-lg hover:bg-primaryHover font-medium transition-colors shadow-lg shadow-emerald-900/50"
             >
                <FileSpreadsheet size={20} />
                Selecionar Arquivo OFX
             </button>
             <p className="text-sm text-slate-500">Selecione o arquivo .ofx fornecido pelo seu banco.</p>
         </div>
      </div>

      {/* List Area */}
      <div className="bg-surface rounded-xl border border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/30">
           <h3 className="font-semibold text-slate-200">Histórico de Importações</h3>
        </div>
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-950 text-slate-400 font-medium border-b border-slate-800">
                <tr>
                    <th className="px-6 py-4">Data Importação</th>
                    <th className="px-6 py-4">Arquivo</th>
                    <th className="px-6 py-4">Banco</th>
                    <th className="px-6 py-4 text-center">Lançamentos</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
                {imports.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Nenhuma importação realizada.</td>
                    </tr>
                ) : (
                    imports.map(imp => {
                        const bank = banks.find(b => b.id === imp.bankId);
                        return (
                            <tr key={imp.id} className="hover:bg-slate-800/50">
                                <td className="px-6 py-4 text-slate-400">
                                    {new Date(imp.importDate).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-200">{imp.fileName}</td>
                                <td className="px-6 py-4 flex items-center gap-2 text-slate-300">
                                    {bank && <img src={bank.logo} className="w-5 h-5 rounded-full bg-white p-0.5" />}
                                    {bank?.name || 'Desconhecido'}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="bg-sky-500/10 text-sky-500 px-2 py-1 rounded-md text-xs font-bold border border-sky-500/20">
                                        {imp.transactionCount}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => handleDeleteImport(imp.id)}
                                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
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