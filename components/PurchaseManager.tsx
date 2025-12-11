
import React, { useState, useMemo } from 'react';
import { InventoryItem, PurchaseRecord } from '../types';
import { ShoppingCart, Plus, Calendar, FileText, DollarSign, Package, Truck, Search, ArrowRight, CreditCard } from 'lucide-react';

interface PurchaseManagerProps {
  centralItems: InventoryItem[];
  purchases: PurchaseRecord[];
  onAddPurchase: (purchase: PurchaseRecord) => void;
}

export const PurchaseManager: React.FC<PurchaseManagerProps> = ({ centralItems, purchases, onAddPurchase }) => {
  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    supplier: '',
    paymentDate: new Date().toISOString().split('T')[0],
    selectedProductId: '',
    quantity: '',
    unitCost: ''
  });

  // Calculate totals for dashboard
  const stats = useMemo(() => {
    const totalPurchases = purchases.reduce((acc, p) => acc + p.totalCost, 0);
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;

    const paymentsThisMonth = purchases.filter(p => {
      const d = new Date(p.paymentDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((acc, p) => acc + p.totalCost, 0);

    const paymentsNextMonth = purchases.filter(p => {
      const d = new Date(p.paymentDate);
      return d.getMonth() === nextMonth && d.getFullYear() === nextMonthYear;
    }).reduce((acc, p) => acc + p.totalCost, 0);

    return { totalPurchases, paymentsThisMonth, paymentsNextMonth };
  }, [purchases]);

  const selectedItemData = useMemo(() => {
    return centralItems.find(i => i.id === formData.selectedProductId);
  }, [formData.selectedProductId, centralItems]);

  const handleCostChange = (val: string) => {
    setFormData({ ...formData, unitCost: val });
  };

  const handleQtyChange = (val: string) => {
    setFormData({ ...formData, quantity: val });
  };

  const calculateTotal = () => {
    const qty = parseFloat(formData.quantity) || 0;
    const cost = parseFloat(formData.unitCost) || 0;
    return qty * cost;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedItemData || !formData.invoiceNumber || !formData.quantity) {
      alert("Preencha os campos obrigatórios (Produto, Nota Fiscal, Qtde)");
      return;
    }

    const qty = parseFloat(formData.quantity);
    const cost = parseFloat(formData.unitCost);

    const newPurchase: PurchaseRecord = {
      id: `purch_${Date.now()}`,
      date: formData.date,
      invoiceNumber: formData.invoiceNumber,
      supplier: formData.supplier.toUpperCase(),
      paymentDate: formData.paymentDate,
      productName: selectedItemData.name,
      category: selectedItemData.category,
      quantity: qty,
      unitCost: cost,
      totalCost: qty * cost
    };

    onAddPurchase(newPurchase);

    // Reset only item fields to allow fast entry for same invoice
    setFormData(prev => ({
      ...prev,
      selectedProductId: '',
      quantity: '',
      unitCost: ''
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-white flex items-center gap-2">
             <ShoppingCart className="text-indigo-400" />
             Entrada de Notas & Compras
           </h2>
           <p className="text-slate-400 text-sm">Registre as notas fiscais para alimentar automaticamente o Estoque Central.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Input Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Form Card */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl">
             <h3 className="text-lg font-semibold text-white mb-4 border-b border-slate-800 pb-2">Lançamento de Nota Fiscal</h3>
             <form onSubmit={handleSubmit} className="space-y-4">
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400 uppercase">Data Compra</label>
                    <div className="relative">
                       <Calendar className="absolute left-3 top-2.5 text-slate-500" size={14} />
                       <input 
                         type="date" 
                         value={formData.date}
                         onChange={e => setFormData({...formData, date: e.target.value})}
                         className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-white text-sm focus:border-indigo-500 outline-none"
                       />
                    </div>
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-medium text-slate-400 uppercase">Nota Fiscal</label>
                     <div className="relative">
                        <FileText className="absolute left-3 top-2.5 text-slate-500" size={14} />
                        <input 
                          type="text" 
                          value={formData.invoiceNumber}
                          onChange={e => setFormData({...formData, invoiceNumber: e.target.value})}
                          placeholder="Nº 123456"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-white text-sm focus:border-indigo-500 outline-none"
                        />
                     </div>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                     <label className="text-xs font-medium text-slate-400 uppercase">Fornecedor</label>
                     <div className="relative">
                        <Truck className="absolute left-3 top-2.5 text-slate-500" size={14} />
                        <input 
                          type="text" 
                          value={formData.supplier}
                          onChange={e => setFormData({...formData, supplier: e.target.value})}
                          placeholder="EX: ATACADÃO, FRIGO..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-white text-sm focus:border-indigo-500 outline-none"
                        />
                     </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                   <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-400 uppercase">Selecione o Produto</label>
                      <div className="relative">
                         <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
                         <select 
                            value={formData.selectedProductId}
                            onChange={e => {
                               const item = centralItems.find(i => i.id === e.target.value);
                               setFormData({
                                   ...formData, 
                                   selectedProductId: e.target.value,
                                   unitCost: item ? item.costPrice.toString() : ''
                               });
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-white text-sm focus:border-indigo-500 outline-none appearance-none cursor-pointer"
                         >
                            <option value="">-- Selecione do Estoque Central --</option>
                            {centralItems.map(item => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                         </select>
                      </div>
                   </div>
                   <div className="space-y-1">
                     <label className="text-xs font-medium text-slate-400 uppercase">Data Pagamento</label>
                     <div className="relative">
                        <CreditCard className="absolute left-3 top-2.5 text-slate-500" size={14} />
                        <input 
                          type="date" 
                          value={formData.paymentDate}
                          onChange={e => setFormData({...formData, paymentDate: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-white text-sm focus:border-indigo-500 outline-none"
                        />
                     </div>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-400 uppercase">Quantidade</label>
                        <input 
                            type="number" 
                            value={formData.quantity}
                            onChange={e => handleQtyChange(e.target.value)}
                            placeholder="0"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm focus:border-emerald-500 outline-none font-bold"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-400 uppercase">Custo Unit. (R$)</label>
                        <input 
                            type="number" 
                            step="0.01"
                            value={formData.unitCost}
                            onChange={e => handleCostChange(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm focus:border-indigo-500 outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-400 uppercase">Custo Total</label>
                        <div className="w-full bg-slate-800/80 border border-slate-700 rounded-lg py-2 px-3 text-emerald-400 text-sm font-bold flex items-center">
                            R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                <div className="pt-2">
                    <button 
                       type="submit"
                       className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.98]"
                    >
                        <Plus size={18} />
                        Lançar Nota e Alimentar Estoque
                    </button>
                    <p className="text-xs text-center text-slate-500 mt-2">
                        Ao lançar, a quantidade será somada às ENTRADAS do Estoque Central e o Custo Unitário será atualizado em todos os setores.
                    </p>
                </div>
             </form>
          </div>

          {/* History Table */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
             <div className="p-4 bg-slate-800 border-b border-slate-700 font-bold text-white flex justify-between">
                <span>Histórico de Compras</span>
                <span className="text-xs font-normal text-slate-400 bg-slate-700 px-2 py-1 rounded">{purchases.length} registros</span>
             </div>
             <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left text-slate-400">
                    <thead className="text-xs uppercase bg-slate-950 text-slate-300">
                        <tr>
                            <th className="px-4 py-3">Data</th>
                            <th className="px-4 py-3">Produto</th>
                            <th className="px-4 py-3">Nº Nota</th>
                            <th className="px-4 py-3 text-right">Custo Total</th>
                            <th className="px-4 py-3 text-right">Custo Unit.</th>
                            <th className="px-4 py-3 text-center">Qtde</th>
                            <th className="px-4 py-3">Fornecedor</th>
                            <th className="px-4 py-3">Pagamento</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {purchases.slice().reverse().map((purchase) => (
                            <tr key={purchase.id} className="hover:bg-slate-800/50">
                                <td className="px-4 py-3 text-slate-300">{new Date(purchase.date).toLocaleDateString('pt-BR')}</td>
                                <td className="px-4 py-3 font-medium text-white">{purchase.productName}</td>
                                <td className="px-4 py-3">{purchase.invoiceNumber}</td>
                                <td className="px-4 py-3 text-right font-bold text-emerald-400">R$ {purchase.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="px-4 py-3 text-right">R$ {purchase.unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="px-4 py-3 text-center font-bold text-indigo-400">{purchase.quantity}</td>
                                <td className="px-4 py-3 text-xs">{purchase.supplier}</td>
                                <td className="px-4 py-3 text-xs">{new Date(purchase.paymentDate).toLocaleDateString('pt-BR')}</td>
                            </tr>
                        ))}
                        {purchases.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-slate-600">Nenhuma compra registrada ainda.</td>
                            </tr>
                        )}
                    </tbody>
                 </table>
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Summary Dashboard */}
        <div className="space-y-6">
            
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
                <h4 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                    <FileText size={16} /> Resumo Financeiro
                </h4>
                
                <div className="space-y-6">
                    <div>
                        <div className="text-xs text-slate-500 mb-1">Valor Total Compras (Geral)</div>
                        <div className="text-3xl font-bold text-white">
                            R$ {stats.totalPurchases.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    <div className="h-px bg-slate-700 w-full"></div>

                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-400 uppercase">Pagamentos no Mês</span>
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">Atual</span>
                        </div>
                        <div className="text-xl font-bold text-emerald-400">
                             R$ {stats.paymentsThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                            1 a {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()} de {new Date().toLocaleString('pt-BR', { month: 'long' })}
                        </div>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <div className="flex items-center justify-between mb-1">
                             <span className="text-xs font-semibold text-slate-400 uppercase">Próximo Mês</span>
                             <span className="text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded">Futuro</span>
                        </div>
                        <div className="text-xl font-bold text-orange-400">
                             R$ {stats.paymentsNextMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                         <div className="text-[10px] text-slate-500 mt-1">
                            Previsão de caixa
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-indigo-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h4 className="font-bold text-lg mb-2">Automação de Estoque</h4>
                    <p className="text-sm text-indigo-100 leading-relaxed opacity-90">
                        Cada nota lançada aqui atualiza automaticamente:
                    </p>
                    <ul className="mt-3 space-y-2 text-xs font-medium">
                        <li className="flex items-center gap-2">
                            <div className="bg-white/20 p-1 rounded-full"><Package size={10} /></div>
                            Entradas no Estoque Central
                        </li>
                        <li className="flex items-center gap-2">
                            <div className="bg-white/20 p-1 rounded-full"><DollarSign size={10} /></div>
                            Custo Unitário Global
                        </li>
                    </ul>
                </div>
                <div className="absolute -bottom-4 -right-4 text-indigo-500 opacity-30">
                    <Package size={120} />
                </div>
            </div>

        </div>

      </div>
    </div>
  );
};
