import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useCompareStore } from '../stores/compareStore';
import type { CompareProductSource } from '../types/scanner';

interface StartScanToCompareOptions {
  source?: 'compare-picker' | 'history-menu';
}

const mapCompareSourceToPreview = (product: CompareProductSource) => ({
  productId: product.productId?.trim() ?? '',
  barcode: product.barcode,
  product_name: product.productName ?? null,
  brands: null,
  image_url: null,
});

export function useStartScanToCompare() {
  const router = useRouter();
  const startCompare = useCompareStore((state) => state.startCompare);

  return useCallback(
    (product: CompareProductSource, options?: StartScanToCompareOptions) => {
      startCompare(mapCompareSourceToPreview(product), {
        photoUri: product.photoUri,
        source: options?.source ?? 'compare-picker',
      });

      router.push({
        pathname: '/scanner',
        params: { mode: 'compare' },
      });
    },
    [router, startCompare],
  );
}
