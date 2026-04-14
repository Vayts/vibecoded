import type { FavouritesResponse, ScanDetailResponse, ScanHistoryResponse } from '@acme/shared';
import type { InfiniteData } from '@tanstack/react-query';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addFavourite, fetchFavourites, removeFavourite } from '../api/favouritesApi';
import { SCAN_HISTORY_QUERY_KEY } from './useScanHistoryQuery';

export const FAVOURITES_QUERY_KEY = ['favourites'] as const;

export const useFavouritesQuery = (search: string, enabled = true) => {
  return useInfiniteQuery({
    queryKey: [...FAVOURITES_QUERY_KEY, search],
    enabled,
    queryFn: ({ pageParam, signal }: { pageParam: string | undefined; signal: AbortSignal }) =>
      fetchFavourites({ cursor: pageParam, search, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: FavouritesResponse) => lastPage.nextCursor ?? undefined,
  });
};

type HistoryInfiniteData = InfiniteData<ScanHistoryResponse, string | undefined>;
type FavouriteInfiniteData = InfiniteData<FavouritesResponse, string | undefined>;
type QuerySnapshot<T> = Array<[readonly unknown[], T | undefined]>;

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
  const historyQueries = queryClient.getQueriesData<HistoryInfiniteData>({
    queryKey: [...SCAN_HISTORY_QUERY_KEY],
  });
  const prevHistory: QuerySnapshot<HistoryInfiniteData> = historyQueries.map(([key, data]) => [
    key,
    data,
  ]);
  for (const [key, data] of historyQueries) {
    if (!data) continue;

    queryClient.setQueryData<HistoryInfiniteData>(key, {
      ...data,
      pages: data.pages.map((page) => ({
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
  const favouriteQueries = queryClient.getQueriesData<FavouriteInfiniteData>({
    queryKey: [...FAVOURITES_QUERY_KEY],
  });
  const prevFavourites: QuerySnapshot<FavouriteInfiniteData> = favouriteQueries.map(
    ([key, data]) => [key, data],
  );

  for (const [key, data] of favouriteQueries) {
    if (!data) continue;

    queryClient.setQueryData<FavouriteInfiniteData>(key, {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: newValue
          ? page.items.map((item) =>
              item.product?.id === productId ? { ...item, isFavourite: true } : item,
            )
          : page.items.filter((item) => item.product?.id !== productId),
      })),
    });
  }

  return { prevHistory, prevDetails, prevFavourites };
};

const rollback = (
  queryClient: ReturnType<typeof useQueryClient>,
  snapshot: ReturnType<typeof optimisticToggle>,
) => {
  for (const [key, data] of snapshot.prevHistory) {
    queryClient.setQueryData(key, data);
  }
  for (const [key, data] of snapshot.prevDetails) {
    queryClient.setQueryData(key, data);
  }
  for (const [key, data] of snapshot.prevFavourites) {
    queryClient.setQueryData(key, data);
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
