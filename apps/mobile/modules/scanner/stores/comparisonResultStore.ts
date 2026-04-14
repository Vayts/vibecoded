import type { ProductComparisonResult } from '@acme/shared';
import { create } from 'zustand';

export type LiveComparisonStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ComparisonResultState {
  liveResult: ProductComparisonResult | null;
  liveErrorMessage: string | null;
  liveRequestId: number;
  liveStatus: LiveComparisonStatus;
}

interface ComparisonResultActions {
  beginLiveComparison: () => number;
  clearLiveResult: () => void;
  failLiveComparison: (requestId: number, errorMessage: string) => void;
  resolveLiveComparison: (requestId: number, result: ProductComparisonResult) => void;
  setLiveResult: (result: ProductComparisonResult) => void;
}

export const useComparisonResultStore = create<
  ComparisonResultState & ComparisonResultActions
>((set, get) => ({
  liveResult: null,
  liveErrorMessage: null,
  liveRequestId: 0,
  liveStatus: 'idle',
  beginLiveComparison: () => {
    const nextRequestId = get().liveRequestId + 1;
    set({
      liveResult: null,
      liveErrorMessage: null,
      liveRequestId: nextRequestId,
      liveStatus: 'loading',
    });
    return nextRequestId;
  },
  clearLiveResult: () =>
    set((state) => ({
      liveResult: null,
      liveErrorMessage: null,
      liveRequestId: state.liveRequestId + 1,
      liveStatus: 'idle',
    })),
  failLiveComparison: (requestId, errorMessage) =>
    set((state) =>
      state.liveRequestId !== requestId
        ? state
        : {
            liveResult: null,
            liveErrorMessage: errorMessage,
            liveRequestId: requestId,
            liveStatus: 'error',
          },
    ),
  resolveLiveComparison: (requestId, result) =>
    set((state) =>
      state.liveRequestId !== requestId
        ? state
        : {
            liveResult: result,
            liveErrorMessage: null,
            liveRequestId: requestId,
            liveStatus: 'ready',
          },
    ),
  setLiveResult: (result) =>
    set((state) => ({
      liveResult: result,
      liveErrorMessage: null,
      liveRequestId: state.liveRequestId + 1,
      liveStatus: 'ready',
    })),
}));