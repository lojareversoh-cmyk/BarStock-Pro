
export enum Category {
  SODA = 'Refrigerante',
  ENERGY = 'Energético',
  BEER = 'Cerveja',
  SPIRITS = 'Destilados',
  WINE = 'Vinho/Espumante',
  WHISKY = 'Whisky',
  TEQUILA = 'Tequila',
  MISC = 'Outros',
  FOOD = 'Alimentos'
}

export interface InventoryItem {
  id: string;
  code: string; // CODIGO
  name: string; // PRODUTO
  category: string; 
  unit: string;
  costPrice: number; // CUSTO MÉDIO
  sellPrice: number; // PREÇO MÉDIO DE VENDA
  minStock: number; // ESTOQUE MÍNIMO
  
  // Data Entry Fields
  initialStock: number;
  inputs: number; // QNT ENTRADA
  transfersIn: number;
  transfersOut: number;
  returns: number; 
  losses: number; 
  sales: number; // QNT SAIDA (For Central, this is aggregated from bars)
  finalCount: number; // SALDO
  
  // Manual Override for System Stock
  manualSystemStock?: number;

  // Audit
  auditNotes?: string;
}

export interface CalculatedItem extends InventoryItem {
  theoreticalStock: number;
  difference: number;
  financialDifference: number;
}

export interface LocationData {
  id: string;
  name: string;
  items: InventoryItem[];
}

export interface DetailedReportItem {
  productName: string;
  issue: string;
  actionRequired: string;
}

export interface CategoryAnalysis {
  category: string;
  status: 'OK' | 'Review' | 'Critical';
  comment: string;
}

export interface AnalysisResult {
  consolidatedAudit: string; 
  categoryAnalysis: CategoryAnalysis[]; 
  detailedReport: DetailedReportItem[]; 
  financialRiskScore: 'Low' | 'Medium' | 'High';
}

export interface PurchaseRecord {
  id: string;
  date: string;
  productName: string;
  invoiceNumber: string;
  totalCost: number;
  unitCost: number;
  quantity: number;
  supplier: string;
  paymentDate: string;
  category?: string;
}
