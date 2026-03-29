import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { Button } from '../../../../shared/components/Button';
import { useScanDetailQuery } from '../../hooks/useScanHistoryQuery';
import { ScanDetailContent } from '../ScanDetailContent';

export function ScanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch, ingredientPollingDone } = useScanDetailQuery(id);

  return (
    <View className="flex-1 bg-white">

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
          <ScanDetailContent scan={data} ingredientPollingDone={ingredientPollingDone} />
        </ScrollView>
      ) : null}
    </View>
  );
}
