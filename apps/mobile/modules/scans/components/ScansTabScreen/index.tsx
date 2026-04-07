import type { ScanHistoryItem } from '@acme/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { SheetManager } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { ScanHistoryList } from '../ScanHistoryList';
import { FavouritesList } from '../FavouritesList';
import { DiscoverTabChips, type DiscoverTab } from '../DiscoverTabChips';

export function ScansTabScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<DiscoverTab>('history');

  const handleScanPress = (item: ScanHistoryItem) => {
    if (item.type === 'comparison') {
      void SheetManager.show(SheetsEnum.ComparisonResultSheet, {
        payload: { scanId: item.id },
      });
    } else {
      void SheetManager.show(SheetsEnum.ScannerResultSheet, {
        payload: { scanId: item.id },
      });
    }
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <DiscoverTabChips selected={activeTab} onSelect={setActiveTab} />
      {activeTab === 'history' ? (
        <ScanHistoryList onScanPress={handleScanPress} />
      ) : (
        <FavouritesList onItemPress={handleScanPress} />
      )}
    </View>
  );
}
