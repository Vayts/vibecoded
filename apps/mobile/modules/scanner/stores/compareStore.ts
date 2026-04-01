import type { ProductPreview } from '@acme/shared';
import { create } from 'zustand';

interface CompareState {
  isCompareMode: boolean;
  firstProduct: ProductPreview | null;
  secondProduct: ProductPreview | null;
}

interface CompareActions {
  startCompare: (product: ProductPreview) => void;
  setSecondProduct: (product: ProductPreview) => void;
  reset: () => void;
}

const initialState: CompareState = {
  isCompareMode: false,
  firstProduct: null,
  secondProduct: null,
};

export const useCompareStore = create<CompareState & CompareActions>((set) => ({
  ...initialState,
  startCompare: (product) =>
    set({ isCompareMode: true, firstProduct: product, secondProduct: null }),
  setSecondProduct: (product) => set({ secondProduct: product }),
  reset: () => set(initialState),
}));
