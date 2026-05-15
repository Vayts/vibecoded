import type { ScanDetailResponse, ScanHistoryResponse, SharedScanFilters } from '@acme/shared';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchScanDetail, fetchScanHistory } from '../api/scansApi';

export const SCAN_HISTORY_QUERY_KEY = ['scans', 'history'] as const;
const HISTORY_STALE_TIME_MS = 30_000;

const EMPTY_SCAN_FILTERS: SharedScanFilters = {
  profileIds: [],
  fitBuckets: [],
};

export const useScanHistoryQuery = (
  search: string,
  enabled = true,
  filters: SharedScanFilters = EMPTY_SCAN_FILTERS,
) => {
  return useInfiniteQuery({
    queryKey: [...SCAN_HISTORY_QUERY_KEY, search, filters],
    enabled,
    staleTime: HISTORY_STALE_TIME_MS,
    queryFn: ({ pageParam, signal }: { pageParam: string | undefined; signal: AbortSignal }) =>
      fetchScanHistory({ cursor: pageParam, search, filters, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: ScanHistoryResponse) => lastPage.nextCursor ?? undefined,
  });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useScanDetailQuery = (scanId: string | undefined) => {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['scans', 'detail', scanId] as const, [scanId]);

  return useQuery({
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
};
