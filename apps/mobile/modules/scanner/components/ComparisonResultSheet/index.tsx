import type { ProductComparisonResult, ProfileComparisonResult } from '@acme/shared';
import { useLocalSearchParams } from 'expo-router';
import { ArrowLeftRight, CircleX } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomLoader } from '../../../../shared/components/CustomLoader';
import { COLORS } from '../../../../shared/constants/colors';
import { useAuthStore } from '../../../../shared/stores/authStore';
import { useFamilyMembersQuery } from '../../../family/hooks/useFamilyMembers';
import { useCurrentUserQuery } from '../../../profile/api/profileQueries';
import { useComparisonDetailQuery } from '../../../scans/hooks/useComparisonsQuery';
import { useScanDetailQuery } from '../../../scans/hooks/useScanHistoryQuery';
import { useComparisonResultStore } from '../../stores/comparisonResultStore';
import { ComparisonProductCard } from './ComparisonProductCard';
import { ComparisonProfileSelector } from './ComparisonProfileSelector';
import { NutritionComparison } from './MetricRow';
import { VerdictCard } from './VerdictCard';
import { Typography } from '../../../../shared/components/Typography';

type ProductKey = 'product1' | 'product2';
type DisplayWinner = 'left' | 'right' | 'tie' | 'neither';

const getParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function ComparisonResultScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ comparisonId?: string | string[]; scanId?: string | string[] }>();
  const authUser = useAuthStore((s) => s.user);
  const clearLiveResult = useComparisonResultStore((state) => state.clearLiveResult);
  const liveResult = useComparisonResultStore((state) => state.liveResult);
  const currentUserQuery = useCurrentUserQuery(authUser?.id);
  const familyMembersQuery = useFamilyMembersQuery();

  const comparisonId = getParamValue(params.comparisonId);
  const scanId = getParamValue(params.scanId);
  const { data: scanDetail, isLoading: isScanLoading } = useScanDetailQuery(scanId);
  const { data: comparisonDetail, isLoading: isComparisonLoading } = useComparisonDetailQuery(comparisonId);

  const isLoading = (scanId && isScanLoading) || (comparisonId && isComparisonLoading);
  const result: ProductComparisonResult | undefined =
    (comparisonDetail?.comparisonResult as ProductComparisonResult | undefined) ??
    (scanDetail?.comparisonResult as ProductComparisonResult | undefined) ??
    (!comparisonId && !scanId ? liveResult ?? undefined : undefined);

  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [isSwapped, setIsSwapped] = useState(false);
  const profiles = result?.profiles;
  const currentUser = currentUserQuery.data ?? authUser;
  const familyMembersById = useMemo(
    () => new Map((familyMembersQuery.data?.items ?? []).map((member) => [member.id, member])),
    [familyMembersQuery.data?.items],
  );
  const chipItems = useMemo(
    () =>
      profiles?.map((profile) => {
        const familyMember = familyMembersById.get(profile.profileId);
        const isCurrentUser = profile.profileId === 'you';

        return {
          id: profile.profileId,
          name: profile.profileName,
          imageUrl: isCurrentUser ? currentUser?.avatarUrl ?? null : familyMember?.avatarUrl ?? null,
          fallbackImageUrl: isCurrentUser ? currentUser?.image ?? null : null,
        };
      }) ?? [],
    [currentUser?.avatarUrl, currentUser?.image, familyMembersById, profiles],
  );
  useEffect(() => {
    setSelectedProfileId('');
    setIsSwapped(false);
  }, [comparisonDetail?.id, comparisonId, liveResult, scanDetail?.id, scanId]);
  useEffect(() => () => clearLiveResult(), [clearLiveResult]);

  if ((scanId || comparisonId) && isLoading) {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6 py-12">
          <CustomLoader size="md" isReversed />
          <Typography variant="bodySecondary" className="mt-3 text-gray-500">Loading comparison…</Typography>
        </View>
      </View>
    );
  }

  if (!result || !profiles) {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-8">
          <Typography variant="sectionTitle" className="text-center">No comparison data available</Typography>
          <Typography variant="bodySecondary" className="mt-2 text-center text-gray-500">Go back and open a comparison from scanner or history.</Typography>
        </View>
      </View>
    );
  }

  const activeProfileId = profiles.find((p) => p.profileId === selectedProfileId)?.profileId ?? profiles[0]?.profileId ?? '';
  const activeProfile: ProfileComparisonResult | undefined = profiles.find((p) => p.profileId === activeProfileId);
  const leftKey: ProductKey = isSwapped ? 'product2' : 'product1';
  const rightKey: ProductKey = isSwapped ? 'product1' : 'product2';
  const leftProduct = result[leftKey];
  const rightProduct = result[rightKey];
  const leftComparison = activeProfile ? activeProfile[leftKey] : null;
  const rightComparison = activeProfile ? activeProfile[rightKey] : null;
  const displayWinner: DisplayWinner = !activeProfile
    ? 'tie'
    : activeProfile.winner === 'tie' || activeProfile.winner === 'neither'
      ? activeProfile.winner
      : activeProfile.winner === leftKey
        ? 'left'
        : 'right';
  const showNoMatchesBadge = displayWinner === 'neither';

  return (
    <View className="flex-1 bg-background">
      <View
                  style={{
                    backgroundColor: COLORS.white,
                    borderTopLeftRadius: 32,
                    borderTopRightRadius: 32,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 8,
                    gap: 12,
                    marginTop: 8,
                    flex: 1,
                  }}
                >
                  <View
                    style={{
                      borderTopLeftRadius: 32,
                      borderTopRightRadius: 32,
                      overflow: 'hidden',
                      flex: 1,
                    }}
                  >
        <ComparisonProfileSelector profiles={chipItems} selectedProfileId={activeProfileId} onSelect={setSelectedProfileId} />
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 28, paddingTop: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-4">
            {activeProfile && leftComparison && rightComparison ? (
              <View>
                {showNoMatchesBadge ? (
                  <View className="absolute -top-4 left-0 right-0 z-20 items-center">
                    <View
                      className="flex-row items-center rounded-full border-[3px] border-white px-4 py-2"
                      style={{ backgroundColor: COLORS.danger800 }}
                    >
                      <CircleX color={COLORS.white} size={18} strokeWidth={2.25} />
                      <Typography variant="buttonSmall" className="ml-2 text-white">
                        No matches
                      </Typography>
                    </View>
                  </View>
                ) : null}
                <View className="relative mb-7 flex-row gap-3 pt-1">
                  <ComparisonProductCard
                    product={leftProduct}
                    tone={
                      displayWinner === 'left'
                        ? 'winner'
                        : displayWinner === 'neither'
                          ? 'not-suitable'
                          : 'neutral'
                    }
                    badgeLabel={
                      displayWinner === 'left'
                        ? 'Best choice'
                        : undefined
                    }
                  />
                  <ComparisonProductCard
                    product={rightProduct}
                    tone={
                      displayWinner === 'right'
                        ? 'winner'
                        : displayWinner === 'neither'
                          ? 'not-suitable'
                          : 'neutral'
                    }
                    badgeLabel={
                      displayWinner === 'right'
                        ? 'Best choice'
                        : undefined
                    }
                  />
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Swap compared products"
                    activeOpacity={0.8}
                    className="absolute left-1/2 h-10 w-10 items-center justify-center rounded-full border bg-white"
                    style={{
                      borderColor: COLORS.gray200,
                      top: '50%',
                      marginTop: -20,
                      marginLeft: -20,
                    }}
                    onPress={() => setIsSwapped((current) => !current)}
                  >
                    <ArrowLeftRight color={COLORS.gray700} size={18} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <NutritionComparison
                  leftProduct={leftProduct}
                  rightProduct={rightProduct}
                  leftComparison={leftComparison}
                  rightComparison={rightComparison}
                  displayWinner={displayWinner}
                />
                <VerdictCard profile={activeProfile} product1={result.product1} product2={result.product2} />
              </View>
            ) : (
              <View className="items-center py-8">
                <Typography variant="bodySecondary" className="text-gray-400">No comparison data available</Typography>
              </View>
            )}
          </View>
        </ScrollView>
        </View>
      </View>
    </View>
  );
}
