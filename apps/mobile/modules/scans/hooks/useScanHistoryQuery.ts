import type { ScanHistoryResponse } from '@acme/shared';
import { useEffect, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchScanDetail, fetchScanHistory } from '../api/scansApi';

export const SCAN_HISTORY_QUERY_KEY = ['scans', 'history'] as const;

const SCAN_DETAIL_INGREDIENT_POLL_INTERVAL_MS = 2000;
const SCAN_DETAIL_INGREDIENT_MAX_POLLS = 10; // 20 seconds max
const SCAN_DETAIL_INGREDIENT_TIMEOUT_MS =
  SCAN_DETAIL_INGREDIENT_MAX_POLLS * SCAN_DETAIL_INGREDIENT_POLL_INTERVAL_MS;

export const useScanHistoryQuery = () => {
  return useInfiniteQuery({
    queryKey: [...SCAN_HISTORY_QUERY_KEY],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => fetchScanHistory(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: ScanHistoryResponse) => lastPage.nextCursor ?? undefined,
  });
};

export const useScanDetailQuery = (scanId: string | undefined) => {
  // True while we're still waiting for ingredient analysis to arrive in DB.
  // Turns false when ingredients are found OR the polling window expires.
  const [ingredientPollingDone, setIngredientPollingDone] = useState(false);

  const query = useQuery({
    queryKey: ['scans', 'detail', scanId],
    queryFn: () => fetchScanDetail(scanId!),
    enabled: Boolean(scanId),
    staleTime: 0,
    refetchInterval: (query) => {
      const data = query.state.data;
      const attempts = query.state.dataUpdateCount;

      if (!data || attempts >= SCAN_DETAIL_INGREDIENT_MAX_POLLS) return false;

      // Stop polling as soon as at least one profile has ingredient analysis
      if (data.multiProfileResult) {
        const hasIngredients = Object.values(data.multiProfileResult.detailsByProfile).some(
          (d) => d.ingredientAnalysis != null,
        );
        if (hasIngredients) return false;
      }

      // Only poll if the scan is completed (heuristic done) but ingredients may still be loading
      if (data.personalAnalysisStatus === 'completed' && data.multiProfileResult) {
        return SCAN_DETAIL_INGREDIENT_POLL_INTERVAL_MS;
      }

      return false;
    },
    select: (data) => data,
  });

  // Mark polling done as soon as ingredients land in data
  useEffect(() => {
    if (!query.data?.multiProfileResult) return;
    const hasIngredients = Object.values(query.data.multiProfileResult.detailsByProfile).some(
      (d) => d.ingredientAnalysis != null,
    );
    if (hasIngredients) setIngredientPollingDone(true);
  }, [query.data]);

  // Hard timeout: stop showing spinner even if AI never completes
  useEffect(() => {
    if (!scanId) return;
    setIngredientPollingDone(false);
    const timer = setTimeout(
      () => setIngredientPollingDone(true),
      SCAN_DETAIL_INGREDIENT_TIMEOUT_MS,
    );
    return () => clearTimeout(timer);
  }, [scanId]);

  return { ...query, ingredientPollingDone };
};
