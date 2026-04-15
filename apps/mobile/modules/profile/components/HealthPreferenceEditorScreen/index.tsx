import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Keyboard, Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../../../shared/components/Button';
import { ScreenHeader } from '../../../../shared/components/ScreenHeader';
import { ScreenSpinner } from '../../../../shared/components/ScreenSpinner';
import {
  DEFAULT_STICKY_FOOTER_HEIGHT,
  StickyFooter,
} from '../../../../shared/components/StickyFooter';
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
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const onboardingQuery = useOnboardingQuery(user?.id);
  const hydrateFromServer = useOnboardingStore((state) => state.hydrateFromServer);
  const draft = useOnboardingStore((state) => state.draft);
  const submitMutation = useSubmitOnboardingMutation();
  const [footerHeight, setFooterHeight] = useState(DEFAULT_STICKY_FOOTER_HEIGHT);
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
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => <ScreenHeader />,
        }}
      />

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingBottom: footerHeight + 16,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable className="flex-1" onPress={Keyboard.dismiss}>
          <View className="mt-2">
            <Typography variant="pageTitle">{title}</Typography>
            <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
              {description}
            </Typography>
          </View>

          <View className="mt-2 rounded-2xl border-gray-100 bg-white">
            {children}
          </View>
        </Pressable>

        <View className="flex-1" />
      </KeyboardAwareScrollView>

      <StickyFooter
        bottomInset={insets.bottom}
        errorMessage={submitMessage}
        onLayoutHeight={setFooterHeight}
      >
        <View className="pb-0">
          <Button
            fullWidth
            label="Save changes"
            loading={submitMutation.isPending}
            onPress={() => {
              void handleSave();
            }}
          />
        </View>
      </StickyFooter>
    </View>
  );
}
