import {
  comparisonFiltersSchema,
  sharedScanFiltersSchema,
  type ComparisonFilters,
  type SharedScanFilters,
} from '@acme/shared';
import { ApiError } from '../errors/api-error';

const parseListParam = (value?: string): string[] =>
  value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

export const parseSharedScanFilters = (
  profileIds?: string,
  fitBuckets?: string,
): SharedScanFilters => {
  const parsed = sharedScanFiltersSchema.safeParse({
    profileIds: parseListParam(profileIds),
    fitBuckets: parseListParam(fitBuckets),
  });

  if (!parsed.success) {
    throw ApiError.badRequest(parsed.error.issues[0]?.message ?? 'Invalid scan filters');
  }

  return parsed.data;
};

export const parseComparisonFilters = (profileIds?: string): ComparisonFilters => {
  const parsed = comparisonFiltersSchema.safeParse({
    profileIds: parseListParam(profileIds),
  });

  if (!parsed.success) {
    throw ApiError.badRequest(parsed.error.issues[0]?.message ?? 'Invalid comparison filters');
  }

  return parsed.data;
};
