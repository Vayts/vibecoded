import {
  scanHistoryResponseSchema,
  scanDetailResponseSchema,
  type SharedScanFilters,
  type ScanHistoryResponse,
  type ScanDetailResponse,
} from '@acme/shared';
import { apiFetch } from '../../../shared/lib/client/client';

const DEFAULT_PAGE_SIZE = 20;

interface FetchScanHistoryParams {
  cursor?: string;
  search?: string;
  filters?: SharedScanFilters;
  signal?: AbortSignal;
}

export const fetchScanHistory = async ({
  cursor,
  search,
  filters,
  signal,
}: FetchScanHistoryParams): Promise<ScanHistoryResponse> => {
  const params = new URLSearchParams();
  const normalizedSearch = search?.trim();

  if (cursor) params.set('cursor', cursor);
  if (normalizedSearch) params.set('search', normalizedSearch);
  if (filters?.profileIds.length) params.set('profileIds', filters.profileIds.join(','));
  if (filters?.fitBuckets.length) params.set('fitBuckets', filters.fitBuckets.join(','));
  params.set('limit', String(DEFAULT_PAGE_SIZE));

  const response = await apiFetch(`/api/scans/history?${params.toString()}`, { signal });

  if (!response.ok) {
    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(json?.error ?? 'Failed to load scan history');
  }

  const json = await response.json();
  return scanHistoryResponseSchema.parse(json);
};

export const fetchScanDetail = async (scanId: string): Promise<ScanDetailResponse> => {
  const response = await apiFetch(`/api/scans/${scanId}`);

  if (!response.ok) {
    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(json?.error ?? 'Failed to load scan details');
  }

  const json = await response.json();
  return scanDetailResponseSchema.parse(json);
};

export const deleteScan = async (scanId: string): Promise<void> => {
  const response = await apiFetch(`/api/scans/${scanId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(json?.error ?? 'Failed to delete history entry');
  }
};
