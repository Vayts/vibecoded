import {
  scanHistoryResponseSchema,
  scanDetailResponseSchema,
  type ScanHistoryResponse,
  type ScanDetailResponse,
} from '@acme/shared';
import { apiFetch } from '../../../shared/lib/client/client';

const DEFAULT_PAGE_SIZE = 20;

export const fetchScanHistory = async (cursor?: string): Promise<ScanHistoryResponse> => {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(DEFAULT_PAGE_SIZE));

  const response = await apiFetch(`/api/scans/history?${params.toString()}`);

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
