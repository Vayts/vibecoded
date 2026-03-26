import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { Button } from '../../../../shared/components/Button';
import { useScanDetailQuery } from '../../hooks/useScanHistoryQuery';
import { ScanDetailContent } from '../ScanDetailContent';

export function ScanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch } = useScanDetailQuery(id);

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-2 py-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full"
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color={COLORS.gray800} />
        </TouchableOpacity>
        <Typography variant="headerTitle" className="ml-1">
          Scan Details
        </Typography>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Typography variant="sectionTitle" className="text-center">
            Something went wrong
          </Typography>
          <Typography variant="bodySecondary" className="mt-2 text-center">
            {error?.message ?? 'Failed to load scan details'}
          </Typography>
          <View className="mt-4">
            <Button label="Retry" onPress={() => void refetch()} />
          </View>
        </View>
      ) : data ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-4 pb-8">
          <ScanDetailContent scan={data} />
        </ScrollView>
      ) : null}
    </View>
  );
}
