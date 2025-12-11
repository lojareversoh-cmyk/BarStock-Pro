
import { Category, LocationData } from './types';

const generateItems = (prefix: string) => [
  { id: `${prefix}_c1`, code: '1001', name: 'Coca-Cola Lata', category: Category.SODA, unit: 'un', costPrice: 2.50, sellPrice: 6.00, minStock: 20, initialStock: 50, inputs: 0, transfersIn: 0, transfersOut: 0, returns: 0, losses: 0, sales: 0, finalCount: 50, manualSystemStock: undefined, auditNotes: '' },
  { id: `${prefix}_c2`, code: '1002', name: 'Red Bull', category: Category.ENERGY, unit: 'un', costPrice: 6.00, sellPrice: 15.00, minStock: 10, initialStock: 24, inputs: 0, transfersIn: 0, transfersOut: 0, returns: 0, losses: 0, sales: 0, finalCount: 24, manualSystemStock: undefined, auditNotes: '' },
  { id: `${prefix}_c3`, code: '1003', name: 'Heineken LN', category: Category.BEER, unit: 'un', costPrice: 4.50, sellPrice: 12.00, minStock: 48, initialStock: 100, inputs: 0, transfersIn: 0, transfersOut: 0, returns: 0, losses: 0, sales: 0, finalCount: 100, manualSystemStock: undefined, auditNotes: '' },
  { id: `${prefix}_c4`, code: '2001', name: 'Absolut Vodka', category: Category.SPIRITS, unit: 'gf', costPrice: 60.00, sellPrice: 150.00, minStock: 2, initialStock: 5, inputs: 0, transfersIn: 0, transfersOut: 0, returns: 0, losses: 0, sales: 0, finalCount: 5, manualSystemStock: undefined, auditNotes: '' },
  { id: `${prefix}_c5`, code: '2005', name: 'Black Label', category: Category.WHISKY, unit: 'gf', costPrice: 120.00, sellPrice: 350.00, minStock: 2, initialStock: 3, inputs: 0, transfersIn: 0, transfersOut: 0, returns: 0, losses: 0, sales: 0, finalCount: 3, manualSystemStock: undefined, auditNotes: '' },
];

export const INITIAL_LOCATIONS: LocationData[] = [
  {
    id: 'central',
    name: 'Estoque Geral',
    items: [
      { id: 'cent_1', code: '1001', name: 'Coca-Cola Lata', category: Category.SODA, unit: 'cx', costPrice: 2.50, sellPrice: 6.00, minStock: 200, initialStock: 500, inputs: 100, transfersIn: 0, transfersOut: 0, returns: 0, losses: 0, sales: 0, finalCount: 548, manualSystemStock: undefined, auditNotes: '' },
      { id: 'cent_2', code: '3001', name: 'Heineken Barril 50L', category: Category.BEER, unit: 'br', costPrice: 450.00, sellPrice: 900.00, minStock: 5, initialStock: 20, inputs: 10, transfersIn: 0, transfersOut: 0, returns: 0, losses: 0, sales: 0, finalCount: 25, manualSystemStock: undefined, auditNotes: '' },
      { id: 'cent_3', code: '2010', name: 'Gin Tanqueray', category: Category.SPIRITS, unit: 'cx', costPrice: 85.00, sellPrice: 220.00, minStock: 5, initialStock: 10, inputs: 5, transfersIn: 0, transfersOut: 0, returns: 0, losses: 0, sales: 0, finalCount: 13, manualSystemStock: undefined, auditNotes: '' },
      { id: 'cent_4', code: '2001', name: 'Absolut Vodka', category: Category.SPIRITS, unit: 'gf', costPrice: 60.00, sellPrice: 150.00, minStock: 20, initialStock: 50, inputs: 10, transfersIn: 0, transfersOut: 0, returns: 0, losses: 0, sales: 0, finalCount: 60, manualSystemStock: undefined, auditNotes: '' },
      { id: 'cent_5', code: '1002', name: 'Red Bull', category: Category.ENERGY, unit: 'un', costPrice: 6.00, sellPrice: 15.00, minStock: 100, initialStock: 200, inputs: 50, transfersIn: 0, transfersOut: 0, returns: 0, losses: 0, sales: 0, finalCount: 250, manualSystemStock: undefined, auditNotes: '' },
    ]
  }
];

export const CATEGORY_COLORS: Record<Category, string> = {
  [Category.SODA]: '#3b82f6',
  [Category.ENERGY]: '#8b5cf6',
  [Category.BEER]: '#eab308',
  [Category.SPIRITS]: '#ec4899',
  [Category.WINE]: '#ef4444',
  [Category.WHISKY]: '#f97316',
  [Category.TEQUILA]: '#14b8a6',
  [Category.MISC]: '#64748b',
  [Category.FOOD]: '#84cc16',
};
