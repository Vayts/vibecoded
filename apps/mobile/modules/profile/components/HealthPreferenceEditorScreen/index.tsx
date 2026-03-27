import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Keyboard, Pressable, ScrollView, View } from 'react-native';

import { Button } from '../../../../shared/components/Button';
import { ScreenSpinner } from '../../../../shared/components/ScreenSpinner';
import { Typography } from '../../../../shared/components/Typography';
import { useAuthStore } from '../../../../shared/stores/authStore';
import { useOnboardingQuery } from '../../../onboarding/api/onboardingQueries';
import { OnboardingStateScreen } from '../../../onboarding/components/OnboardingStateScreen';
import { useSubmitOnboardingMutation } from '../../../onboarding/hooks/useCompleteOnboarding';
import { normalizeDraftToPayload } from '../../../onboarding/stores/onboarding/selectors';
import { useOnboardingStore } from '../../../onboarding/stores/onboarding/store';

interface HealthPreferenceEditorScreenProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function HealthPreferenceEditorScreen({
  title,
  description,
  children,
}: HealthPreferenceEditorScreenProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const onboardingQuery = useOnboardingQuery(user?.id);
  const hydrateFromServer = useOnboardingStore((state) => state.hydrateFromServer);
  const draft = useOnboardingStore((state) => state.draft);
  const submitMutation = useSubmitOnboardingMutation();
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  useEffect(() => {
    if (onboardingQuery.data) {
      hydrateFromServer(onboardingQuery.data);
    }
  }, [hydrateFromServer, onboardingQuery.data]);

  const handleSave = async () => {
    setSubmitMessage(null);

    try { 
      await submitMutation.mutateAsync(normalizeDraftToPayload(draft));
      router.back();
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : 'Unable to update health profile');
    }
  };

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

  return (
    <View className="flex-1 bg-white">
      <Pressable className="flex-1" onPress={Keyboard.dismiss}>
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          paddingBottom: 30,
          paddingHorizontal: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mt-2">
          <Typography variant="pageTitle">{title}</Typography>
          <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
            {description}
          </Typography>
        </View>

        <View className="mt-6 rounded-2xl border border-gray-100 bg-white px-4 py-5">
          {children}
        </View>

        {submitMessage ? (
          <Typography variant="bodySecondary" className="mt-4 text-center text-red-500">
            {submitMessage}
          </Typography>
        ) : null}
      </ScrollView>
      </Pressable>

      <View className="border-t border-gray-100 px-4 pt-3 pb-8">
        <Button
          fullWidth
          label="Save changes"
          loading={submitMutation.isPending}
          onPress={() => {
            void handleSave();
          }}
        />
      </View>
    </View>
  );
}
