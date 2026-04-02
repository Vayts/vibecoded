import type { FavouritesResponse, ScanDetailResponse, ScanHistoryResponse } from '@acme/shared';
import type { InfiniteData } from '@tanstack/react-query';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addFavourite, fetchFavourites, removeFavourite } from '../api/favouritesApi';
import { SCAN_HISTORY_QUERY_KEY } from './useScanHistoryQuery';

export const FAVOURITES_QUERY_KEY = ['favourites'] as const;

export const useFavouritesQuery = () => {
  return useInfiniteQuery({
    queryKey: [...FAVOURITES_QUERY_KEY],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => fetchFavourites(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: FavouritesResponse) => lastPage.nextCursor ?? undefined,
  });
};

type HistoryInfiniteData = InfiniteData<ScanHistoryResponse, string | undefined>;

/**
 * Optimistically flip `isFavourite` in every relevant cache entry for a product.
 * Returns a snapshot so we can rollback on error.
 */
const optimisticToggle = (
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
  newValue: boolean,
) => {
  // --- Scan history (infinite) ---
  const prevHistory = queryClient.getQueryData<HistoryInfiniteData>([...SCAN_HISTORY_QUERY_KEY]);
  if (prevHistory) {
    queryClient.setQueryData<HistoryInfiniteData>([...SCAN_HISTORY_QUERY_KEY], {
      ...prevHistory,
      pages: prevHistory.pages.map((page) => ({
        ...page,
        items: page.items.map((scan) =>
          scan.product?.id === productId ? { ...scan, isFavourite: newValue } : scan,
        ),
      })),
    });
  }

  // --- Scan detail (all matching queries by productId) ---
  const detailQueries = queryClient.getQueriesData<ScanDetailResponse>({
    queryKey: ['scans', 'detail'],
  });
  const prevDetails: [readonly unknown[], ScanDetailResponse | undefined][] = [];
  for (const [key, data] of detailQueries) {
    prevDetails.push([key, data]);
    if (data?.productId === productId) {
      queryClient.setQueryData<ScanDetailResponse>(key, { ...data, isFavourite: newValue });
    }
  }

  // --- Favourites list (infinite) ---
  const prevFavourites = queryClient.getQueryData<InfiniteData<FavouritesResponse, string | undefined>>([...FAVOURITES_QUERY_KEY]);

  return { prevHistory, prevDetails, prevFavourites };
};

const rollback = (
  queryClient: ReturnType<typeof useQueryClient>,
  snapshot: ReturnType<typeof optimisticToggle>,
) => {
  if (snapshot.prevHistory) {
    queryClient.setQueryData([...SCAN_HISTORY_QUERY_KEY], snapshot.prevHistory);
  }
  for (const [key, data] of snapshot.prevDetails) {
    queryClient.setQueryData(key, data);
  }
  if (snapshot.prevFavourites) {
    queryClient.setQueryData([...FAVOURITES_QUERY_KEY], snapshot.prevFavourites);
  }
};

const invalidateAll = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: [...FAVOURITES_QUERY_KEY] });
  void queryClient.invalidateQueries({ queryKey: [...SCAN_HISTORY_QUERY_KEY] });
  void queryClient.invalidateQueries({ queryKey: ['scans', 'detail'] });
};

export const useToggleFavouriteMutation = () => {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: addFavourite,
    onMutate: (productId: string) => optimisticToggle(queryClient, productId, true),
    onError: (_err, _productId, context) => {
      if (context) rollback(queryClient, context);
    },
    onSettled: () => invalidateAll(queryClient),
  });

  const removeMutation = useMutation({
    mutationFn: removeFavourite,
    onMutate: (productId: string) => optimisticToggle(queryClient, productId, false),
    onError: (_err, _productId, context) => {
      if (context) rollback(queryClient, context);
    },
    onSettled: () => invalidateAll(queryClient),
  });

  const toggle = (productId: string, currentlyFavourite: boolean) => {
    if (currentlyFavourite) {
      removeMutation.mutate(productId);
    } else {
      addMutation.mutate(productId);
    }
  };

  return {
    toggle,
    isLoading: addMutation.isPending || removeMutation.isPending,
  };
};
