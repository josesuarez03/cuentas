import { create } from 'zustand';
import { addMonths, currentYearMonth, type YearMonth } from '@/lib/year-month';

interface MonthState {
  ym: YearMonth;
  shift: (n: number) => void;
  reset: () => void;
}

export const useMonthStore = create<MonthState>()((set) => ({
  ym: currentYearMonth(),
  shift: (n) => set((state) => ({ ym: addMonths(state.ym, n) })),
  reset: () => set({ ym: currentYearMonth() }),
}));
