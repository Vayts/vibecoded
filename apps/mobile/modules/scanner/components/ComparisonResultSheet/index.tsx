import type { ProductComparisonResult, ProfileComparisonResult } from '@acme/shared';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserFallbackAvatarImage } from '../../../../shared/lib/avatar/selectAndUploadAvatarImage';
import { useAuthStore } from '../../../../shared/stores/authStore';
import { useFamilyMembersQuery } from '../../../family/hooks/useFamilyMembers';
import { useCurrentUserQuery } from '../../../profile/api/profileQueries';
import { useComparisonDetailQuery } from '../../../scans/hooks/useComparisonsQuery';
import { useScanDetailQuery } from '../../../scans/hooks/useScanHistoryQuery';
import { useComparisonResultStore } from '../../stores/comparisonResultStore';
import { ComparisonDeleteAction } from './ComparisonDeleteAction';
import { ComparisonResultContent } from './ComparisonResultContent';
import { ComparisonStatusView } from './ComparisonStatusView';

type ProductKey = 'product1' | 'product2';
type DisplayWinner = 'left' | 'right' | 'tie' | 'neither';

const getParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function ComparisonResultScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ comparisonId?: string | string[]; scanId?: string | string[] }>();
  const authUser = useAuthStore((s) => s.user);
  const clearLiveResult = useComparisonResultStore((state) => state.clearLiveResult);
  const liveErrorMessage = useComparisonResultStore((state) => state.liveErrorMessage);
  const liveResult = useComparisonResultStore((state) => state.liveResult);
  const liveStatus = useComparisonResultStore((state) => state.liveStatus);
  const currentUserQuery = useCurrentUserQuery(authUser?.id);
  const familyMembersQuery = useFamilyMembersQuery();
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;
  const [isLoaderOverlayVisible, setIsLoaderOverlayVisible] = useState(false);

  const comparisonId = getParamValue(params.comparisonId);
  const scanId = getParamValue(params.scanId);
  const { data: scanDetail, isLoading: isScanLoading } = useScanDetailQuery(scanId);
  const { data: comparisonDetail, isLoading: isComparisonLoading } = useComparisonDetailQuery(comparisonId);

  const isHistoryLoading = Boolean((scanId && isScanLoading) || (comparisonId && isComparisonLoading));
  const isLiveRoute = !comparisonId && !scanId;
  const isPendingLiveComparison = isLiveRoute && liveStatus === 'loading';
  const result: ProductComparisonResult | undefined =
    (comparisonDetail?.comparisonResult as ProductComparisonResult | undefined) ??
    (scanDetail?.comparisonResult as ProductComparisonResult | undefined) ??
    (isLiveRoute ? liveResult ?? undefined : undefined);

  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [isSwapped, setIsSwapped] = useState(false);
  const profiles = result?.profiles;
  const currentUser = currentUserQuery.data ?? authUser;
  const currentUserFallbackImageUrl = getUserFallbackAvatarImage(currentUser);
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
          fallbackImageUrl: isCurrentUser ? currentUserFallbackImageUrl : null,
        };
      }) ?? [],
    [currentUser?.avatarUrl, currentUserFallbackImageUrl, familyMembersById, profiles],
  );
  useEffect(() => {
    setSelectedProfileId('');
    setIsSwapped(false);
  }, [comparisonDetail?.id, comparisonId, liveResult, scanDetail?.id, scanId]);
  useEffect(() => () => clearLiveResult(), [clearLiveResult]);

  useEffect(() => {
    if (!isLiveRoute) {
      contentOpacity.setValue(1);
      loaderOpacity.setValue(0);
      setIsLoaderOverlayVisible(false);
      return;
    }

    if (isPendingLiveComparison) {
      contentOpacity.setValue(0);
      loaderOpacity.setValue(1);
      setIsLoaderOverlayVisible(true);
      return;
    }

    if (liveStatus === 'ready' && result && isLoaderOverlayVisible) {
      const animation = Animated.parallel([
        Animated.timing(contentOpacity, {
          duration: 220,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(loaderOpacity, {
          duration: 220,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]);

      animation.start(({ finished }) => {
        if (finished) {
          setIsLoaderOverlayVisible(false);
          loaderOpacity.setValue(0);
        }
      });

      return () => animation.stop();
    }

    contentOpacity.setValue(1);
    loaderOpacity.setValue(0);
    setIsLoaderOverlayVisible(false);
  }, [contentOpacity, isLiveRoute, isLoaderOverlayVisible, isPendingLiveComparison, liveStatus, loaderOpacity, result]);

  if (isHistoryLoading) {
    return <ComparisonStatusView description="Loading comparison..." showLoader />;
  }

  if (isLiveRoute && liveStatus === 'error') {
    return (
      <ComparisonStatusView
        title="Couldn't prepare comparison"
        description={liveErrorMessage ?? 'Please go back and try comparing these products again.'}
      />
    );
  }

  if (!result || !profiles) {
    if (isPendingLiveComparison) {
      return (
        <View className="flex-1 bg-background">
          <Animated.View className="flex-1" style={{ opacity: loaderOpacity }}>
            <ComparisonStatusView description="Preparing comparison..." showLoader />
          </Animated.View>
        </View>
      );
    }

    return (
      <ComparisonStatusView
        title="No comparison data available"
        description="Go back and open a comparison from scanner or history."
      />
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

  return (
    <View className="flex-1 bg-background">
      <Animated.View className="flex-1" style={{ opacity: isLiveRoute ? contentOpacity : 1 }}>
        <ComparisonResultContent
          activeProfile={activeProfile}
          bottomAction={<ComparisonDeleteAction comparisonId={comparisonId} scanId={scanId} />}
          chipItems={chipItems}
          displayWinner={displayWinner}
          insetsBottom={insets.bottom}
          leftComparison={leftComparison}
          leftProduct={leftProduct}
          onSelectProfile={setSelectedProfileId}
          onSwapProducts={() => setIsSwapped((current) => !current)}
          result={result}
          rightComparison={rightComparison}
          rightProduct={rightProduct}
          selectedProfileId={activeProfileId}
        />
      </Animated.View>
      {isLoaderOverlayVisible ? (
        <Animated.View className="absolute inset-0" pointerEvents="none" style={{ opacity: loaderOpacity }}>
          <ComparisonStatusView description="Preparing comparison..." showLoader />
        </Animated.View>
      ) : null}
    </View>
  );
}
