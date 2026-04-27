import type { ProductPreview } from '@acme/shared';
import { create } from 'zustand';
import type { PhotoOcrData } from '../types/scanner';

type CompareSessionSource = 'scanner' | 'compare-picker' | null;

interface CompareState {
  compareSessionSource: CompareSessionSource;
  isCompareMode: boolean;
  firstProduct: ProductPreview | null;
  firstProductPhotoUri: string | null;
  firstProductOcr: PhotoOcrData | null;
  secondProduct: ProductPreview | null;
}

interface StartCompareOptions {
  photoOcr?: PhotoOcrData;
  photoUri?: string;
  source?: Exclude<CompareSessionSource, null>;
}

interface CompareActions {
  startCompare: (product: ProductPreview, options?: StartCompareOptions) => void;
  setSecondProduct: (product: ProductPreview) => void;
  reset: () => void;
}

const initialState: CompareState = {
  compareSessionSource: null,
  isCompareMode: false,
  firstProduct: null,
  firstProductPhotoUri: null,
  firstProductOcr: null,
  secondProduct: null,
};

export const useCompareStore = create<CompareState & CompareActions>((set) => ({
  ...initialState,
  startCompare: (product, options) =>
    set({
      compareSessionSource: options?.source ?? 'scanner',
      isCompareMode: true,
      firstProduct: product,
      secondProduct: null,
      firstProductPhotoUri: options?.photoUri ?? null,
      firstProductOcr: options?.photoOcr ?? null,
    }),
  setSecondProduct: (product) => set({ secondProduct: product }),
  reset: () => set(initialState),
}));
