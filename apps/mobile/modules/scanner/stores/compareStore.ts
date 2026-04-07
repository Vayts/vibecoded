import type { ProductPreview } from '@acme/shared';
import { create } from 'zustand';

interface CompareState {
  isCompareMode: boolean;
  firstProduct: ProductPreview | null;
  firstProductImageBase64: string | null;
  secondProduct: ProductPreview | null;
}

interface CompareActions {
  startCompare: (product: ProductPreview, imageBase64?: string) => void;
  setSecondProduct: (product: ProductPreview) => void;
  reset: () => void;
}

const initialState: CompareState = {
  isCompareMode: false,
  firstProduct: null,
  firstProductImageBase64: null,
  secondProduct: null,
};

export const useCompareStore = create<CompareState & CompareActions>((set) => ({
  ...initialState,
  startCompare: (product, imageBase64) =>
    set({ isCompareMode: true, firstProduct: product, secondProduct: null, firstProductImageBase64: imageBase64 ?? null }),
  setSecondProduct: (product) => set({ secondProduct: product }),
  reset: () => set(initialState),
}));
