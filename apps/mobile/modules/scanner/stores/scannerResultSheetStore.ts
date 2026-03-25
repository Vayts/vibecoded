import type { BarcodeLookupResponse } from '@acme/shared';
import { create } from 'zustand';

import type { ScannerResultOrigin, ScannerResultPresentationMode } from '../types/scanner';

type ScannerResultSheetPhase = 'idle' | 'loading' | 'success' | 'error';

interface ScannerResultSheetState {
  phase: ScannerResultSheetPhase;
  result?: BarcodeLookupResponse;
  errorMessage: string | null;
  previewImageUri: string | null;
  presentationMode: ScannerResultPresentationMode;
  origin: ScannerResultOrigin | null;
}

interface ScannerResultSheetActions {
  showPhotoLoading: (previewImageUri: string | null) => void;
  showPhotoResult: (result: BarcodeLookupResponse) => void;
  showPhotoError: (message: string) => void;
  reset: () => void;
}

const initialState: ScannerResultSheetState = {
  phase: 'idle',
  result: undefined,
  errorMessage: null,
  previewImageUri: null,
  presentationMode: 'personalOnly',
  origin: null,
};

export const useScannerResultSheetStore = create<
  ScannerResultSheetState & ScannerResultSheetActions
>((set) => ({
  ...initialState,

  showPhotoLoading: (previewImageUri) =>
    set({
      phase: 'loading',
      result: undefined,
      errorMessage: null,
      previewImageUri,
      presentationMode: 'personalOnly',
      origin: 'photo',
    }),

  showPhotoResult: (result) =>
    set((state) => ({
      ...state,
      phase: 'success',
      result,
      errorMessage: null,
    })),

  showPhotoError: (message) =>
    set((state) => ({
      ...state,
      phase: 'error',
      result: undefined,
      errorMessage: message,
    })),

  reset: () => set(initialState),
}));