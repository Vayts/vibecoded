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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useScanDetailQuery = (scanId: string | undefined) => {
  const queryClient = useQueryClient();
  const hasInvalidatedRef = useRef(false);

  const queryKey = ['scans', 'detail', scanId] as const;

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
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data) return false;

      if (data.personalAnalysisStatus === 'pending') {
        return 1000;
      }

      return false;
    },
  });

  useEffect(() => {
    const status = query.data?.personalAnalysisStatus;

    if (!hasInvalidatedRef.current && (status === 'completed' || status === 'failed')) {
      hasInvalidatedRef.current = true;
      void queryClient.invalidateQueries({ queryKey: [...SCAN_HISTORY_QUERY_KEY] });
    }
  }, [query.data?.personalAnalysisStatus, queryClient]);

  return query;
};