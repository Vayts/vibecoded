import type {
  ComparisonFilters as ComparisonQueryFilters,
  SharedScanFilters as SharedScanQueryFilters,
} from '@acme/shared';
import type { ComparisonFilters, SharedScanFilters } from '../types/filters';

const getSortedUniqueValues = <T extends string>(values: T[]): T[] =>
  [...new Set(values)].sort((left, right) => left.localeCompare(right));

export const toSharedScanQueryFilters = (
  filters: SharedScanFilters,
): SharedScanQueryFilters => ({
  profileIds: getSortedUniqueValues(filters.selectedProfileIds),
  fitBuckets: getSortedUniqueValues(filters.selectedFitBuckets),
});

export const toComparisonQueryFilters = (
  filters: ComparisonFilters,
): ComparisonQueryFilters => ({
  profileIds: getSortedUniqueValues(filters.selectedProfileIds),
});

export const countActiveScanFilters = (
  filters: SharedScanFilters | ComparisonFilters,
): number => {
  if ('selectedFitBuckets' in filters) {
    return filters.selectedProfileIds.length + filters.selectedFitBuckets.length;
  }

  return filters.selectedProfileIds.length;
};


