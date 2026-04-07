import type { ProductPreview } from '@acme/shared';
import { create } from 'zustand';
import type { PhotoOcrData } from '../types/scanner';

interface CompareState {
  isCompareMode: boolean;
  firstProduct: ProductPreview | null;
  firstProductImageBase64: string | null;
  firstProductOcr: PhotoOcrData | null;
  secondProduct: ProductPreview | null;
}

interface CompareActions {
  startCompare: (product: ProductPreview, imageBase64?: string, photoOcr?: PhotoOcrData) => void;
  setSecondProduct: (product: ProductPreview) => void;
  reset: () => void;
}

const initialState: CompareState = {
  isCompareMode: false,
  firstProduct: null,
  firstProductImageBase64: null,
  firstProductOcr: null,
  secondProduct: null,
};

export const useCompareStore = create<CompareState & CompareActions>((set) => ({
  ...initialState,
  startCompare: (product, imageBase64, photoOcr) =>
    set({
      isCompareMode: true,
      firstProduct: product,
      secondProduct: null,
      firstProductImageBase64: imageBase64 ?? null,
      firstProductOcr: photoOcr ?? null,
    }),
  setSecondProduct: (product) => set({ secondProduct: product }),
  reset: () => set(initialState),
}));
