import { useEffect, useRef } from 'react';
import { Redirect } from 'expo-router';
import { useOnboardingQuery } from '../modules/onboarding/api/onboardingQueries';
import { OnboardingFlow } from '../modules/onboarding/components/OnboardingFlow';
import { OnboardingStateScreen } from '../modules/onboarding/components/OnboardingStateScreen';
import { useOnboardingStore } from '../modules/onboarding/stores/onboarding/store';
import { ScreenSpinner } from '../shared/components/ScreenSpinner';
import { useAuthStore } from '../shared/stores/authStore';

export default function Index() {
  const { user, isInitialized } = useAuthStore();
  const onboardingQuery = useOnboardingQuery(user?.id);
  const resetOnboardingDraft = useOnboardingStore((state) => state.resetOnboardingDraft);
  const hydrateFromServer = useOnboardingStore((state) => state.hydrateFromServer);
  const hydratedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      hydratedUserId.current = null;
      resetOnboardingDraft();
      return;
    }

    if (hydratedUserId.current && hydratedUserId.current !== user.id) {
      hydratedUserId.current = null;
      resetOnboardingDraft();
    }
  }, [resetOnboardingDraft, user]);

  useEffect(() => {
    if (!user || !onboardingQuery.data || onboardingQuery.data.onboardingCompleted) {
      return;
    }

    if (hydratedUserId.current === user.id) {
      return;
    }

    hydrateFromServer(onboardingQuery.data);
    hydratedUserId.current = user.id;
  }, [hydrateFromServer, onboardingQuery.data, user]);

  if (!isInitialized) {
    return <ScreenSpinner />;
  }

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (onboardingQuery.isLoading) {
    return <ScreenSpinner />;
  }

  if (onboardingQuery.isError) {
    return (
      <OnboardingStateScreen
        title="Couldn't load onboarding"
        description="Please try again. We need this step before the main app opens."
        actionLabel="Retry"
        onAction={() => {
          void onboardingQuery.refetch();
        }}
      />
    );
  }

  if (!onboardingQuery.data) {
    return <ScreenSpinner />;
  }

  if (onboardingQuery.data.onboardingCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  return <OnboardingFlow />;
}
