import {
  comparisonHistoryResponseSchema,
  comparisonDetailResponseSchema,
  type ComparisonHistoryResponse,
  type ComparisonDetailResponse,
} from '@acme/shared';
import { apiFetch } from '../../../shared/lib/client/client';

const DEFAULT_PAGE_SIZE = 20;

export const fetchComparisons = async (cursor?: string): Promise<ComparisonHistoryResponse> => {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(DEFAULT_PAGE_SIZE));

  const response = await apiFetch(`/api/comparisons?${params.toString()}`);

  if (!response.ok) {
    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(json?.error ?? 'Failed to load comparisons');
  }

  const json = await response.json();
  return comparisonHistoryResponseSchema.parse(json);
};

export const fetchComparisonDetail = async (
  comparisonId: string,
): Promise<ComparisonDetailResponse> => {
  const response = await apiFetch(`/api/comparisons/${comparisonId}`);

  if (!response.ok) {
    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(json?.error ?? 'Failed to load comparison details');
  }

  const json = await response.json();
  return comparisonDetailResponseSchema.parse(json);
};
