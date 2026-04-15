import type { ScanDetailResponse, ScanHistoryResponse } from '@acme/shared';
import {
  ANALYSIS_SOCKET_EVENTS,
  type AnalysisSocketEventPayload,
} from '@acme/shared';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { analysisSocket } from '../../../shared/lib/socket/analysisSocket';
import { fetchScanDetail, fetchScanHistory } from '../api/scansApi';

export const SCAN_HISTORY_QUERY_KEY = ['scans', 'history'] as const;
const HISTORY_STALE_TIME_MS = 30_000;

export const useScanHistoryQuery = (search: string, enabled = true) => {
  return useInfiniteQuery({
    queryKey: [...SCAN_HISTORY_QUERY_KEY, search],
    enabled,
    staleTime: HISTORY_STALE_TIME_MS,
    queryFn: ({ pageParam, signal }: { pageParam: string | undefined; signal: AbortSignal }) =>
      fetchScanHistory({ cursor: pageParam, search, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: ScanHistoryResponse) => lastPage.nextCursor ?? undefined,
  });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useScanDetailQuery = (scanId: string | undefined) => {
  const queryClient = useQueryClient();
  const hasInvalidatedRef = useRef(false);
  const previousStatusRef = useRef<ScanDetailResponse['personalAnalysisStatus'] | undefined>(
    undefined,
  );

  const queryKey = useMemo(() => ['scans', 'detail', scanId] as const, [scanId]);

  useEffect(() => {
    hasInvalidatedRef.current = false;
    previousStatusRef.current = undefined;
  }, [scanId]);

  const query = useQuery({
    queryKey,
    enabled: Boolean(scanId),
    staleTime: 0,
    queryFn: async () => {
      const cachedData = queryClient.getQueryData(queryKey);

      const data = await fetchScanDetail(scanId!);

      if (cachedData === undefined) {
        await sleep(300);
      }

      return data;
    },
  });

  useEffect(() => {
    const analysisId = query.data?.analysisId;
    if (!analysisId || query.data?.personalAnalysisStatus !== 'pending') {
      return;
    }

    const handleAnalysisEvent = (payload: AnalysisSocketEventPayload) => {
      if (payload.analysisId !== analysisId) {
        return;
      }

      queryClient.setQueryData<ScanDetailResponse | undefined>(
        queryKey,
        (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          analysisId: payload.analysisId,
          personalAnalysisStatus: payload.status,
          analysisResult: payload.result ?? current.analysisResult,
        };
        },
      );

      if (
        !hasInvalidatedRef.current &&
        (payload.status === 'completed' || payload.status === 'failed')
      ) {
        hasInvalidatedRef.current = true;
        void queryClient.invalidateQueries({ queryKey: [...SCAN_HISTORY_QUERY_KEY] });
      }
    };

    const disposers = [
      analysisSocket.on(ANALYSIS_SOCKET_EVENTS.subscribed, handleAnalysisEvent),
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
  }, [query.data?.analysisId, query.data?.personalAnalysisStatus, queryClient, queryKey]);

  useEffect(() => {
    const status = query.data?.personalAnalysisStatus;

    if (
      !hasInvalidatedRef.current &&
      previousStatusRef.current === 'pending' &&
      (status === 'completed' || status === 'failed')
    ) {
      hasInvalidatedRef.current = true;
      void queryClient.invalidateQueries({ queryKey: [...SCAN_HISTORY_QUERY_KEY] });
    }

    previousStatusRef.current = status;
  }, [query.data?.personalAnalysisStatus, queryClient]);

  return query;
};