import type { ScanHistoryResponse } from '@acme/shared';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { fetchScanDetail, fetchScanHistory } from '../api/scansApi';

export const SCAN_HISTORY_QUERY_KEY = ['scans', 'history'] as const;

export const useScanHistoryQuery = () => {
  return useInfiniteQuery({
    queryKey: [...SCAN_HISTORY_QUERY_KEY],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => fetchScanHistory(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: ScanHistoryResponse) => lastPage.nextCursor ?? undefined,
  });
};

export const useScanDetailQuery = (scanId: string | undefined) => {
  const queryClient = useQueryClient();
  const hasInvalidatedRef = useRef(false);

  const query = useQuery({
    queryKey: ['scans', 'detail', scanId],
    queryFn: () => fetchScanDetail(scanId!),
    enabled: Boolean(scanId),
    staleTime: 0,
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data) return false;

      if (data.personalAnalysisStatus === 'completed' || data.personalAnalysisStatus === 'failed') {
        return false;
      }

      return 1000;
    },
  });

  // When analysis transitions to completed/failed, invalidate history so rows update
  useEffect(() => {
    const status = query.data?.personalAnalysisStatus;
    if (!hasInvalidatedRef.current && (status === 'completed' || status === 'failed')) {
      hasInvalidatedRef.current = true;
      void queryClient.invalidateQueries({ queryKey: [...SCAN_HISTORY_QUERY_KEY] });
    }
  }, [query.data?.personalAnalysisStatus, queryClient]);

  return { ...query };
};
