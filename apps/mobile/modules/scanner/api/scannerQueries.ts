import {
  ANALYSIS_SOCKET_EVENTS,
  personalAnalysisJobSchema,
  type PersonalAnalysisJob,
  type PersonalAnalysisSocketEventPayload,
} from '@acme/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { apiFetch } from '../../../shared/lib/client/client';
import { analysisSocket } from '../../../shared/lib/socket/analysisSocket';
import { SCAN_HISTORY_QUERY_KEY } from '../../scans/hooks/useScanHistoryQuery';

const toAnalysisState = (
  payload: PersonalAnalysisSocketEventPayload,
): PersonalAnalysisJob => ({
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

const fetchAnalysisState = async (analysisId: string): Promise<PersonalAnalysisJob> => {
  const response = await apiFetch(`/api/scanner/analysis/${analysisId}`);

  if (!response.ok) {
    throw new Error('Unable to load analysis state');
  }

  const json = await response.json();
  return personalAnalysisJobSchema.parse(json);
};

export const usePersonalAnalysisQuery = (
  initialAnalysis?: PersonalAnalysisJob,
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

      const handleAnalysisEvent = (payload: PersonalAnalysisSocketEventPayload) => {
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
      if (!analysisId) {
        return initialAnalysis;
      }

      try {
        return await fetchAnalysisState(analysisId);
      } catch {
        return (
          (queryClient.getQueryData(queryKey) as PersonalAnalysisJob | undefined) ??
          initialAnalysis
        );
      }
    },
    initialData: initialAnalysis,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    retry: 0,
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' ? 1000 : false,
  });
};
