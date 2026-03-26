import type { ScanHistoryItem } from '@acme/shared';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '../../../../shared/components/Typography';
import { ScanHistoryList } from '../ScanHistoryList';

export function ScansTabScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleScanPress = (item: ScanHistoryItem) => {
    router.push(`/scans/${item.id}`);
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="px-4 pb-2 pt-4">
        <Typography variant="hero">Scans</Typography>
      </View>
      <ScanHistoryList onScanPress={handleScanPress} />
    </View>
  );
}
