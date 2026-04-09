import type { AnalysisJobResponse, BarcodeLookupResponse } from '@acme/shared';
import { create } from 'zustand';

interface ScannerResultSheetState {
  activeSessionId: number | null;
  isLoadingInitialResult: boolean;
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
  isLoadingInitialResult: false,
  result: undefined,
  resolvedPersonalResult: undefined,
};

const buildResolvedPersonalAnalysis = (
  result: BarcodeLookupResponse,
): AnalysisJobResponse | undefined => {
  if (!result.success) {
    return undefined;
  }

  return result.personalAnalysis;
};

export const useScannerResultSheetStore = create<
  ScannerResultSheetState & ScannerResultSheetActions
>((set) => ({
  ...initialState,
  startSession: () => {
    const sessionId = Date.now();
    set({
      activeSessionId: sessionId,
      isLoadingInitialResult: true,
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
        isLoadingInitialResult: false,
        result,
        resolvedPersonalResult: buildResolvedPersonalAnalysis(result),
      };
    }),
  reset: () => set(initialState),
}));