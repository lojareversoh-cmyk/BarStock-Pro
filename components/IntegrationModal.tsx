
import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { Database, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, X, DownloadCloud } from 'lucide-react';

interface IntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  onImport: (mappedSales: Record<string, number>) => void;
}

export const IntegrationModal: React.FC<IntegrationModalProps> = ({ isOpen, onClose, items, onImport }) => {
  const [activeTab, setActiveTab] = useState<'csv' | 'json'>('csv');
  const [inputText, setInputText] = useState('');
  const [previewData, setPreviewData] = useState<{ id: string; name: string; oldSales: number; newSales: number; found: boolean }[] | null>(null);

  if (!isOpen) return null;

  const handleProcess = () => {
    const lines = inputText.split('\n');
    const salesMap: Record<string, number> = {};
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Parse Input
    if (activeTab === 'csv') {
      // Expecting format: Product Name, Quantity
      lines.forEach(line => {
        const parts = line.split(/,|\t|;/); // Split by comma, tab or semicolon
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const qty = parseFloat(parts[parts.length - 1].trim()); // Assume last column is qty
          if (name && !isNaN(qty)) {
            salesMap[normalize(name)] = qty;
          }
        }
      });
    } else {
      try {
        const json = JSON.parse(inputText);
        // Expecting array of objects { name: "...", quantity: 10 }
        if (Array.isArray(json)) {
            json.forEach((obj: any) => {
                const name = obj.name || obj.produto || obj.product;
                const qty = obj.quantity || obj.qty || obj.venda || obj.sales;
                if (name && qty) salesMap[normalize(name)] = Number(qty);
            });
        }
      } catch (e) {
        alert("JSON Inválido. Verifique a formatação.");
        return;
      }
    }

    // 2. Match with System Items
    const preview = items.map(item => {
      const normalizedItemName = normalize(item.name);
      // Try exact match or partial match
      const matchedKey = Object.keys(salesMap).find(k => normalizedItemName.includes(k) || k.includes(normalizedItemName));
      
      if (matchedKey) {
        return {
          id: item.id,
          name: item.name,
          oldSales: item.sales,
          newSales: salesMap[matchedKey],
          found: true
        };
      }
      return null;
    }).filter(Boolean) as { id: string; name: string; oldSales: number; newSales: number; found: boolean }[];

    setPreviewData(preview);
  };

  const handleConfirm = () => {
    if (!previewData) return;
    
    const finalMap: Record<string, number> = {};
    previewData.forEach(p => {
      finalMap[p.id] = p.newSales;
    });

    onImport(finalMap);
    onClose();
    setPreviewData(null);
    setInputText('');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Database className="text-indigo-400" />
              Integração de Vendas
            </h2>
            <p className="text-slate-400 text-sm mt-1">Importe dados externos do seu PDV ou Planilha</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {!previewData ? (
            <div className="space-y-4">
              <div className="flex gap-4 border-b border-slate-800 pb-2">
                <button 
                  onClick={() => setActiveTab('csv')}
                  className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'csv' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <span className="flex items-center gap-2"><FileSpreadsheet size={16}/> Copiar/Colar (CSV/Excel)</span>
                </button>
                <button 
                  onClick={() => setActiveTab('json')}
                  className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'json' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <span className="flex items-center gap-2"><Database size={16}/> JSON / API Raw</span>
                </button>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-400 mb-2 font-mono">
                  {activeTab === 'csv' 
                    ? "Formato esperado: Nome do Produto, Quantidade (Ex: Coca Cola, 50)" 
                    : "Formato esperado: Array de objetos [{ name: '...', quantity: 10 }]"}
                </p>
                <textarea 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full h-64 bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 font-mono focus:border-indigo-500 outline-none"
                  placeholder={activeTab === 'csv' ? "Coca Cola Lata, 10\nRed Bull, 5\nHeineken, 24" : '[{"name": "Coca Cola", "sales": 10}]'}
                />
              </div>

              <button 
                onClick={handleProcess}
                disabled={!inputText.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                <ArrowRight size={18} />
                Processar Dados
              </button>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <h3 className="text-lg font-semibold text-white">Confirmação de Mapeamento</h3>
                 <span className="text-sm bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/30">
                   {previewData.length} produtos encontrados
                 </span>
               </div>

               <div className="border border-slate-700 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                 <table className="w-full text-sm text-left text-slate-400">
                   <thead className="bg-slate-800 text-slate-200 text-xs uppercase sticky top-0">
                     <tr>
                       <th className="px-4 py-2">Produto (Sistema)</th>
                       <th className="px-4 py-2 text-center">Venda Atual</th>
                       <th className="px-4 py-2 text-center"></th>
                       <th className="px-4 py-2 text-center text-indigo-400">Nova Venda (Importada)</th>
                       <th className="px-4 py-2 text-center">Status</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                     {previewData.map((item) => (
                       <tr key={item.id}>
                         <td className="px-4 py-2 font-medium text-slate-300">{item.name}</td>
                         <td className="px-4 py-2 text-center">{item.oldSales}</td>
                         <td className="px-4 py-2 text-center"><ArrowRight size={14} className="mx-auto text-slate-600" /></td>
                         <td className="px-4 py-2 text-center font-bold text-indigo-400 bg-indigo-500/10">{item.newSales}</td>
                         <td className="px-4 py-2 text-center text-emerald-500"><CheckCircle2 size={16} className="mx-auto" /></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               
               <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex gap-3">
                 <AlertCircle className="text-yellow-500 shrink-0" size={20} />
                 <p className="text-xs text-yellow-200">
                   Atenção: Os valores de venda dos produtos acima serão substituídos pelos valores importados. Produtos não listados manterão seus valores atuais.
                 </p>
               </div>

               <div className="flex gap-3 pt-2">
                 <button 
                   onClick={() => setPreviewData(null)}
                   className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-lg transition-all"
                 >
                   Voltar
                 </button>
                 <button 
                   onClick={handleConfirm}
                   className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
                 >
                   <DownloadCloud size={18} />
                   Confirmar Importação
                 </button>
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
