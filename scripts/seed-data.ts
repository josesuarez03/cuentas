// Rellena tus importes reales en euros. El script se niega a sembrar si queda algún 0.
// Piso sin gas = 602 €: Alquiler + Internet + Luz + Trastero deben sumar eso.
type AccountKey = 'principal' | 'ahorro' | 'trade' | 'revolut' | 'tarjeta';

export interface SeedItem {
  name: string;
  kind: 'income' | 'expense';
  category: string;
  account: AccountKey;
  euros: number;
  frequency: 'monthly' | 'bimonthly' | 'annual';
  startMonth?: string; // YYYY-MM; por defecto el mes actual. Gas: el mes del próximo recibo.
  anchorMonth?: number; // anuales: mes de cobro (1-12)
  paydayDay?: number;
}

export const seedData = {
  accounts: [
    { key: 'principal', name: 'BBVA principal', bank: 'BBVA', type: 'checking', savingsPercent: 0 },
    { key: 'ahorro', name: 'BBVA ahorro', bank: 'BBVA', type: 'savings', savingsPercent: 20 },
    { key: 'trade', name: 'Trade', bank: 'Trade Republic', type: 'investment', savingsPercent: 80 },
    { key: 'revolut', name: 'Revolut conjunta', bank: 'Revolut', type: 'joint', savingsPercent: 0 },
    { key: 'tarjeta', name: 'Tarjeta BBVA', bank: 'BBVA', type: 'credit_card', savingsPercent: 0 },
  ] as const,
  categories: [
    { name: 'Ingresos', kind: 'income' },
    { name: 'Piso', kind: 'expense' },
    { name: 'Comida', kind: 'expense' },
    { name: 'Suscripciones', kind: 'expense' },
    { name: 'Tarjeta', kind: 'expense' },
    { name: 'Otros', kind: 'expense' },
  ] as const,
  items: [
    { name: 'Nómina', kind: 'income', category: 'Ingresos', account: 'principal', euros: 1870, frequency: 'monthly', paydayDay: 27 },
    { name: 'Alquiler', kind: 'expense', category: 'Piso', account: 'principal', euros: 0, frequency: 'monthly' },
    { name: 'Internet', kind: 'expense', category: 'Piso', account: 'principal', euros: 0, frequency: 'monthly' },
    { name: 'Luz', kind: 'expense', category: 'Piso', account: 'principal', euros: 0, frequency: 'monthly' },
    { name: 'Trastero', kind: 'expense', category: 'Piso', account: 'principal', euros: 0, frequency: 'monthly' },
    { name: 'Gas', kind: 'expense', category: 'Piso', account: 'principal', euros: 28, frequency: 'bimonthly', startMonth: '' },
    { name: 'Aportación comida', kind: 'expense', category: 'Comida', account: 'revolut', euros: 150, frequency: 'monthly' },
    { name: 'Gym', kind: 'expense', category: 'Suscripciones', account: 'principal', euros: 0, frequency: 'monthly' },
    { name: 'Spotify', kind: 'expense', category: 'Suscripciones', account: 'principal', euros: 0, frequency: 'monthly' },
    { name: 'Prime', kind: 'expense', category: 'Suscripciones', account: 'principal', euros: 0, frequency: 'annual', anchorMonth: 0 },
    { name: 'Google One', kind: 'expense', category: 'Suscripciones', account: 'principal', euros: 0, frequency: 'annual', anchorMonth: 0 },
    { name: 'Abono transporte', kind: 'expense', category: 'Otros', account: 'principal', euros: 0, frequency: 'monthly' },
    { name: 'Corte de pelo', kind: 'expense', category: 'Otros', account: 'principal', euros: 0, frequency: 'monthly' },
    { name: 'Proteína en polvo', kind: 'expense', category: 'Otros', account: 'principal', euros: 0, frequency: 'monthly' },
  ] satisfies SeedItem[] as SeedItem[],
  pockets: [
    { name: 'Ocio', account: 'principal' as AccountKey, euros: 0 },
    { name: 'Compras', account: 'principal' as AccountKey, euros: 0 },
  ],
  funds: [{ name: 'Regalos', account: 'ahorro' as AccountKey, euros: 50 }],
};
