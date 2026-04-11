import type { ProductComparisonResult } from '@acme/shared';
import { create } from 'zustand';

interface ComparisonResultState {
  liveResult: ProductComparisonResult | null;
}

interface ComparisonResultActions {
  clearLiveResult: () => void;
  setLiveResult: (result: ProductComparisonResult) => void;
}

export const useComparisonResultStore = create<
  ComparisonResultState & ComparisonResultActions
>((set) => ({
  liveResult: null,
  clearLiveResult: () => set({ liveResult: null }),
  setLiveResult: (result) => set({ liveResult: result }),
}));