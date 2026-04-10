import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenSpinner } from '../../../../shared/components/ScreenSpinner';
import { Typography } from '../../../../shared/components/Typography';
import { useAuthStore } from '../../../../shared/stores/authStore';
import { useOnboardingQuery } from '../../../onboarding/api/onboardingQueries';
import { MAIN_GOAL_LABELS } from '../../../onboarding/components/options';
import { FamilyMemberList } from '../../../family/components/FamilyMemberList';
import { useCurrentUserQuery } from '../../api/profileQueries';
import { ProfileHeaderCard } from '../ProfileHeaderCard';
import { ProfileMenuRow } from '../ProfileMenuRow';
import { ProfileMenuSection } from '../ProfileMenuSection';

const getHealthSummary = (onboarding: ReturnType<typeof useOnboardingQuery>['data']): string => {
  if (!onboarding?.mainGoal) {
    return 'Review and update your nutrition preferences.';
  }

  return `Goal: ${MAIN_GOAL_LABELS[onboarding.mainGoal]}`;
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
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom + 140,
      }}
    >
      <View className="px-4 pb-2 pt-4">
        <Typography variant="hero" className="text-gray-900">
          Profile
        </Typography>
      </View>

      <View className="px-4">
        <ProfileHeaderCard
          name={user.name || 'Your account'}
          email={user.email}
          avatarUrl={user.avatarUrl}
          fallbackImageUrl={user.image}
          statusText={onboardingQuery.data?.onboardingCompleted ? 'Health profile saved' : null}
        />

        <ProfileMenuSection title="Account">
          <ProfileMenuRow
            label="Edit profile"
            subtitle="Update your photo and display name"
            onPress={() => {
              router.push('/(tabs)/profile/edit-account');
            }}
          />
        </ProfileMenuSection>

        <ProfileMenuSection title="Preferences">
          <ProfileMenuRow
            label="Health profile"
            subtitle={getHealthSummary(onboardingQuery.data)}
            onPress={() => {
              router.push('/(tabs)/profile/edit-health');
            }}
          />
        </ProfileMenuSection>

        <ProfileMenuSection title="Family members">
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
        </ProfileMenuSection>

        <ProfileMenuSection title="Session">
          <ProfileMenuRow
            label="Log out"
            subtitle={isLoading ? 'Signing you out...' : 'End the current session on this device'}
            destructive
            onPress={() => {
              void signOut();
            }}
          />
        </ProfileMenuSection>

        <View className="mt-6 px-1">
          <Typography variant="caption" className="text-gray-400">
            Keep your preferences up to date so product analysis stays relevant.
          </Typography>
        </View>
      </View>
    </ScrollView>
  );
}
