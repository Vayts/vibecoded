import type { BarcodeLookupResponse } from '@acme/shared';
import { create } from 'zustand';

interface ScannerResultSheetState {
  result?: BarcodeLookupResponse;
}

interface ScannerResultSheetActions {
  reset: () => void;
}

const initialState: ScannerResultSheetState = {
  result: undefined,
};

export const useScannerResultSheetStore = create<
  ScannerResultSheetState & ScannerResultSheetActions
>((set) => ({
  ...initialState,
  reset: () => set(initialState),
}));