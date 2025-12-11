
import React, { useMemo, useState } from 'react';
import { LocationData, Category } from '../types';
import { DollarSign, TrendingUp, TrendingDown, Package, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie } from 'recharts';

interface FinancialReportProps {
  locations: LocationData[];
}

interface AggregatedProduct {
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  totalFinalStock: number;
  totalStockValue: number;
  totalConsumption: number;
  totalCostOfMonth: number; // CMV
  totalDiscrepancyValue: number;
  locationsCount: number;
}

export const FinancialReport: React.FC<FinancialReportProps> = ({ locations }) => {
  const [sortField, setSortField] = useState<keyof AggregatedProduct>('totalCostOfMonth');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Aggregation Logic
  const { aggregatedItems, stats } = useMemo(() => {
    const productMap = new Map<string, AggregatedProduct>();
    
    let grandTotalStockValue = 0;
    let grandTotalCMV = 0;
    let grandTotalDiscrepancy = 0;

    locations.forEach(loc => {
      loc.items.forEach(item => {
        // Calculate derived metrics locally since they might not be stored
        // Consumption (Real Sales) = Initial + Inputs + TransIn - TransOut - Returns - Losses - Final
        const realConsumption = 
          (item.initialStock + item.inputs + item.transfersIn) - 
          (item.transfersOut + item.returns + item.losses + item.finalCount);
        
        // Theoretical Stock
        const theoretical = 
          item.initialStock + item.inputs + item.transfersIn - 
          item.transfersOut - item.returns - item.losses - item.sales;
        
        const diff = item.finalCount - theoretical;
        const diffValue = diff * item.costPrice;
        const stockValue = item.finalCount * item.costPrice;
        const costOfMonth = realConsumption * item.costPrice;

        if (productMap.has(item.name)) {
          const existing = productMap.get(item.name)!;
          existing.totalFinalStock += item.finalCount;
          existing.totalStockValue += stockValue;
          existing.totalConsumption += realConsumption;
          existing.totalCostOfMonth += costOfMonth;
          existing.totalDiscrepancyValue += diffValue;
          existing.locationsCount += 1;
        } else {
          productMap.set(item.name, {
            name: item.name,
            category: item.category,
            unit: item.unit,
            costPrice: item.costPrice,
            totalFinalStock: item.finalCount,
            totalStockValue: stockValue,
            totalConsumption: realConsumption,
            totalCostOfMonth: costOfMonth,
            totalDiscrepancyValue: diffValue,
            locationsCount: 1
          });
        }

        grandTotalStockValue += stockValue;
        grandTotalCMV += costOfMonth;
        grandTotalDiscrepancy += diffValue;
      });
    });

    return {
      aggregatedItems: Array.from(productMap.values()),
      stats: {
        grandTotalStockValue,
        grandTotalCMV,
        grandTotalDiscrepancy
      }
    };
  }, [locations]);

  // Sorting
  const sortedItems = useMemo(() => {
    return [...aggregatedItems].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      return sortDirection === 'asc' 
        ? (aValue as number) - (bValue as number) 
        : (bValue as number) - (aValue as number);
    });
  }, [aggregatedItems, sortField, sortDirection]);

  // Chart Data: Top 5 Categories by Cost
  const categoryChartData = useMemo(() => {
    const catMap: Record<string, number> = {};
    aggregatedItems.forEach(i => {
      catMap[i.category] = (catMap[i.category] || 0) + i.totalCostOfMonth;
    });
    return Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [aggregatedItems]);

  const handleSort = (field: keyof AggregatedProduct) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="text-emerald-400" />
            Painel Financeiro Consolidado
          </h2>
          <p className="text-slate-400 text-sm">Visão geral de todos os setores e bares</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Asset Value */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Package size={64} className="text-blue-500" />
          </div>
          <div className="flex items-center gap-3 text-slate-400 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <Package size={20} />
            </div>
            <span className="text-sm font-medium uppercase tracking-wider">Valor Total em Estoque</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            R$ {stats.grandTotalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500">Capital imobilizado em produtos</div>
        </div>

        {/* Cost of Month (CMV) */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingDown size={64} className="text-indigo-500" />
          </div>
          <div className="flex items-center gap-3 text-slate-400 mb-2">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
              <TrendingDown size={20} />
            </div>
            <span className="text-sm font-medium uppercase tracking-wider">Custo do Mês (CMV)</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            R$ {stats.grandTotalCMV.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500">Consumo real valorado (Saídas - Entradas)</div>
        </div>

        {/* Financial Discrepancy */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             {stats.grandTotalDiscrepancy >= 0 ? <ArrowUpRight size={64} className="text-emerald-500" /> : <ArrowDownRight size={64} className="text-rose-500" />}
          </div>
          <div className="flex items-center gap-3 text-slate-400 mb-2">
            <div className={`p-2 rounded-lg ${stats.grandTotalDiscrepancy >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              <DollarSign size={20} />
            </div>
            <span className="text-sm font-medium uppercase tracking-wider">Resultado da Sobra/Falta</span>
          </div>
          <div className={`text-3xl font-bold mb-1 ${stats.grandTotalDiscrepancy >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats.grandTotalDiscrepancy >= 0 ? '+' : ''} R$ {stats.grandTotalDiscrepancy.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500">Impacto financeiro das divergências de estoque</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table Section */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h3 className="font-bold text-white flex items-center gap-2">
              <PieChart size={18} className="text-slate-400" />
              Detalhamento por Produto
            </h3>
            <span className="text-xs text-slate-500">{sortedItems.length} produtos cadastrados</span>
          </div>
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-sm text-left text-slate-400">
              <thead className="text-xs text-slate-300 uppercase bg-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 cursor-pointer hover:bg-slate-700" onClick={() => handleSort('name')}>Produto</th>
                  <th className="px-4 py-3 text-center cursor-pointer hover:bg-slate-700" onClick={() => handleSort('totalFinalStock')}>Estoque Final</th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-700" onClick={() => handleSort('costPrice')}>Custo Unit.</th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-700 text-blue-400" onClick={() => handleSort('totalStockValue')}>Valor Estoque</th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-700 text-indigo-400" onClick={() => handleSort('totalCostOfMonth')}>Custo Mês</th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-700" onClick={() => handleSort('totalDiscrepancyValue')}>Divergência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sortedItems.map((item) => (
                  <tr key={item.name} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-200">
                      <div>{item.name}</div>
                      <div className="text-xs text-slate-500">{item.category} • {item.locationsCount} Locais</div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-300">
                      {item.totalFinalStock} <span className="text-xs text-slate-600">{item.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">
                      R$ {item.costPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-blue-400 font-medium">
                      R$ {item.totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-indigo-400 font-medium">
                      R$ {item.totalCostOfMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${item.totalDiscrepancyValue < 0 ? 'text-rose-500' : item.totalDiscrepancyValue > 0 ? 'text-emerald-500' : 'text-slate-600'}`}>
                      {item.totalDiscrepancyValue > 0 ? '+' : ''} R$ {Math.abs(item.totalDiscrepancyValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Section */}
        <div className="space-y-6">
           <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
             <h3 className="font-bold text-white mb-4">Custo por Categoria</h3>
             <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData.slice(0, 8)} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{fill: '#94a3b8', fontSize: 10}} interval={0} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Custo']}
                    />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]}>
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#818cf8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             </div>
           </div>

           <div className="bg-slate-800/50 border border-slate-800 p-6 rounded-xl">
              <h4 className="text-sm font-semibold text-slate-300 mb-2">Dica Financeira</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Produtos com alta "Divergência" (Sobra ou Falta) afetam diretamente o CMV. 
                Priorize a contagem dos itens no topo da lista ordenando pela última coluna.
              </p>
           </div>
        </div>

      </div>
    </div>
  );
};
