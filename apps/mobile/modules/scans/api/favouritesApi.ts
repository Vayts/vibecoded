import {
  favouritesResponseSchema,
  type SharedScanFilters,
  type FavouritesResponse,
  type FavouriteStatusResponse,
} from '@acme/shared';
import { apiFetch } from '../../../shared/lib/client/client';

const DEFAULT_PAGE_SIZE = 20;

interface FetchFavouritesParams {
  cursor?: string;
  search?: string;
  filters?: SharedScanFilters;
  signal?: AbortSignal;
}

export const fetchFavourites = async ({
  cursor,
  search,
  filters,
  signal,
}: FetchFavouritesParams): Promise<FavouritesResponse> => {
  const params = new URLSearchParams();
  const normalizedSearch = search?.trim();

  if (cursor) params.set('cursor', cursor);
  if (normalizedSearch) params.set('search', normalizedSearch);
  if (filters?.profileIds.length) params.set('profileIds', filters.profileIds.join(','));
  if (filters?.fitBuckets.length) params.set('fitBuckets', filters.fitBuckets.join(','));
  params.set('limit', String(DEFAULT_PAGE_SIZE));

  const response = await apiFetch(`/api/favourites?${params.toString()}`, { signal });

  if (!response.ok) {
    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(json?.error ?? 'Failed to load favourites');
  }

  const json = await response.json();
  return favouritesResponseSchema.parse(json);
};

export const addFavourite = async (productId: string): Promise<void> => {
  const response = await apiFetch('/api/favourites', {
    method: 'POST',
    body: JSON.stringify({ productId }),
  });

  if (!response.ok) {
    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(json?.error ?? 'Failed to add favourite');
  }
};

export const removeFavourite = async (productId: string): Promise<void> => {
  const response = await apiFetch(`/api/favourites/${productId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(json?.error ?? 'Failed to remove favourite');
  }
};

export const checkFavouriteStatus = async (productId: string): Promise<FavouriteStatusResponse> => {
  const response = await apiFetch(`/api/favourites/status/${productId}`);

  if (!response.ok) {
    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(json?.error ?? 'Failed to check favourite status');
  }

  return response.json();
};
