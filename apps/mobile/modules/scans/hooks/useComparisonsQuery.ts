import type { ComparisonHistoryResponse } from '@acme/shared';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchComparisons, fetchComparisonDetail } from '../api/comparisonsApi';

export const COMPARISONS_QUERY_KEY = ['comparisons'] as const;

export const useComparisonsQuery = (search: string, enabled = true) => {
  return useInfiniteQuery({
    queryKey: [...COMPARISONS_QUERY_KEY, search],
    enabled,
    queryFn: ({ pageParam, signal }: { pageParam: string | undefined; signal: AbortSignal }) =>
      fetchComparisons({ cursor: pageParam, search, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: ComparisonHistoryResponse) => lastPage.nextCursor ?? undefined,
  });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useComparisonDetailQuery = (comparisonId: string | undefined) => {
  const queryClient = useQueryClient();

  const queryKey = ['comparisons', 'detail', comparisonId] as const;

  return useQuery({
    queryKey,
    enabled: Boolean(comparisonId),
    queryFn: async () => {
      const cachedData = queryClient.getQueryData(queryKey);

      const data = await fetchComparisonDetail(comparisonId!);
      if (cachedData === undefined) {
        await sleep(300);
      }

      return data;
    },
  });
};
