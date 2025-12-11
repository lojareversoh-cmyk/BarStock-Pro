import React from 'react';
import { AnalysisResult } from '../types';
import { ClipboardCheck, AlertTriangle, CheckCircle2, XCircle, TrendingDown, X, FileText } from 'lucide-react';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  result: AnalysisResult | null;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, isLoading, result }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-start sticky top-0 bg-slate-900 z-10">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="bg-indigo-500/20 text-indigo-400 p-2 rounded-lg">
                <ClipboardCheck size={24} />
              </div>
              Relatório de Auditoria
            </h2>
            <p className="text-slate-400 text-sm mt-1">Análise gerada via Google Gemini 2.5</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-500/30 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
              </div>
              <p className="text-slate-300 animate-pulse text-lg font-medium">Processando auditoria de estoque...</p>
              <p className="text-slate-500 text-sm">Analisando entradas, saídas e divergências.</p>
            </div>
          ) : result ? (
            <div className="space-y-8 animate-in fade-in duration-500">
              
              {/* 1. Executive Summary */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText size={20} className="text-blue-400" />
                    1. Consolidado da Auditoria
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    result.financialRiskScore === 'High' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    result.financialRiskScore === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    Risco: {result.financialRiskScore}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed text-sm">
                  {result.consolidatedAudit}
                </p>
              </div>

              {/* 2. Category Analysis */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingDown size={20} className="text-purple-400" />
                  2. Análise por Categoria
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.categoryAnalysis.map((cat, idx) => (
                    <div key={idx} className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-200">{cat.category}</span>
                        {cat.status === 'OK' && <span className="text-emerald-400 flex items-center gap-1 text-xs font-bold"><CheckCircle2 size={14}/> OK</span>}
                        {cat.status === 'Review' && <span className="text-yellow-400 flex items-center gap-1 text-xs font-bold"><AlertTriangle size={14}/> REVISAR</span>}
                        {cat.status === 'Critical' && <span className="text-rose-400 flex items-center gap-1 text-xs font-bold"><XCircle size={14}/> CRÍTICO</span>}
                      </div>
                      <p className="text-xs text-slate-400">{cat.comment}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Detailed Report */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle size={20} className="text-rose-400" />
                  3. Relatório Detalhado (Divergências)
                </h3>
                <div className="overflow-hidden rounded-lg border border-slate-700">
                  <table className="w-full text-sm text-left text-slate-400">
                    <thead className="text-xs uppercase bg-slate-800 text-slate-300">
                      <tr>
                        <th className="px-4 py-3">Produto</th>
                        <th className="px-4 py-3">Problema Identificado</th>
                        <th className="px-4 py-3">Ação Recomendada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700 bg-slate-900/50">
                      {result.detailedReport.length > 0 ? (
                        result.detailedReport.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/50">
                            <td className="px-4 py-3 font-medium text-white">{item.productName}</td>
                            <td className="px-4 py-3 text-rose-300">{item.issue}</td>
                            <td className="px-4 py-3 text-indigo-300">{item.actionRequired}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                            Nenhuma divergência crítica encontrada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center text-slate-400 py-10">
              Nenhum dado disponível para análise.
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3 sticky bottom-0">
          <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white font-medium">
            Fechar
          </button>
          <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-lg shadow-indigo-900/20 flex items-center gap-2">
            <FileText size={18} />
            Imprimir Relatório
          </button>
        </div>
      </div>
    </div>
  );
};