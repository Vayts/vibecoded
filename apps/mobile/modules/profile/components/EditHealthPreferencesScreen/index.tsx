import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Typography } from '../../../../shared/components/Typography';
import {
  ALLERGY_LABELS,
  MAIN_GOAL_LABELS,
  NUTRITION_PRIORITY_LABELS,
  RESTRICTION_LABELS,
} from '../../../onboarding/components/options';
import { useOnboardingQuery } from '../../../onboarding/api/onboardingQueries';
import {} from '../../../onboarding/components/OnboardingFields';
import { OnboardingStateScreen } from '../../../onboarding/components/OnboardingStateScreen';
import { ScreenSpinner } from '../../../../shared/components/ScreenSpinner';
import { useAuthStore } from '../../../../shared/stores/authStore';
import { ProfileMenuRow } from '../ProfileMenuRow';
import { ProfileMenuSection } from '../ProfileMenuSection';

const summarizeList = (values: string[], labels: Record<string, string>, emptyLabel: string) => {
  if (values.length === 0) {
    return emptyLabel;
  }

  return values.map((value) => labels[value] ?? value).join(', ');
};

export function EditHealthPreferencesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const onboardingQuery = useOnboardingQuery(user?.id);

  if (onboardingQuery.isLoading || !onboardingQuery.data) {
    return <ScreenSpinner />;
  }

  if (onboardingQuery.isError) {
    return (
      <OnboardingStateScreen
        title="Couldn't load health profile"
        description="Check your connection and try again."
        actionLabel="Retry"
        onAction={() => {
          void onboardingQuery.refetch();
        }}
      />
    );
  }

  const onboarding = onboardingQuery.data;
  const restrictionsSummary = summarizeList(
    onboarding.restrictions,
    RESTRICTION_LABELS,
    'No hard restrictions selected',
  );
  const allergiesSummary = summarizeList(
    onboarding.allergies,
    ALLERGY_LABELS,
    'No allergies selected',
  );
  const preferencesSummary = summarizeList(
    onboarding.nutritionPriorities,
    NUTRITION_PRIORITY_LABELS,
    'No specific preferences selected',
  );

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{
        paddingBottom: insets.bottom + 124,
        paddingHorizontal: 16,
      }}
    >
      <View>
        <View className="mt-2">
          <Typography variant="pageTitle">Health profile</Typography>
          <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
            Choose what you want to edit. Each section opens as its own focused screen.
          </Typography>
        </View>

        <View className="mt-2">
          <ProfileMenuSection title="Edit health profile">
            <ProfileMenuRow
              label="Main goal"
              subtitle={
                onboarding.mainGoal
                  ? MAIN_GOAL_LABELS[onboarding.mainGoal]
                  : 'Choose your primary goal'
              }
              onPress={() => {
                router.push('/(tabs)/profile/edit-health-main-goal');
              }}
            />
            <ProfileMenuRow
              label="Restrictions"
              subtitle={restrictionsSummary}
              onPress={() => {
                router.push('/(tabs)/profile/edit-health-restrictions');
              }}
            />
            <ProfileMenuRow
              label="Allergies"
              subtitle={allergiesSummary}
              onPress={() => {
                router.push('/(tabs)/profile/edit-health-allergies');
              }}
            />
            <ProfileMenuRow
              label="Preferences"
              subtitle={preferencesSummary}
              onPress={() => {
                router.push('/(tabs)/profile/edit-health-preferences');
              }}
            />
          </ProfileMenuSection>

          <View className="mt-6 px-1">
            <Typography variant="caption" className="text-gray-400">
              Changes are saved inside each section after you finish editing it.
            </Typography>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
