import React, { useState, useMemo } from 'react';
import { INITIAL_LOCATIONS } from './constants';
import { LocationData, InventoryItem, CalculatedItem, AnalysisResult, PurchaseRecord } from './types';
import { InventoryTable } from './components/InventoryTable';
import { AnalysisModal } from './components/AnalysisModal';
import { FinancialReport } from './components/FinancialReport';
import { IntegrationModal } from './components/IntegrationModal';
import { PurchaseManager } from './components/PurchaseManager';
import { GeneralDashboard } from './components/GeneralDashboard';
import { analyzeInventory } from './services/geminiService';
import { 
  LayoutDashboard, 
  Warehouse, 
  Beer, 
  Save, 
  Sparkles, 
  TrendingUp, 
  DollarSign,
  AlertOctagon,
  FileText,
  Settings,
  Plus,
  Trash2,
  X,
  Edit2,
  BarChart3,
  ShoppingCart,
  Activity,
  Lock,
  List
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function App() {
  const [viewMode, setViewMode] = useState<'inventory' | 'financial' | 'purchases' | 'dashboard'>('inventory');
  const [locations, setLocations] = useState<LocationData[]>(INITIAL_LOCATIONS);
  const [activeLocationId, setActiveLocationId] = useState<string>(INITIAL_LOCATIONS[0].id);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isIntegrationOpen, setIsIntegrationOpen] = useState(false);
  const [isLocationManagerOpen, setIsLocationManagerOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');

  const activeLocation = locations.find(l => l.id === activeLocationId) || locations[0];
  const isCentral = activeLocation.id === 'central' || activeLocation.name.toLowerCase().includes('central') || activeLocation.name.toLowerCase().includes('geral');
  
  const centralItems = useMemo(() => {
    return locations.find(l => l.id === 'central' || l.name.toLowerCase().includes('central') || l.name.toLowerCase().includes('geral'))?.items || [];
  }, [locations]);

  // Map demand (sales/transfers) from Bars to feed Central
  const barDemandMap = useMemo(() => {
    const demand: Record<string, number> = {};
    locations.forEach(loc => {
      if (loc.id === 'central' || loc.name.toLowerCase().includes('central') || loc.name.toLowerCase().includes('geral')) return;
      loc.items.forEach(item => {
        const normalizedName = item.name.trim().toLowerCase();
        demand[normalizedName] = (demand[normalizedName] || 0) + (item.transfersIn || 0);
      });
    });
    return demand;
  }, [locations]);

  // Helper to re-calculate Central Item based on all bars
  const syncCentralProduct = (productName: string, currentLocations: LocationData[]) => {
    const targetName = productName.trim().toLowerCase();
    
    // Aggregate fields from all bars
    const totals = {
      sales: 0,
      initialStock: 0,
      inputs: 0,
      transfersIn: 0,
      transfersOut: 0,
      returns: 0,
      losses: 0,
      finalCount: 0,
      manualSystemStock: 0
    };

    let foundManualStock = false;

    currentLocations.forEach(loc => {
      if (loc.id === 'central' || loc.name.toLowerCase().includes('central') || loc.name.toLowerCase().includes('geral')) return;
      const match = loc.items.find(i => i.name.trim().toLowerCase() === targetName);
      if (match) {
        totals.sales += (match.sales || 0);
        totals.initialStock += (match.initialStock || 0);
        totals.inputs += (match.inputs || 0);
        totals.transfersIn += (match.transfersIn || 0);
        totals.transfersOut += (match.transfersOut || 0);
        totals.returns += (match.returns || 0);
        totals.losses += (match.losses || 0);
        totals.finalCount += (match.finalCount || 0);
        if (match.manualSystemStock !== undefined) {
          totals.manualSystemStock += match.manualSystemStock;
          foundManualStock = true;
        }
      }
    });

    return currentLocations.map(loc => {
      if (loc.id === 'central' || loc.name.toLowerCase().includes('central') || loc.name.toLowerCase().includes('geral')) {
        return {
          ...loc,
          items: loc.items.map(i => {
            if (i.name.trim().toLowerCase() === targetName) {
              return { 
                ...i, 
                sales: totals.sales,
                initialStock: totals.initialStock,
                inputs: totals.inputs, // Note: Purchases usually feed Central Inputs directly, but here we aggregate bar inputs as requested
                transfersIn: totals.transfersIn,
                transfersOut: totals.transfersOut,
                returns: totals.returns,
                losses: totals.losses,
                finalCount: totals.finalCount,
                manualSystemStock: foundManualStock ? totals.manualSystemStock : undefined
              }; 
            }
            return i;
          })
        };
      }
      return loc;
    });
  };

  const updateItem = (itemId: string, field: keyof InventoryItem, value: string | number) => {
    setLocations(prevLocations => {
      const currentLoc = prevLocations.find(l => l.id === activeLocationId);
      if (!currentLoc) return prevLocations;
      
      const itemBeingEdited = currentLoc.items.find(i => i.id === itemId);
      if (!itemBeingEdited) return prevLocations;

      const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
      const productName = itemBeingEdited.name.trim();
      const isCentralContext = currentLoc.id === 'central' || currentLoc.name.toLowerCase().includes('central') || currentLoc.name.toLowerCase().includes('geral');

      // 1. Create next state for the current edit
      let nextLocations = prevLocations.map(loc => {
        if (loc.id !== activeLocationId) return loc;
        return {
          ...loc,
          items: loc.items.map(item => 
            item.id === itemId ? { ...item, [field]: value } : item
          )
        };
      });

      // 2. Propagate Cost & Sell Price changes from Central to All Bars
      if (isCentralContext && (field === 'costPrice' || field === 'sellPrice')) {
          nextLocations = nextLocations.map(loc => ({
            ...loc,
            items: loc.items.map(item => {
              if (item.name.trim().toLowerCase() === productName.toLowerCase()) {
                  return { ...item, [field]: numericValue };
              }
              return item;
            })
          }));
      }

      // 3. Auto-Feed Central Stock from Bars (Full Aggregation)
      if (!isCentralContext) {
          // Fields that should trigger aggregation to central
          const aggregatableFields = ['initialStock', 'inputs', 'transfersIn', 'transfersOut', 'returns', 'losses', 'sales', 'finalCount', 'manualSystemStock'];
          if (aggregatableFields.includes(field as string)) {
             nextLocations = syncCentralProduct(productName, nextLocations);
          }
      }

      return nextLocations;
    });
  };

  const handleBulkUpdate = (ids: string[], field: keyof InventoryItem, value: string | number) => {
    setLocations(prevLocations => {
      const currentLoc = prevLocations.find(l => l.id === activeLocationId);
      if (!currentLoc) return prevLocations;

      const isCentralContext = currentLoc.id === 'central' || currentLoc.name.toLowerCase().includes('central') || currentLoc.name.toLowerCase().includes('geral');
      const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value;

      let nextLocations = prevLocations.map(loc => {
        if (loc.id !== activeLocationId) return loc;
        return {
          ...loc,
          items: loc.items.map(item => 
            ids.includes(item.id) ? { ...item, [field]: value } : item
          )
        };
      });

      const updatedItemNames = currentLoc.items
        .filter(i => ids.includes(i.id))
        .map(i => i.name.trim().toLowerCase());

      if (isCentralContext && (field === 'costPrice' || field === 'sellPrice')) {
        const selectedNamesSet = new Set(updatedItemNames);
        nextLocations = nextLocations.map(loc => ({
            ...loc,
            items: loc.items.map(item => {
                if (selectedNamesSet.has(item.name.trim().toLowerCase())) {
                    return { ...item, [field]: numericValue };
                }
                return item;
            })
        }));
      }

      if (!isCentralContext) {
        // Aggregate for all affected products
        updatedItemNames.forEach(name => {
           nextLocations = syncCentralProduct(name, nextLocations);
        });
      }

      return nextLocations;
    });
  };

  const handleBulkDelete = (ids: string[]) => {
    setLocations(prevLocations => 
      prevLocations.map(loc => {
        if (loc.id !== activeLocationId) return loc;
        return {
          ...loc,
          items: loc.items.filter(item => !ids.includes(item.id))
        };
      })
    );
  };

  const handleAddItem = (newItem: InventoryItem) => {
    setLocations(prevLocations => 
      prevLocations.map(loc => {
        if (loc.id !== activeLocationId) return loc;
        return {
          ...loc,
          items: [...loc.items, newItem]
        };
      })
    );
  };

  const handleDeleteItem = (itemId: string) => {
    setLocations(prevLocations => 
      prevLocations.map(loc => {
        if (loc.id !== activeLocationId) return loc;
        return {
          ...loc,
          items: loc.items.filter(item => item.id !== itemId)
        };
      })
    );
  };

  const handleRenameCategory = (oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) return;
    setLocations(prevLocations => 
      prevLocations.map(loc => ({
        ...loc,
        items: loc.items.map(item => 
          item.category === oldName ? { ...item, category: newName.trim() } : item
        )
      }))
    );
  };

  const handleImportSales = (mappedSales: Record<string, number>) => {
    setLocations(prevLocations => {
      // 1. Update the sales in the current active location (Bar)
      let nextLocations = prevLocations.map(loc => {
        if (loc.id !== activeLocationId) return loc;
        return {
          ...loc,
          items: loc.items.map(item => {
            if (mappedSales[item.id] !== undefined) {
              return { ...item, sales: mappedSales[item.id] };
            }
            return item;
          })
        };
      });

      const currentLoc = prevLocations.find(l => l.id === activeLocationId);
      const isCentralContext = currentLoc?.id === 'central' || currentLoc?.name.toLowerCase().includes('central') || currentLoc?.name.toLowerCase().includes('geral');

      // 2. If we just imported sales into a Bar, we must aggregate and update Central
      if (!isCentralContext && currentLoc) {
         // Identify which products were touched
         const touchedProductNames = new Set<string>();
         currentLoc.items.forEach(item => {
             if (mappedSales[item.id] !== undefined) touchedProductNames.add(item.name.trim().toLowerCase());
         });

         // Sync all touched products
         touchedProductNames.forEach(name => {
            nextLocations = syncCentralProduct(name, nextLocations);
         });
      }

      return nextLocations;
    });
  };

  const handleAddPurchase = (purchase: PurchaseRecord) => {
    setPurchases(prev => [...prev, purchase]);
    setLocations(prevLocations => {
      return prevLocations.map(loc => {
        const isCentralLoc = loc.id === 'central' || loc.name.toLowerCase().includes('central') || loc.name.toLowerCase().includes('geral');
        if (isCentralLoc) {
             return {
                 ...loc,
                 items: loc.items.map(item => {
                     if (item.name === purchase.productName) {
                         return { 
                             ...item, 
                             inputs: (item.inputs || 0) + purchase.quantity, 
                             costPrice: purchase.unitCost 
                         };
                     }
                     return item;
                 })
             };
        }
        return {
            ...loc,
            items: loc.items.map(item => {
                if (item.name.trim().toLowerCase() === purchase.productName.trim().toLowerCase()) {
                    return { ...item, costPrice: purchase.unitCost };
                }
                return item;
            })
        };
      });
    });
    alert("Nota salva! O estoque geral foi alimentado e o custo atualizado.");
  };

  const handleSyncCentralOutputs = () => {
    // Legacy function, replaced by auto-sync
  };

  // --- LOCATION MANAGER LOGIC ---
  const handleAddLocation = () => {
    if (!newLocationName.trim()) return;
    const newId = `loc_${Date.now()}`;
    
    // Auto-populate with products from Central Stock to save time
    const centralLoc = locations.find(l => l.id === 'central' || l.name.toLowerCase().includes('central') || l.name.toLowerCase().includes('geral')) || locations[0];
    const initialItems = centralLoc ? centralLoc.items.map(item => ({
      ...item,
      id: `${newId}_${item.code}_${Math.random().toString(36).substr(2, 5)}`, // Generate new unique ID based on code
      // Copy static data
      code: item.code,
      name: item.name,
      category: item.category,
      unit: item.unit,
      costPrice: item.costPrice,
      sellPrice: item.sellPrice,
      minStock: item.minStock,
      // Zero dynamic data
      initialStock: 0,
      inputs: 0,
      transfersIn: 0,
      transfersOut: 0,
      returns: 0,
      losses: 0,
      sales: 0,
      finalCount: 0,
      auditNotes: ''
    })) : [];

    const newLoc: LocationData = { 
        id: newId, 
        name: newLocationName, 
        items: initialItems 
    };
    
    setLocations([...locations, newLoc]);
    setNewLocationName('');
    setActiveLocationId(newId); // Switch to the new location immediately
  };

  const handleUpdateLocationName = (id: string, name: string) => {
    setLocations(prevLocations => prevLocations.map(loc => loc.id === id ? { ...loc, name } : loc));
  };

  const handleDeleteLocation = (id: string) => {
    if (id === 'central') {
      alert("O Estoque Geral (Principal) não pode ser excluído.");
      return;
    }

    if (locations.length <= 1) {
      alert("É necessário manter pelo menos um setor ativo.");
      return;
    }

    if (window.confirm("Tem certeza que deseja excluir este setor? Todos os dados vinculados a ele serão perdidos permanentemente.")) {
      const nextLocations = locations.filter(l => l.id !== id);
      setLocations(nextLocations);
      
      // If we deleted the active location, switch to Central or the first available one
      if (activeLocationId === id) {
        const fallback = nextLocations.find(l => l.id === 'central') || nextLocations[0];
        if (fallback) setActiveLocationId(fallback.id);
      }
    }
  };
  // -----------------------------

  const calculatedStats = useMemo(() => {
    let totalStockValue = 0;
    let totalDiscrepancyValue = 0;
    let itemsWithDiscrepancy = 0;
    const items = activeLocation.items.map(item => {
      const theoretical = item.initialStock + item.inputs - item.sales; 
      const diff = item.finalCount - theoretical;
      const diffValue = diff * item.costPrice;
      totalStockValue += item.finalCount * item.costPrice;
      totalDiscrepancyValue += diffValue;
      if (Math.abs(diff) > 0.01) itemsWithDiscrepancy++;
      return { ...item, theoreticalStock: theoretical, difference: diff, financialDifference: diffValue } as CalculatedItem;
    });
    return { totalStockValue, totalDiscrepancyValue, itemsWithDiscrepancy, items };
  }, [activeLocation]);

  const handleRunAnalysis = async () => {
    setIsAnalysisOpen(true);
    setAnalysisLoading(true);
    try {
      const result = await analyzeInventory(activeLocation.name, calculatedStats.items);
      setAnalysisResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Top Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-lg"><Warehouse size={20} className="text-white" /></div>
                <span className="text-xl font-bold tracking-tight text-white hidden md:block">BarStock <span className="text-indigo-400">Pro</span></span>
              </div>
              <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 overflow-x-auto">
                <button onClick={() => setViewMode('dashboard')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'dashboard' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><Activity size={16} /> Dashboard</button>
                <button onClick={() => setViewMode('inventory')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'inventory' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><LayoutDashboard size={16} /> Estoque</button>
                <button onClick={() => setViewMode('financial')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'financial' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><DollarSign size={16} /> Financeiro</button>
                <button onClick={() => setViewMode('purchases')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'purchases' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><ShoppingCart size={16} /> Compras</button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {viewMode === 'inventory' && (
                <button onClick={handleRunAnalysis} className="hidden md:flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-indigo-900/20 active:scale-95"><Sparkles size={18} /> IA Audit</button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {viewMode === 'dashboard' ? (
          <GeneralDashboard locations={locations} purchases={purchases} />
        ) : viewMode === 'financial' ? (
          <FinancialReport locations={locations} />
        ) : viewMode === 'purchases' ? (
          <PurchaseManager centralItems={centralItems} purchases={purchases} onAddPurchase={handleAddPurchase} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 text-slate-400"><LayoutDashboard size={18} /><span className="text-sm font-medium">Setores e Bares</span></div>
                    <button onClick={() => setIsLocationManagerOpen(true)} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"><Settings size={14} /> Gerenciar</button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {locations.map(loc => (
                      <button key={loc.id} onClick={() => setActiveLocationId(loc.id)} className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all whitespace-nowrap ${activeLocationId === loc.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>{loc.name}</button>
                    ))}
                  </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Beer className="text-indigo-400" /> {activeLocation.name}</h2>
              </div>
              <InventoryTable 
                items={activeLocation.items} 
                onUpdateItem={updateItem} 
                onBulkUpdate={handleBulkUpdate}
                onBulkDelete={handleBulkDelete}
                onAddItem={handleAddItem}
                onDeleteItem={handleDeleteItem}
                onRenameCategory={handleRenameCategory}
                onOpenIntegration={() => setIsIntegrationOpen(true)}
                isCentral={isCentral}
                barDemandMap={barDemandMap}
                onSyncCentralOutputs={handleSyncCentralOutputs}
              />
            </div>
          </>
        )}
      </main>

      <AnalysisModal isOpen={isAnalysisOpen} onClose={() => setIsAnalysisOpen(false)} isLoading={analysisLoading} result={analysisResult} />
      <IntegrationModal isOpen={isIntegrationOpen} onClose={() => setIsIntegrationOpen(false)} items={activeLocation.items} onImport={handleImportSales} />
      
      {isLocationManagerOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Settings size={20} className="text-indigo-400" /> Gerenciar Setores</h3>
              <button onClick={() => setIsLocationManagerOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-b-lg mb-2">
                <p className="text-xs text-slate-400 mb-2">Dica: Novos setores serão criados copiando a lista de produtos do Estoque Geral.</p>
                <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newLocationName} 
                      onChange={(e) => setNewLocationName(e.target.value)} 
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddLocation(); }}
                      placeholder="Nome do novo setor (Ex: Bar 07)..." 
                      className="flex-1 bg-slate-950 border border-slate-600 rounded px-3 py-2 text-white outline-none text-sm focus:border-indigo-500" 
                    />
                    <button 
                      onClick={handleAddLocation} 
                      disabled={!newLocationName.trim()} 
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-1"
                    >
                      <Plus size={16} /> Criar
                    </button>
                </div>
            </div>
            <div className="p-4 max-h-[50vh] overflow-y-auto space-y-3">
              {locations.map((loc) => (
                <div key={loc.id} className="flex items-center gap-2 bg-slate-800 p-3 rounded border border-slate-700 group hover:border-slate-600 transition-colors">
                  <Edit2 size={16} className="text-slate-500" />
                  <input 
                    type="text" 
                    value={loc.name} 
                    onChange={(e) => handleUpdateLocationName(loc.id, e.target.value)} 
                    disabled={loc.id === 'central'}
                    className={`flex-1 bg-transparent border-none outline-none text-sm font-medium focus:ring-0 ${loc.id === 'central' ? 'text-slate-500 italic' : 'text-slate-200'}`} 
                  />
                  
                  {loc.id !== 'central' ? (
                      <>
                        <button
                          type="button"
                          className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded border border-slate-600 transition-all flex items-center gap-1 cursor-help"
                          title="Sequência: Contagem Inicial, Entradas, Transf, Devoluções, Perda, Contagem Final, Venda, Sistema, Diferença"
                        >
                            <List size={14} />
                        </button>
                        <button 
                            type="button" 
                            onClick={() => handleDeleteLocation(loc.id)} 
                            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 rounded text-xs font-bold transition-all flex items-center gap-1"
                            title="Excluir Setor"
                        >
                            <Trash2 size={14} /> Excluir
                        </button>
                      </>
                  ) : (
                      <span className="px-2 py-1 text-[10px] bg-slate-700 text-slate-400 rounded border border-slate-600 flex items-center gap-1 cursor-help" title="Setor Principal - Não pode ser excluído">
                        <Lock size={10} /> Principal
                      </span>
                  )}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end">
                <button onClick={() => setIsLocationManagerOpen(false)} className="px-4 py-2 text-slate-300 hover:text-white font-medium">Concluído</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;