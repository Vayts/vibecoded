import type { FavouritesResponse } from '@acme/shared';
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

export const useToggleFavouriteMutation = () => {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: addFavourite,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...FAVOURITES_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [...SCAN_HISTORY_QUERY_KEY] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeFavourite,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...FAVOURITES_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [...SCAN_HISTORY_QUERY_KEY] });
    },
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
