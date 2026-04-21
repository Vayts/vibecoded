import type { ScanFitBucket } from '@acme/shared';
import type { DiscoverTab } from '../components/DiscoverTabChips';

export interface SharedScanFilters {
  selectedProfileIds: string[];
  selectedFitBuckets: ScanFitBucket[];
}

export interface ComparisonFilters {
  selectedProfileIds: string[];
}

export interface ScansFilterProfileOption {
  id: string;
  name: string;
  avatarUrl: string | null;
  fallbackImageUrl: string | null;
}

export interface SharedScansFilterSheetPayload {
  tab: Exclude<DiscoverTab, 'comparisons'>;
  profileOptions: ScansFilterProfileOption[];
  filters: SharedScanFilters;
  resultCount?: number;
  onApply: (filters: SharedScanFilters) => void;
}

export interface ComparisonFilterSheetPayload {
  tab: 'comparisons';
  profileOptions: ScansFilterProfileOption[];
  filters: ComparisonFilters;
  resultCount?: number;
  onApply: (filters: ComparisonFilters) => void;
}

export type ScansFilterSheetPayload =
  | SharedScansFilterSheetPayload
  | ComparisonFilterSheetPayload;

export const EMPTY_SHARED_SCAN_FILTERS: SharedScanFilters = {
  selectedProfileIds: [],
  selectedFitBuckets: [],
};

export const EMPTY_COMPARISON_FILTERS: ComparisonFilters = {
  selectedProfileIds: [],
};


