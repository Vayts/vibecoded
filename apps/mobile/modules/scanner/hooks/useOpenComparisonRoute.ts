import type { ProductComparisonResult } from '@acme/shared';
import type { Href } from 'expo-router';
import { usePathname, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { InteractionManager } from 'react-native';
import { useComparisonResultStore } from '../stores/comparisonResultStore';
import { SheetsEnum } from '../../../shared/types/sheets';
import { SheetManager } from 'react-native-actions-sheet/dist/src/sheetmanager';

const COMPARISON_PATH = '/comparison' as const;

interface ComparisonRouteParams {
  comparisonId?: string;
  scanId?: string;
}

interface ComparisonNavigationOptions {
  closeScannerResultSheet?: boolean;
}

export function useOpenComparisonRoute() {
  const router = useRouter();
  const pathname = usePathname();
  const beginLiveComparison = useComparisonResultStore((state) => state.beginLiveComparison);
  const clearLiveResult = useComparisonResultStore((state) => state.clearLiveResult);
  const failLiveComparison = useComparisonResultStore((state) => state.failLiveComparison);
  const resolveLiveComparison = useComparisonResultStore((state) => state.resolveLiveComparison);
  const setLiveResult = useComparisonResultStore((state) => state.setLiveResult);

  const navigateToComparison = useCallback(
    (params?: ComparisonRouteParams, options?: ComparisonNavigationOptions) => {
      const href: Href = params?.comparisonId
        ? (`${COMPARISON_PATH}?comparisonId=${encodeURIComponent(params.comparisonId)}` as Href)
        : params?.scanId
          ? (`${COMPARISON_PATH}?scanId=${encodeURIComponent(params.scanId)}` as Href)
          : COMPARISON_PATH;

      if (pathname === COMPARISON_PATH) {
        router.replace(href);
      } else {
        router.push(href);
      }

      if (!options?.closeScannerResultSheet) {
        return;
      }

      InteractionManager.runAfterInteractions(() => {
        void SheetManager.hide(SheetsEnum.ScannerResultSheet);
      });
    },
    [pathname, router],
  );

  const openComparisonById = useCallback(
    (comparisonId: string) => {
      clearLiveResult();
      navigateToComparison({ comparisonId });
    },
    [clearLiveResult, navigateToComparison],
  );

  const openComparisonByScanId = useCallback(
    (scanId: string) => {
      clearLiveResult();
      navigateToComparison({ scanId });
    },
    [clearLiveResult, navigateToComparison],
  );

  const openLiveComparison = useCallback(
    (result: ProductComparisonResult) => {
      setLiveResult(result);
      navigateToComparison();
    },
    [navigateToComparison, setLiveResult],
  );

  const beginPendingComparison = useCallback(() => beginLiveComparison(), [beginLiveComparison]);

  const navigateToLiveComparison = useCallback(
    (options?: ComparisonNavigationOptions) => {
      navigateToComparison(undefined, options);
    },
    [navigateToComparison],
  );

  const rejectPendingComparison = useCallback(
    (requestId: number, errorMessage: string) => {
      failLiveComparison(requestId, errorMessage);
    },
    [failLiveComparison],
  );

  const resolvePendingComparison = useCallback(
    (requestId: number, result: ProductComparisonResult) => {
      resolveLiveComparison(requestId, result);
    },
    [resolveLiveComparison],
  );

  return {
    beginPendingComparison,
    navigateToLiveComparison,
    openComparisonById,
    openComparisonByScanId,
    openLiveComparison,
    rejectPendingComparison,
    resolvePendingComparison,
  };
}