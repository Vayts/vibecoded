import type { ScanHistoryItem } from '@acme/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '../../../../shared/components/Typography';
import { ScanHistoryList } from '../ScanHistoryList';
import { FavouritesList } from '../FavouritesList';
import { DiscoverTabChips, type DiscoverTab } from '../DiscoverTabChips';

export function ScansTabScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DiscoverTab>('history');

  const handleScanPress = (item: ScanHistoryItem) => {
    router.push(`/(tabs)/scans/${item.id}`);
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="px-4 pb-2 pt-4">
        <Typography variant="hero">Discover</Typography>
      </View>
      <DiscoverTabChips selected={activeTab} onSelect={setActiveTab} />
      {activeTab === 'history' ? (
        <ScanHistoryList onScanPress={handleScanPress} />
      ) : (
        <FavouritesList onItemPress={handleScanPress} />
      )}
    </View>
  );
}
