import type { BarcodeLookupResponse, PersonalAnalysisJob } from '@acme/shared';
import { create } from 'zustand';

interface ScannerResultSheetState {
  activeSessionId: number | null;
  isLoadingInitialResult: boolean;
  result?: BarcodeLookupResponse;
  resolvedPersonalResult?: PersonalAnalysisJob;
}

interface ScannerResultSheetActions {
  startSession: () => number;
  hydrateSession: (
    sessionId: number,
    payload: {
      result?: BarcodeLookupResponse;
      resolvedPersonalResult?: PersonalAnalysisJob;
    },
  ) => void;
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
): PersonalAnalysisJob | undefined => {
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
  hydrateSession: (sessionId, payload) =>
    set((state) => {
      if (state.activeSessionId !== sessionId) {
        return state;
      }

      return {
        ...state,
        isLoadingInitialResult: false,
        result: payload.result,
        resolvedPersonalResult:
          payload.resolvedPersonalResult ??
          (payload.result ? buildResolvedPersonalAnalysis(payload.result) : undefined),
      };
    }),
  reset: () => set(initialState),
}));
