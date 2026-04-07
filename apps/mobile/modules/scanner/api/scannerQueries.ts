import {
  ANALYSIS_SOCKET_EVENTS,
  type AnalysisJobResponse,
  type AnalysisSocketEventPayload,
} from '@acme/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { analysisSocket } from '../../../shared/lib/socket/analysisSocket';
import { SCAN_HISTORY_QUERY_KEY } from '../../scans/hooks/useScanHistoryQuery';

const toAnalysisState = (
  payload: AnalysisSocketEventPayload,
): AnalysisJobResponse => ({
  analysisId: payload.analysisId,
  status: payload.status,
  productStatus: payload.productStatus,
  ingredientsStatus: payload.ingredientsStatus,
  result: payload.result,
  error: payload.error,
});

export const getPersonalAnalysisQueryKey = (analysisId?: string) => {
  return ['scanner', 'personal-analysis', analysisId] as const;
};

export const usePersonalAnalysisQuery = (
  initialAnalysis?: AnalysisJobResponse,
) => {
  const queryClient = useQueryClient();
  const hasInvalidatedRef = useRef(
    initialAnalysis?.status === 'completed' ||
      initialAnalysis?.status === 'failed',
  );
  const analysisId = initialAnalysis?.analysisId;
  const queryKey = useMemo(
    () => getPersonalAnalysisQueryKey(analysisId),
    [analysisId],
  );

  useEffect(() => {
    if (!analysisId || !initialAnalysis) {
      return;
    }

    queryClient.setQueryData(queryKey, initialAnalysis);

    if (initialAnalysis.status !== 'pending') {
      return;
    }

    const handleAnalysisEvent = (payload: AnalysisSocketEventPayload) => {
      if (payload.analysisId !== analysisId) {
        return;
      }

      const nextState = toAnalysisState(payload);
      queryClient.setQueryData(queryKey, nextState);

      if (
        !hasInvalidatedRef.current &&
        (nextState.status === 'completed' || nextState.status === 'failed')
      ) {
        hasInvalidatedRef.current = true;
        void queryClient.invalidateQueries({
          queryKey: [...SCAN_HISTORY_QUERY_KEY],
        });
      }
    };

    const disposers = [
      analysisSocket.on(ANALYSIS_SOCKET_EVENTS.subscribed, handleAnalysisEvent),
      analysisSocket.on(
        ANALYSIS_SOCKET_EVENTS.productStarted,
        handleAnalysisEvent,
      ),
      analysisSocket.on(
        ANALYSIS_SOCKET_EVENTS.productCompleted,
        handleAnalysisEvent,
      ),
      analysisSocket.on(
        ANALYSIS_SOCKET_EVENTS.productFailed,
        handleAnalysisEvent,
      ),
      analysisSocket.on(
        ANALYSIS_SOCKET_EVENTS.ingredientsStarted,
        handleAnalysisEvent,
      ),
      analysisSocket.on(
        ANALYSIS_SOCKET_EVENTS.ingredientsCompleted,
        handleAnalysisEvent,
      ),
      analysisSocket.on(
        ANALYSIS_SOCKET_EVENTS.ingredientsFailed,
        handleAnalysisEvent,
      ),
    ];

    analysisSocket.subscribe(analysisId);

    return () => {
      disposers.forEach((dispose) => dispose());
      analysisSocket.unsubscribe(analysisId);
    };
  }, [analysisId, initialAnalysis, queryClient, queryKey]);

  return useQuery({
    queryKey,
    enabled: Boolean(analysisId),
    queryFn: async () => {
      return (
        (queryClient.getQueryData(queryKey) as AnalysisJobResponse | undefined) ??
        initialAnalysis
      );
    },
    initialData: initialAnalysis,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    retry: 0,
  });
};
