import type { ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { useOnboardingQuery } from '../../api/onboardingQueries';
import { OnboardingStateScreen } from '../OnboardingStateScreen';
import { useAuthStore } from '../../../../shared/stores/authStore';

interface OnboardingGateProps {
  children: ReactNode;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const { user, isInitialized } = useAuthStore();
  const onboardingQuery = useOnboardingQuery(user?.id);

  if (!isInitialized) {
    return (
      <OnboardingStateScreen
        loading
        title="Checking your session"
        description="Hang tight while we get things ready."
      />
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (onboardingQuery.isLoading) {
    return (
      <OnboardingStateScreen
        loading
        title="Preparing your account"
        description="We’re checking whether onboarding is already complete."
      />
    );
  }

  if (onboardingQuery.isError) {
    return (
      <OnboardingStateScreen
        title="Couldn't load onboarding"
        description="Check your connection and try again."
        actionLabel="Retry"
        onAction={() => {
          void onboardingQuery.refetch();
        }}
      />
    );
  }

  if (!onboardingQuery.data) {
    return (
      <OnboardingStateScreen
        loading
        title="Preparing your account"
        description="We’re checking whether onboarding is already complete."
      />
    );
  }

  if (!onboardingQuery.data.onboardingCompleted) {
    return <Redirect href="/" />;
  }

  return <>{children}</>;
}
