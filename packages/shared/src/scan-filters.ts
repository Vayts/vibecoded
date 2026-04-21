import { z } from 'zod';

export const scanFitBucketSchema = z.enum(['bad', 'neutral', 'good']);
export type ScanFitBucket = z.infer<typeof scanFitBucketSchema>;

export const sharedScanFiltersSchema = z.object({
  profileIds: z.array(z.string().trim().min(1)).default([]),
  fitBuckets: z.array(scanFitBucketSchema).default([]),
});
export type SharedScanFilters = z.infer<typeof sharedScanFiltersSchema>;

export const comparisonFiltersSchema = z.object({
  profileIds: z.array(z.string().trim().min(1)).default([]),
});
export type ComparisonFilters = z.infer<typeof comparisonFiltersSchema>;

