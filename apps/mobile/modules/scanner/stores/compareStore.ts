import type { ProductPreview } from '@acme/shared';
import { create } from 'zustand';
import type { PhotoOcrData } from '../types/scanner';

interface CompareState {
  isCompareMode: boolean;
  firstProduct: ProductPreview | null;
  firstProductPhotoUri: string | null;
  firstProductOcr: PhotoOcrData | null;
  secondProduct: ProductPreview | null;
}

interface CompareActions {
  startCompare: (product: ProductPreview, photoUri?: string, photoOcr?: PhotoOcrData) => void;
  setSecondProduct: (product: ProductPreview) => void;
  reset: () => void;
}

const initialState: CompareState = {
  isCompareMode: false,
  firstProduct: null,
  firstProductPhotoUri: null,
  firstProductOcr: null,
  secondProduct: null,
};

export const useCompareStore = create<CompareState & CompareActions>((set) => ({
  ...initialState,
  startCompare: (product, photoUri, photoOcr) =>
    set({
      isCompareMode: true,
      firstProduct: product,
      secondProduct: null,
      firstProductPhotoUri: photoUri ?? null,
      firstProductOcr: photoOcr ?? null,
    }),
  setSecondProduct: (product) => set({ secondProduct: product }),
  reset: () => set(initialState),
}));
