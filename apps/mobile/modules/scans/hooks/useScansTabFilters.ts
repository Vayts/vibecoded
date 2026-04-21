import { useCallback, useState } from 'react';
import { SheetManager } from 'react-native-actions-sheet';
import { SheetsEnum } from '../../../shared/types/sheets';
import type { DiscoverTab } from '../components/DiscoverTabChips';
import {
  EMPTY_COMPARISON_FILTERS,
  EMPTY_SHARED_SCAN_FILTERS,
} from '../types/filters';
import { useScansFilterProfiles } from './useScansFilterProfiles';
import {
  countActiveScanFilters,
  toComparisonQueryFilters,
  toSharedScanQueryFilters,
} from '../utils/filterItems';

export const useScansTabFilters = (activeTab: DiscoverTab, activeResultCount = 0) => {
  const filterProfileOptions = useScansFilterProfiles();
  const [sharedFilters, setSharedFilters] = useState(EMPTY_SHARED_SCAN_FILTERS);
  const [comparisonFilters, setComparisonFilters] = useState(EMPTY_COMPARISON_FILTERS);
  const activeFilters = activeTab === 'comparisons' ? comparisonFilters : sharedFilters;
  const activeFilterCount = countActiveScanFilters(activeFilters);
  const sharedQueryFilters = toSharedScanQueryFilters(sharedFilters);
  const comparisonQueryFilters = toComparisonQueryFilters(comparisonFilters);

  const handleOpenFilters = useCallback(() => {
    if (activeTab === 'comparisons') {
      void SheetManager.show(SheetsEnum.ScansFilterSheet, {
        payload: {
          tab: 'comparisons',
          profileOptions: filterProfileOptions,
          filters: comparisonFilters,
          resultCount: activeResultCount,
          onApply: (nextFilters) => setComparisonFilters(nextFilters),
        },
      });
      return;
    }

    void SheetManager.show(SheetsEnum.ScansFilterSheet, {
      payload: {
        tab: activeTab,
        profileOptions: filterProfileOptions,
        filters: sharedFilters,
        resultCount: activeResultCount,
        onApply: (nextFilters) => setSharedFilters(nextFilters),
      },
    });
  }, [activeResultCount, activeTab, comparisonFilters, filterProfileOptions, sharedFilters]);

  return {
    activeFilterCount,
    comparisonQueryFilters,
    handleOpenFilters,
    sharedQueryFilters,
  };
};


