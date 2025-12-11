
import React, { useMemo, useState } from 'react';
import { LocationData, PurchaseRecord } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  Store, 
  Receipt, 
  PiggyBank, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Filter
} from 'lucide-react';

interface GeneralDashboardProps {
  locations: LocationData[];
  purchases?: PurchaseRecord[];
}

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export const GeneralDashboard: React.FC<GeneralDashboardProps> = ({ locations, purchases = [] }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('JUL');
  const [metricMode, setMetricMode] = useState<'revenue' | 'qty' | 'purchased'>('revenue');

  // --- Real Calculation Logic ---
  const data = useMemo(() => {
    let totalRevenue = 0;
    let totalStockValue = 0;
    let totalPurchasedValue = 0;
    let totalCostOfGoodsSold = 0;
    let totalItemsStock = 0;
    
    // Purchase Stats (From Purchase Manager)
    const uniqueTickets = new Set(purchases.map(p => p.invoiceNumber)).size;
    totalPurchasedValue = purchases.reduce((acc, p) => acc + p.totalCost, 0);

    // Product Stats (From Inventory)
    const productStats: Record<string, { name: string; salesVal: number; qtySold: number }> = {};

    locations.forEach(loc => {
      loc.items.forEach(item => {
        // Revenue (Faturamento) = Sales * SellPrice
        const revenue = item.sales * item.sellPrice;
        // COGS = Sales * CostPrice
        const cogs = item.sales * item.costPrice;
        // Stock Value
        const stockVal = item.finalCount * item.costPrice;

        totalRevenue += revenue;
        totalCostOfGoodsSold += cogs;
        totalStockValue += stockVal;
        totalItemsStock += item.finalCount;

        // Aggregate for Top 10
        const normName = item.name.trim();
        if (!productStats[normName]) {
          productStats[normName] = { name: normName, salesVal: 0, qtySold: 0 };
        }
        productStats[normName].salesVal += revenue;
        productStats[normName].qtySold += item.sales;
      });
    });

    const profit = totalRevenue - totalCostOfGoodsSold;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    // Top 10 Products
    const topProducts = Object.values(productStats)
      .sort((a, b) => b.qtySold - a.qtySold)
      .slice(0, 10);

    return {
      totalRevenue,
      uniqueTickets,
      totalPurchasedValue,
      totalStockValue,
      totalItemsStock,
      profit,
      margin,
      topProducts
    };
  }, [locations, purchases]);

  // Mock Data for "Timeline" charts (since we don't store history yet)
  const comparativeData = [
    { name: 'SEGUNDA', vendas: 0, compras: 0 },
    { name: 'TERÇA', vendas: 0, compras: 0 },
    { name: 'QUARTA', vendas: 0, compras: 0 },
    { name: 'QUINTA', vendas: 0, compras: 0 },
    { name: 'SEXTA', vendas: 0, compras: 0 },
    { name: 'SÁBADO', vendas: data.totalRevenue > 0 ? 4500 : 0, compras: data.totalPurchasedValue > 0 ? 3200 : 0 },
    { name: 'DOMINGO', vendas: 0, compras: 0 },
  ];

  const accumulatedData = MONTHS.map(m => ({
    name: m,
    value: m === selectedMonth ? data.totalRevenue : 0
  }));

  return (
    <div className="space-y-6 font-sans">
      
      {/* HEADER BAR */}
      <div className="bg-[#ea580c] rounded-xl shadow-lg p-4 text-white flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black uppercase tracking-tight">RESULTADOS - {selectedMonth}/2025</h1>
        </div>
        
        {/* Month Selector */}
        <div className="flex gap-1 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {MONTHS.map(month => (
            <button 
              key={month}
              onClick={() => setSelectedMonth(month)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                selectedMonth === month 
                  ? 'bg-white text-[#ea580c] shadow-md transform scale-105' 
                  : 'text-orange-100 hover:bg-orange-700/50'
              }`}
            >
              {month}
            </button>
          ))}
        </div>

        {/* Toggles */}
        <div className="flex bg-orange-700/50 rounded-lg p-1">
          <button 
            onClick={() => setMetricMode('revenue')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${metricMode === 'revenue' ? 'bg-white text-[#ea580c] shadow' : 'text-orange-100'}`}
          >
            FATURAMENTO
          </button>
          <button 
            onClick={() => setMetricMode('qty')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${metricMode === 'qty' ? 'bg-white text-[#ea580c] shadow' : 'text-orange-100'}`}
          >
            QNT VENDIDA
          </button>
          <button 
             onClick={() => setMetricMode('purchased')}
             className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${metricMode === 'purchased' ? 'bg-white text-[#ea580c] shadow' : 'text-orange-100'}`}
          >
            TOTAL COMPRADO
          </button>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Faturamento */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 relative overflow-hidden group">
           <div className="flex justify-between items-start">
              <Store size={40} className="text-[#ea580c]" />
              <div className="text-right">
                <div className="text-xs text-slate-500 font-bold uppercase">Faturamento</div>
                <div className="text-2xl font-black text-slate-800">
                   R$ {data.totalRevenue.toLocaleString('pt-BR', { notation: 'compact' })}
                </div>
              </div>
           </div>
           <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600">
              <TrendingUp size={14} /> JAN #DIV/0!
           </div>
        </div>

        {/* Card 2: Tickets/Ordens */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 relative overflow-hidden group">
           <div className="flex justify-between items-start">
              <Receipt size={40} className="text-[#ea580c]" />
              <div className="text-right">
                <div className="text-xs text-slate-500 font-bold uppercase">Ordens Únicas</div>
                <div className="text-2xl font-black text-slate-800">
                   {data.uniqueTickets}
                </div>
              </div>
           </div>
           <div className="mt-4 flex justify-between text-[10px] text-slate-400 font-medium uppercase tracking-widest">
              {MONTHS.slice(0, 8).map(m => <span key={m}>{m.charAt(0)}</span>)}
           </div>
        </div>

        {/* Card 3: Total Comprado */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 relative overflow-hidden group">
           <div className="flex justify-between items-start">
              <PiggyBank size={40} className="text-[#ea580c]" />
              <div className="text-right">
                <div className="text-xs text-slate-500 font-bold uppercase">Total Comprado</div>
                <div className="text-2xl font-black text-slate-800">
                   R$ {data.totalPurchasedValue.toLocaleString('pt-BR', { notation: 'compact' })}
                </div>
              </div>
           </div>
           <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600">
              <TrendingUp size={14} /> vs Mês Anterior
           </div>
        </div>

        {/* Card 4: Saldo Estoque */}
        <div className="bg-[#ea580c] rounded-xl p-4 shadow-lg text-white relative overflow-hidden">
           <div className="flex justify-between items-start relative z-10">
              <div>
                 <div className="text-xs font-bold uppercase opacity-90">Saldo em Estoque</div>
                 <div className="text-3xl font-black mt-1">
                    {data.totalItemsStock} <span className="text-sm font-medium opacity-80">itens</span>
                 </div>
                 <div className="text-sm font-bold mt-1 opacity-90">
                    ~R$ {data.totalStockValue.toLocaleString('pt-BR', { notation: 'compact' })}
                 </div>
                 <div className="text-[10px] uppercase opacity-75 mt-1">Valor Médio em Estoque</div>
              </div>
              <div className="text-4xl font-black opacity-20 absolute right-0 bottom-0">
                 {new Date().getDate()}
              </div>
           </div>
           {/* Decorative Chart Line */}
           <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={[{v:0}, {v:5}, {v:3}, {v:8}, {v:10}]}>
                    <Area type="monotone" dataKey="v" stroke="#fff" fill="#fff" />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Card 5: Lucro */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 relative overflow-hidden group">
           <div className="flex justify-between items-start">
              <div>
                 <div className="text-xs text-[#ea580c] font-bold uppercase">Lucro Líquido</div>
                 <div className={`text-2xl font-black ${data.profit >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                    R$ {data.profit.toLocaleString('pt-BR', { notation: 'compact' })}
                 </div>
              </div>
           </div>
           <div className="mt-4 text-right">
              <div className={`text-sm font-black ${data.margin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                 Margem {data.margin.toFixed(1)}%
              </div>
           </div>
           <div className="absolute bottom-0 left-0 right-0 h-10 opacity-20">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={[{v:10}, {v:5}, {v:8}, {v:3}]}>
                    <Area type="monotone" dataKey="v" stroke={data.profit >= 0 ? "#10b981" : "#e11d48"} fill="none" strokeWidth={3} />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* CHART 1: TOP 10 PRODUCTS */}
         <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
            <h3 className="text-[#ea580c] font-black uppercase text-sm mb-4">10 Produtos Mais Vendidos</h3>
            <div className="flex-1 w-full overflow-hidden">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={data.topProducts} margin={{ left: 10, right: 30 }}>
                     <XAxis type="number" hide />
                     <YAxis dataKey="name" type="category" width={110} tick={{fontSize: 10, fontWeight: 700, fill: '#334155'}} interval={0} />
                     <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value: number) => [value, 'Qtd Vendida']}
                     />
                     <Bar dataKey="qtySold" fill="#ea580c" radius={[0, 4, 4, 0]} barSize={20}>
                        {data.topProducts.map((_, index) => (
                           <Cell key={`cell-${index}`} fill={index < 3 ? '#ea580c' : '#fdba74'} />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* CHART 2: COMPARATIVE QUANTITY */}
         <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
            <h3 className="text-[#ea580c] font-black uppercase text-sm mb-1">Comparativo Quantidade</h3>
            <p className="text-xs text-slate-500 font-bold mb-4">Compras vs Vendas por dia da semana</p>
            <div className="flex-1 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparativeData} margin={{ top: 20 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: 700}} axisLine={false} tickLine={false} />
                     <Tooltip />
                     <Bar dataKey="vendas" fill="#312e81" name="Venda Total" radius={[4, 4, 0, 0]} />
                     <Bar dataKey="compras" fill="#ea580c" name="Compra Total" radius={[4, 4, 0, 0]} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
               <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                  <div className="w-2 h-2 bg-indigo-900 rounded-sm"></div> VENDA TOTAL
               </div>
               <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                  <div className="w-2 h-2 bg-[#ea580c] rounded-sm"></div> COMPRA TOTAL
               </div>
            </div>
         </div>

         {/* CHART 3: TOTALS ACCUMULATED */}
         <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
            <h3 className="text-[#ea580c] font-black uppercase text-sm mb-4">Totais Acumulados por Mês</h3>
            <div className="flex-1 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={accumulatedData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: 700}} axisLine={false} tickLine={false} />
                     <Tooltip />
                     <Area type="monotone" dataKey="value" stroke="#ea580c" fill="#ffedd5" strokeWidth={3} />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

      </div>

    </div>
  );
};
