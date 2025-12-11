import React, { useMemo, useState } from 'react';
import { InventoryItem, CalculatedItem, Category } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { Layers, Trash2, Plus, X, Search, Settings, Check, ArrowLeft, CloudDownload, Globe, Edit3, List, Lock } from 'lucide-react';

interface InventoryTableProps {
  items: InventoryItem[];
  onUpdateItem: (id: string, field: keyof InventoryItem, value: string | number) => void;
  onBulkUpdate: (ids: string[], field: keyof InventoryItem, value: string | number) => void;
  onBulkDelete: (ids: string[]) => void;
  onAddItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
  onOpenIntegration: () => void;
  isCentral?: boolean;
  barDemandMap?: Record<string, number>;
  onSyncCentralOutputs?: () => void;
}

// Helper to get color for any category
const getCategoryColor = (category: string): string => {
  const predefinedColor = Object.entries(Category).find(([, val]) => val === category);
  if (predefinedColor && CATEGORY_COLORS[predefinedColor[1] as Category]) {
    return CATEGORY_COLORS[predefinedColor[1] as Category];
  }
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 45%)`;
};

interface FinancialItem extends CalculatedItem {
  revenue: number; // Faturamento
  profit: number; // Lucro
  margin: number; // Margem
  totalCostValue: number; // Custo Total (Stock Value)
  autoTheoreticalStock: number; // The calculated value before override
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ 
  items, 
  onUpdateItem, 
  onBulkUpdate, 
  onBulkDelete,
  onAddItem, 
  onDeleteItem,
  onRenameCategory,
  onOpenIntegration,
  isCentral = false,
  barDemandMap = {},
  onSyncCentralOutputs
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkField, setBulkField] = useState<keyof InventoryItem>('finalCount');
  const [bulkValue, setBulkValue] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryInputValue, setEditCategoryInputValue] = useState('');

  const [newItem, setNewItem] = useState<{
    code: string;
    name: string;
    category: string;
    unit: string;
    costPrice: string;
    sellPrice: string;
  }>({
    code: '',
    name: '',
    category: Category.SODA,
    unit: 'un',
    costPrice: '',
    sellPrice: ''
  });

  const calculatedItems: FinancialItem[] = useMemo(() => {
    return items.map(item => {
      
      const qtyOut = item.sales; // Mapped to QNT SAIDA / VENDAS
      
      const revenue = qtyOut * item.sellPrice; // Faturamento
      const costOfGoodsSold = qtyOut * item.costPrice;
      const profit = revenue - costOfGoodsSold; // Lucro
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0; // Margem %
      
      const totalCostValue = item.finalCount * item.costPrice; // Custo Total do Estoque

      // Theoretical Calculation (SISTEMA - Auto)
      // Initial + Inputs + Transfers In - Transfers Out - Returns - Losses - Sales
      const autoTheoreticalStock = 
        item.initialStock + 
        item.inputs + 
        item.transfersIn - 
        item.transfersOut - 
        item.returns - 
        item.losses - 
        qtyOut;

      // Use Manual Override if provided, else Auto
      const theoreticalStock = item.manualSystemStock !== undefined 
        ? item.manualSystemStock 
        : autoTheoreticalStock;

      const difference = item.finalCount - theoreticalStock;

      return {
        ...item,
        theoreticalStock,
        autoTheoreticalStock,
        difference,
        financialDifference: difference * item.costPrice,
        revenue,
        profit,
        margin,
        totalCostValue
      };
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    return calculatedItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory ? item.category === filterCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [calculatedItems, searchQuery, filterCategory]);

  const groupedItems = useMemo<Record<string, FinancialItem[]>>(() => {
    const groups: Record<string, FinancialItem[]> = {};
    filteredItems.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  const availableCategories = useMemo(() => {
    const defaultCats = Object.values(Category);
    const usedCats = calculatedItems.map(i => i.category);
    return Array.from(new Set([...defaultCats, ...usedCats])).sort();
  }, [calculatedItems]);

  const handleNumChange = (id: string, field: keyof InventoryItem, value: string) => {
    const numValue = value === '' ? undefined : (parseFloat(value) || 0);
    // @ts-ignore
    onUpdateItem(id, field, numValue);
  };

  const handleTextChange = (id: string, field: keyof InventoryItem, value: string) => {
    onUpdateItem(id, field, value);
  };

  // Selection Logic
  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(filteredItems.map(i => i.id)));
    else setSelectedIds(new Set());
  };

  const handleSelectCategory = (categoryItems: FinancialItem[], checked: boolean) => {
    const newSelected = new Set(selectedIds);
    categoryItems.forEach(item => {
      if (checked) newSelected.add(item.id);
      else newSelected.delete(item.id);
    });
    setSelectedIds(newSelected);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const applyBulkUpdate = () => {
    if (selectedIds.size === 0) return;
    let valueToUpdate: string | number = bulkValue;
    if (['costPrice', 'sellPrice', 'finalCount', 'inputs', 'sales', 'minStock', 'transfersIn', 'returns', 'losses', 'manualSystemStock'].includes(bulkField)) {
      valueToUpdate = parseFloat(bulkValue) || 0;
    }
    onBulkUpdate(Array.from(selectedIds), bulkField, valueToUpdate);
    setBulkValue('');
  };

  const handleSaveNewItem = () => {
    if (!newItem.name) return alert('Nome é obrigatório');
    
    const item: InventoryItem = {
      id: `manual_${Date.now()}`,
      code: newItem.code || '0000',
      name: newItem.name,
      category: newItem.category.trim(),
      unit: newItem.unit,
      costPrice: parseFloat(newItem.costPrice) || 0,
      sellPrice: parseFloat(newItem.sellPrice) || 0,
      minStock: 0,
      initialStock: 0,
      inputs: 0,
      transfersIn: 0,
      transfersOut: 0,
      returns: 0,
      losses: 0,
      sales: 0,
      finalCount: 0,
      manualSystemStock: undefined,
      auditNotes: ''
    };

    onAddItem(item);
    setIsAddModalOpen(false);
    setNewItem({ code: '', name: '', category: Category.SODA, unit: 'un', costPrice: '', sellPrice: '' });
  };

  const startEditingCategory = (cat: string) => { setEditingCategory(cat); setEditCategoryInputValue(cat); };
  const saveCategoryRename = () => {
    if (editingCategory && editCategoryInputValue.trim()) {
      onRenameCategory(editingCategory, editCategoryInputValue.trim());
      setEditingCategory(null);
    }
  };

  const allSelected = filteredItems.length > 0 && selectedIds.size === filteredItems.length;

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg flex flex-col md:flex-row gap-4 justify-between items-center">
         <div className="flex flex-1 gap-2 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
              <input type="text" placeholder="Buscar Código ou Produto..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 py-2 text-sm text-white focus:border-indigo-500 outline-none"/>
            </div>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
               <option value="">Categorias</option>
               {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {(searchQuery || filterCategory) && <button onClick={() => {setSearchQuery(''); setFilterCategory('')}} className="text-slate-400 hover:text-white"><X size={18}/></button>}
         </div>
         <div className="flex gap-2">
            <button onClick={() => setIsAddModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
               <Plus size={16} /> Novo Produto
            </button>
            <button onClick={onOpenIntegration} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
               <CloudDownload size={16} /> Importar
            </button>
         </div>
      </div>

      {/* Bulk Actions */}
      <div className="bg-slate-800 p-2 rounded-lg flex gap-2 items-center overflow-x-auto">
         <Layers size={16} className="text-slate-400 ml-2" />
         <span className="text-xs text-slate-300 font-mono whitespace-nowrap">{selectedIds.size} sel.</span>
         <div className="h-4 w-px bg-slate-600 mx-2"></div>
         <select value={bulkField} onChange={e => setBulkField(e.target.value as keyof InventoryItem)} className="bg-slate-900 border border-slate-700 text-xs text-white rounded px-2 py-1 outline-none">
            <option value="finalCount">Contagem (Saldo)</option>
            <option value="inputs">Entradas</option>
            <option value="transfersIn">Transferências</option>
            <option value="returns">Devoluções</option>
            <option value="losses">Perdas</option>
            <option value="sales">Vendas</option>
            <option value="costPrice">Custo</option>
            <option value="manualSystemStock">Sistema (Manual)</option>
         </select>
         <input type="number" value={bulkValue} onChange={e => setBulkValue(e.target.value)} className="bg-slate-900 border border-slate-700 text-xs text-white rounded w-20 px-2 py-1 outline-none" placeholder="Valor" />
         <button onClick={applyBulkUpdate} disabled={selectedIds.size===0} className="bg-indigo-600 px-3 py-1 rounded text-xs text-white font-bold disabled:opacity-50">Aplicar</button>
         
         {selectedIds.size > 0 && (
             <button 
                onClick={() => {
                    if (window.confirm(`Tem certeza que deseja excluir ${selectedIds.size} itens selecionados?`)) {
                        onBulkDelete(Array.from(selectedIds));
                        setSelectedIds(new Set());
                    }
                }} 
                className="bg-rose-600 hover:bg-rose-500 px-3 py-1 rounded text-xs text-white font-bold flex items-center gap-1 transition-colors"
             >
                 <Trash2 size={12}/> Excluir Selecionados
             </button>
         )}
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-none border border-black shadow-2xl">
        <table className="w-full text-xs text-left whitespace-nowrap bg-slate-900">
          <thead className="text-[10px] uppercase font-bold bg-black text-white tracking-wider sticky top-0 z-20">
            <tr>
              <th className="px-2 py-3 text-center border-r border-slate-800 w-8">
                 <input type="checkbox" checked={allSelected} onChange={e => handleSelectAll(e.target.checked)} className="rounded bg-slate-800 border-slate-600" />
              </th>
              {isCentral ? (
                  // Layout ESPECÍFICO para Estoque Geral (Central)
                  <>
                      <th className="px-3 py-3 border-r border-slate-800 min-w-[200px]">PRODUTO</th>
                      <th className="px-2 py-3 text-center border-r border-slate-800">INICIAL</th>
                      <th className="px-2 py-3 text-center border-r border-slate-800 bg-slate-800 text-yellow-400 border-x border-slate-700">CONTAGEM</th>
                      <th className="px-2 py-3 text-center border-r border-slate-800 text-orange-400">VENDA</th>
                      <th className="px-2 py-3 text-right border-r border-slate-800 font-bold text-emerald-400">TOTAL</th>
                      <th className="px-2 py-3 text-center border-r border-slate-800 text-slate-400 w-24">SISTEMA</th>
                      <th className="px-2 py-3 text-center border-r border-slate-800 font-bold">BATE</th>
                      <th className="px-2 py-3 text-center border-r border-slate-800 font-bold text-rose-500">PERDA</th>
                  </>
              ) : (
                  // Layout ESPECÍFICO para Setores/Bares
                  // CONTAGEM INICIAL | ENTRADAS | TRANSF. | DEVOLUÇÕES | PERDA | CONTAGEM (Final) | VENDA | SISTEMA | DIFERENÇA
                  <>
                      <th className="px-3 py-3 border-r border-slate-800 min-w-[200px]">PRODUTO</th>
                      <th className="px-2 py-3 text-center border-r border-slate-800 text-slate-400">CONTAGEM INICIAL</th>
                      <th className="px-2 py-3 text-center border-r border-slate-800 text-emerald-400">ENTRADAS</th>
                      <th className="px-2 py-3 text-center border-r border-slate-800 text-blue-400">TRANSF.</th>
                      <th className="px-2 py-3 text-center border-r border-slate-800 text-purple-400">DEVOLUÇÕES</th>
                      <th className="px-2 py-3 text-center border-r border-slate-800 text-rose-500 font-black border-2 border-rose-900/50">PERDA</th>
                      <th className="px-2 py-3 text-center border-r border-slate-800 bg-slate-800 text-yellow-400 border-x border-slate-700">CONTAGEM (FINAL)</th>
                      <th className="px-2 py-3 text-center border-r border-slate-800 text-orange-400">VENDA</th>
                      <th className="px-2 py-3 text-center border-r border-slate-800 text-slate-500 w-24">SISTEMA</th>
                      <th className="px-2 py-3 text-center border-r border-slate-800 font-bold">DIFERENÇA</th>
                  </>
              )}
              <th className="px-1 py-3 text-center w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
             {Object.entries(groupedItems).map(([category, rawItems]) => {
                const catItems = rawItems as FinancialItem[];
                const catColor = getCategoryColor(category);
                const allCatSelected = catItems.every(i => selectedIds.has(i.id));
                const colSpan = isCentral ? 9 : 11; 

                return (
                   <React.Fragment key={category}>
                      <tr className="bg-slate-900 border-y border-slate-800">
                         <td className="px-2 py-1.5 text-center bg-slate-800">
                            <input type="checkbox" checked={allCatSelected} onChange={e => handleSelectCategory(catItems, e.target.checked)} className="rounded bg-slate-700 border-slate-600" />
                         </td>
                         <td colSpan={colSpan} className="px-3 py-1.5 font-bold text-xs uppercase flex items-center gap-2" style={{ color: catColor }}>
                            <Layers size={12} /> {category}
                         </td>
                      </tr>
                      {catItems.map(item => {
                         // Check for low stock condition
                         const isLowStock = item.finalCount <= item.minStock;
                         const rowClass = `hover:bg-slate-800 transition-colors ${selectedIds.has(item.id) ? 'bg-indigo-900/20' : isLowStock ? 'bg-rose-900/10' : ''}`;
                         
                         return (
                           <tr key={item.id} className={rowClass}>
                              <td className="px-2 py-2 text-center border-r border-slate-800/50">
                                 <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="rounded bg-slate-800 border-slate-600" />
                              </td>

                              {isCentral ? (
                                  // RENDERIZAÇÃO ESTOQUE GERAL (CENTRAL)
                                  <>
                                      <td className="px-1 py-1 border-r border-slate-800/50">
                                         <div className="font-medium text-slate-200 px-2 truncate">{item.name}</div>
                                      </td>
                                      <td className="px-1 py-1 text-center border-r border-slate-800/50 text-slate-400">
                                         {(item.initialStock + item.inputs).toFixed(0)}
                                      </td>
                                      <td className="px-1 py-1 text-center border-x border-slate-700 bg-slate-800/30">
                                         <div className="relative flex items-center justify-center">
                                            <input 
                                                type="number" 
                                                value={item.finalCount || ''} 
                                                readOnly={true}
                                                className="w-full bg-transparent text-yellow-400 font-bold text-center outline-none placeholder:text-slate-700 cursor-not-allowed" 
                                                placeholder="0" 
                                            />
                                            <Lock size={10} className="text-yellow-400/50 absolute right-1" />
                                         </div>
                                      </td>
                                      <td className="px-1 py-1 text-center border-r border-slate-800/50 text-orange-400 font-medium bg-orange-900/10">
                                         <div className="flex items-center justify-center gap-1 cursor-not-allowed" title="Alimentado automaticamente pelos bares">
                                            {item.sales} <Lock size={10} className="opacity-50"/>
                                         </div>
                                      </td>
                                      <td className="px-1 py-1 text-right border-r border-slate-800/50 text-emerald-400 font-medium px-2">
                                         {item.revenue.toFixed(2)}
                                      </td>
                                      <td className="px-1 py-1 text-center border-r border-slate-800/50 text-slate-500">
                                         <div className="relative flex items-center justify-center">
                                            <input 
                                              type="number" 
                                              value={item.manualSystemStock !== undefined ? item.manualSystemStock : ''} 
                                              readOnly={true}
                                              className={`w-full bg-transparent text-center outline-none cursor-not-allowed ${item.manualSystemStock !== undefined ? 'text-indigo-400 font-bold' : 'text-slate-500 italic'}`}
                                              placeholder={item.autoTheoreticalStock.toFixed(0)} 
                                            />
                                            <Lock size={10} className="text-slate-500/50 absolute right-1" />
                                         </div>
                                      </td>
                                      <td className={`px-1 py-1 text-center border-r border-slate-800/50 font-bold ${item.difference === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                         {item.difference > 0 ? `+${item.difference}` : item.difference}
                                      </td>
                                      <td className="px-1 py-1 text-center border-r border-slate-800/50">
                                         <div className="relative flex items-center justify-center">
                                            <input 
                                                type="number" 
                                                value={item.losses || ''} 
                                                readOnly={true}
                                                className="w-full bg-transparent text-rose-500 text-center outline-none placeholder:text-slate-800 cursor-not-allowed" 
                                                placeholder="0" 
                                            />
                                            <Lock size={10} className="text-rose-500/50 absolute right-1" />
                                         </div>
                                      </td>
                                  </>
                              ) : (
                                  // RENDERIZAÇÃO BARES - Layout Solicitado
                                  <>
                                      {/* PRODUTO */}
                                      <td className="px-1 py-1 border-r border-slate-800/50">
                                         <div className="font-medium text-slate-200 px-2 truncate">{item.name}</div>
                                      </td>
                                      {/* CONTAGEM INICIAL */}
                                      <td className="px-1 py-1 text-center border-r border-slate-800/50 text-slate-500">
                                         <input type="number" value={item.initialStock || ''} onChange={e => handleNumChange(item.id, 'initialStock', e.target.value)} className="w-full bg-transparent text-slate-400 text-center outline-none placeholder:text-slate-800" placeholder="0" />
                                      </td>
                                      {/* ENTRADAS */}
                                      <td className="px-1 py-1 text-center border-r border-slate-800/50">
                                         <input type="number" value={item.inputs || ''} onChange={e => handleNumChange(item.id, 'inputs', e.target.value)} className="w-full bg-transparent text-emerald-400 text-center outline-none placeholder:text-slate-800" placeholder="0" />
                                      </td>
                                      {/* TRANSF. */}
                                      <td className="px-1 py-1 text-center border-r border-slate-800/50">
                                         <input type="number" value={item.transfersIn || ''} onChange={e => handleNumChange(item.id, 'transfersIn', e.target.value)} className="w-full bg-transparent text-blue-400 text-center outline-none placeholder:text-slate-800" placeholder="0" />
                                      </td>
                                      {/* DEVOLUÇÕES */}
                                      <td className="px-1 py-1 text-center border-r border-slate-800/50">
                                         <input type="number" value={item.returns || ''} onChange={e => handleNumChange(item.id, 'returns', e.target.value)} className="w-full bg-transparent text-purple-400 text-center outline-none placeholder:text-slate-800" placeholder="0" />
                                      </td>
                                      {/* PERDA */}
                                      <td className="px-1 py-1 text-center border-r border-slate-800/50 bg-rose-900/10 border-l border-rose-900/30">
                                         <input type="number" value={item.losses || ''} onChange={e => handleNumChange(item.id, 'losses', e.target.value)} className="w-full bg-transparent text-rose-500 font-black text-center outline-none placeholder:text-slate-800" placeholder="0" />
                                      </td>
                                      {/* CONTAGEM (FINAL) */}
                                      <td className="px-1 py-1 text-center border-x border-slate-700 bg-slate-800/30">
                                         <input type="number" value={item.finalCount || ''} onChange={e => handleNumChange(item.id, 'finalCount', e.target.value)} className="w-full bg-transparent text-yellow-400 font-bold text-center outline-none placeholder:text-slate-700" placeholder="0" />
                                      </td>
                                      {/* VENDA */}
                                      <td className="px-1 py-1 text-center border-r border-slate-800/50">
                                         <input type="number" value={item.sales || ''} onChange={e => handleNumChange(item.id, 'sales', e.target.value)} className="w-full bg-transparent text-orange-400 text-center outline-none placeholder:text-slate-800" placeholder="0" />
                                      </td>
                                      {/* SISTEMA (Editable Manual) */}
                                      <td className="px-1 py-1 text-center border-r border-slate-800/50">
                                         <input 
                                           type="number" 
                                           value={item.manualSystemStock !== undefined ? item.manualSystemStock : ''} 
                                           onChange={e => handleNumChange(item.id, 'manualSystemStock', e.target.value)} 
                                           className={`w-full bg-transparent text-center outline-none ${item.manualSystemStock !== undefined ? 'text-indigo-400 font-bold' : 'text-slate-500 italic'}`}
                                           placeholder={item.autoTheoreticalStock.toFixed(0)} 
                                         />
                                      </td>
                                      {/* DIFERENÇA */}
                                      <td className={`px-1 py-1 text-center border-r border-slate-800/50 font-bold ${item.difference === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                         {item.difference > 0 ? `+${item.difference}` : item.difference}
                                      </td>
                                  </>
                              )}
                              <td className="px-1 py-1 text-center">
                                 <button onClick={() => { if(window.confirm('Excluir?')) onDeleteItem(item.id) }} className="text-slate-700 hover:text-rose-500"><Trash2 size={12}/></button>
                              </td>
                           </tr>
                         );
                      })}
                   </React.Fragment>
                );
             })}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
           <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-white font-bold text-lg">Adicionar Produto</h3>
                 <button onClick={() => setIsAddModalOpen(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
              </div>
              
              {!isManagingCategories ? (
                <div className="space-y-3">
                    <input type="text" placeholder="Código (Opcional)" value={newItem.code} onChange={e => setNewItem({...newItem, code: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-indigo-500 outline-none" />
                    <input type="text" placeholder="Nome do Produto" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-indigo-500 outline-none" />
                    
                    <div className="flex gap-2">
                        {isCreatingCategory ? (
                            <input 
                                type="text" 
                                placeholder="Nome da Nova Categoria" 
                                value={newItem.category} 
                                onChange={e => setNewItem({...newItem, category: e.target.value})} 
                                className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-indigo-500 outline-none" 
                                autoFocus
                            />
                        ) : (
                            <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-indigo-500 outline-none">
                                {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        )}
                        <button 
                            onClick={() => {
                                setIsCreatingCategory(!isCreatingCategory);
                                if (!isCreatingCategory) setNewItem({...newItem, category: ''});
                                else setNewItem({...newItem, category: availableCategories[0] || ''});
                            }}
                            className={`border border-slate-700 rounded p-2 text-white transition-colors ${isCreatingCategory ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-800 hover:bg-slate-700'}`}
                            title={isCreatingCategory ? "Voltar para lista" : "Criar nova categoria"}
                        >
                            {isCreatingCategory ? <List size={18} /> : <Plus size={18} />}
                        </button>
                    </div>
                    {!isCreatingCategory && (
                        <div className="flex justify-end">
                            <button onClick={() => setIsManagingCategories(true)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                <Settings size={12} /> Gerenciar Categorias
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <input type="number" placeholder="Custo (R$)" value={newItem.costPrice} onChange={e => setNewItem({...newItem, costPrice: e.target.value})} className="bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-indigo-500 outline-none" />
                        <input type="number" placeholder="Preço Venda (R$)" value={newItem.sellPrice} onChange={e => setNewItem({...newItem, sellPrice: e.target.value})} className="bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-indigo-500 outline-none" />
                    </div>
                    
                    <button onClick={handleSaveNewItem} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded mt-2 transition-all shadow-lg shadow-emerald-900/20">Salvar Produto</button>
                </div>
              ) : (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2 cursor-pointer hover:text-white" onClick={() => setIsManagingCategories(false)}>
                        <ArrowLeft size={14} /> Voltar
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                        {availableCategories.map(cat => (
                            <div key={cat} className="flex items-center justify-between bg-slate-800 p-2 rounded border border-slate-700">
                                {editingCategory === cat ? (
                                    <div className="flex items-center gap-2 flex-1">
                                        <input 
                                            type="text" 
                                            value={editCategoryInputValue} 
                                            onChange={e => setEditCategoryInputValue(e.target.value)}
                                            className="bg-slate-950 text-white text-xs p-1 rounded border border-indigo-500 outline-none flex-1"
                                            autoFocus
                                        />
                                        <button onClick={saveCategoryRename} className="text-emerald-500 hover:text-emerald-400"><Check size={14}/></button>
                                        <button onClick={() => setEditingCategory(null)} className="text-rose-500 hover:text-rose-400"><X size={14}/></button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="text-sm text-slate-300 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: getCategoryColor(cat)}}></div>
                                            {cat}
                                        </span>
                                        <button onClick={() => startEditingCategory(cat)} className="text-slate-500 hover:text-indigo-400"><Edit3 size={14}/></button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};