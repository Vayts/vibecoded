import type { ScanHistoryResponse } from '@acme/shared';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
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
  return useQuery({
    queryKey: ['scans', 'detail', scanId],
    queryFn: () => fetchScanDetail(scanId!),
    enabled: Boolean(scanId),
  });
};
