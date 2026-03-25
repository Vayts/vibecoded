import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import { REVIEW_STEP_INDEX } from '../../stores/onboarding/types';
import {
  normalizeDraftToPayload,
  selectCurrentStepValid,
  selectOnboardingDraft,
  selectOnboardingStep,
} from '../../stores/onboarding/selectors';
import { useOnboardingStore } from '../../stores/onboarding/store';
import { OnboardingProgress } from '../OnboardingProgress';
import { MainGoalStep } from '../MainGoalStep';
import { RestrictionsStep } from '../RestrictionsStep';
import { AllergiesStep } from '../AllergiesStep';
import { PreferencesStep } from '../PreferencesStep';
import { OnboardingReviewStep } from '../OnboardingReviewStep';
import { useSubmitOnboardingMutation } from '../../hooks/useCompleteOnboarding';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const StepContent = ({ step }: { step: number }) => {
  switch (step) {
    case 0:
      return <MainGoalStep />;
    case 1:
      return <RestrictionsStep />;
    case 2:
      return <AllergiesStep />;
    case 3:
      return <PreferencesStep />;
    case 4:
      return <OnboardingReviewStep />;
    default:
      return <OnboardingReviewStep />;
  }
};

export function OnboardingFlow() {
  const router = useRouter();
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const step = useOnboardingStore(selectOnboardingStep);
  const draft = useOnboardingStore(selectOnboardingDraft);
  const isCurrentStepValid = useOnboardingStore(selectCurrentStepValid);
  const nextStep = useOnboardingStore((state) => state.nextStep);
  const prevStep = useOnboardingStore((state) => state.prevStep);
  const resetOnboardingDraft = useOnboardingStore((state) => state.resetOnboardingDraft);
  const submitMutation = useSubmitOnboardingMutation();
  const insets = useSafeAreaInsets();

  const handleContinue = () => {
    setSubmitMessage(null);
    nextStep();
  };

  const handleSubmit = async () => {
    setSubmitMessage(null);

    try {
      const payload = normalizeDraftToPayload(draft);
      await submitMutation.mutateAsync(payload);
      resetOnboardingDraft();
      router.replace('/(tabs)');
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : 'Unable to finish onboarding');
    }
  };

  const isReviewStep = step === REVIEW_STEP_INDEX;

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [step]);

  return (
    <View className="flex-1 bg-white">
      <View className="absolute -left-10 top-8 h-36 w-36 rounded-full bg-blue-50" />
      <View className="absolute right-0 top-24 h-24 w-24 rounded-full bg-gray-50" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          ref={scrollViewRef}
          automaticallyAdjustContentInsets={false}
          automaticallyAdjustsScrollIndicatorInsets={false}
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-5 pb-8 pt-4">
            <OnboardingProgress step={step} />

            <Animated.View
              key={step}
              entering={FadeInDown.duration(240)}
              className="mt-6 flex-1 rounded-xl border border-gray-100 bg-white px-5 py-6"
            >
              <StepContent step={step} />
            </Animated.View>

            {submitMessage ? (
              <Typography variant="bodySecondary" className="mt-4 text-center text-red-500">
                {submitMessage}
              </Typography>
            ) : null}

            <View className="mt-6 gap-3">
              {step > 0 ? (
                <Button fullWidth label="Back" onPress={prevStep} variant="ghost" />
              ) : null}

              {isReviewStep ? (
                <Button
                  fullWidth
                  label="Finish setup"
                  loading={submitMutation.isPending}
                  onPress={() => {
                    void handleSubmit();
                  }}
                />
              ) : (
                <Button
                  fullWidth
                  disabled={!isCurrentStepValid}
                  label="Continue"
                  onPress={handleContinue}
                />
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
