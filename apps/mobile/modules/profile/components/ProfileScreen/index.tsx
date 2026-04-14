import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenSpinner } from '../../../../shared/components/ScreenSpinner';
import { Typography } from '../../../../shared/components/Typography';
import { getUserFallbackAvatarImage } from '../../../../shared/lib/avatar/selectAndUploadAvatarImage';
import { useAuthStore } from '../../../../shared/stores/authStore';
import { FamilyMemberList } from '../../../family/components/FamilyMemberList';
import { useOnboardingQuery } from '../../../onboarding/api/onboardingQueries';
import { MAIN_GOAL_LABELS } from '../../../onboarding/components/options';
import { useCurrentUserQuery } from '../../api/profileQueries';
import { ProfileGoalCard } from '../ProfileGoalCard';
import { ProfileHeaderCard } from '../ProfileHeaderCard';
import { ProfileLogoutButton } from '../ProfileLogoutButton';
import { ScreenSheet } from '../../../../shared/components/ScreenSheet';

const getHealthSummary = (onboarding: ReturnType<typeof useOnboardingQuery>['data']): string => {
  if (!onboarding?.mainGoal) {
    return 'Set your health goal';
  }

  return MAIN_GOAL_LABELS[onboarding.mainGoal];
};

export function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoading, setUser, signOut, user: authUser } = useAuthStore();
  const currentUserQuery = useCurrentUserQuery(authUser?.id);
  const user = currentUserQuery.data ?? authUser;
  const onboardingQuery = useOnboardingQuery(user?.id);

  useEffect(() => {
    if (currentUserQuery.data) {
      setUser(currentUserQuery.data);
    }
  }, [currentUserQuery.data, setUser]);

  if (!user) {
    return <ScreenSpinner />;
  }

  if (onboardingQuery.isLoading) {
    return <ScreenSpinner />;
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-4 mb-4">
        <Typography variant="pageTitle">Profile</Typography>
      </View>

      <ScreenSheet>
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 140,
        }}
      >
        <View className="px-4">
          <View className="mt-6">
            <ProfileHeaderCard
              name={user.name || 'Your account'}
              email={user.email}
              avatarUrl={user.avatarUrl}
              fallbackImageUrl={getUserFallbackAvatarImage(user)}
              onEditPress={() => {
                router.push('/(tabs)/profile/edit-account');
              }}
            />
          </View>

          <View className="mt-8">
            <Typography variant="sectionTitle" className="text-neutrals-900 font-bold">
              Preferences
            </Typography>
            <ProfileGoalCard
              label="Your goal"
              description={getHealthSummary(onboardingQuery.data)}
              helperText="Your product analysis will be personalized based on your preferences."
              onPress={() => {
                router.push('/(tabs)/profile/edit-health');
              }}
            />
          </View>

          <View className="mt-8">
            <Typography variant="sectionTitle" className="text-neutrals-900">
              Family members
            </Typography>
            <View className="mt-3">
              <FamilyMemberList
                onAdd={() => {
                  router.push('/(tabs)/profile/add-family-member');
                }}
                onEdit={(member) => {
                  router.push({
                    pathname: '/(tabs)/profile/edit-family-member',
                    params: { id: member.id },
                  });
                }}
              />
            </View>
          </View>

          <View className="mt-8">
            <ProfileLogoutButton
              disabled={isLoading}
              onPress={() => {
                void signOut();
              }}
            />
          </View>
        </View>
      </ScrollView>
      </ScreenSheet>
    </View>
  );
}
