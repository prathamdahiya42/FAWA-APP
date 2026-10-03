import { create } from 'zustand';
import type { PlanDay } from '@/src/types';

interface PlanState {
  planDays: PlanDay[];
  currentDayNumber: number;
  setPlan: (days: PlanDay[]) => void;
  updateDay: (dayId: string, updates: Partial<PlanDay>) => void;
  getCurrentDay: () => PlanDay | undefined;
  setCurrentDayNumber: (n: number) => void;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  planDays: [],
  currentDayNumber: 1,
  setPlan: (days) => set({ planDays: days }),
  updateDay: (dayId, updates) =>
    set((state) => ({
      planDays: state.planDays.map((d) =>
        d.id === dayId ? { ...d, ...updates } : d,
      ),
    })),
  getCurrentDay: () => {
    const { planDays, currentDayNumber } = get();
    return planDays.find((d) => d.dayNumber === currentDayNumber);
  },
  setCurrentDayNumber: (n) => set({ currentDayNumber: n }),
}));
