import type { AnalysisJobResponse, BarcodeLookupResponse } from '@acme/shared';
import { create } from 'zustand';

interface ScannerResultSheetState {
  activeSessionId: number | null;
  result?: BarcodeLookupResponse;
  resolvedPersonalResult?: AnalysisJobResponse;
}

interface ScannerResultSheetActions {
  startSession: () => number;
  hydrateSession: (sessionId: number, result: BarcodeLookupResponse) => void;
  reset: () => void;
}

const initialState: ScannerResultSheetState = {
  activeSessionId: null,
  result: undefined,
  resolvedPersonalResult: undefined,
};

const buildPendingSocketAnalysis = (
  result: BarcodeLookupResponse,
): AnalysisJobResponse | undefined => {
  if (!result.success) {
    return undefined;
  }

  return {
    analysisId: result.personalAnalysis.analysisId,
    status: 'pending',
    productStatus: 'pending',
    ingredientsStatus: 'pending',
  };
};

export const useScannerResultSheetStore = create<
  ScannerResultSheetState & ScannerResultSheetActions
>((set) => ({
  ...initialState,
  startSession: () => {
    const sessionId = Date.now();
    set({
      activeSessionId: sessionId,
      result: undefined,
      resolvedPersonalResult: undefined,
    });

    return sessionId;
  },
  hydrateSession: (sessionId, result) =>
    set((state) => {
      if (state.activeSessionId !== sessionId) {
        return state;
      }

      return {
        ...state,
        result,
        resolvedPersonalResult: buildPendingSocketAnalysis(result),
      };
    }),
  reset: () => set(initialState),
}));