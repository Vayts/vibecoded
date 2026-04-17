import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { ScrollView } from 'react-native-gesture-handler';
import { Button } from '../../../../shared/components/Button';
import {
  DEFAULT_STICKY_FOOTER_HEIGHT,
  StickyFooter,
} from '../../../../shared/components/StickyFooter';
import { ONBOARDING_STEP_COUNT } from '../../stores/onboarding/types';
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
    default:
      return <PreferencesStep />;
  }
};

const OnboardingFlowContent = ({ step }: { step: number }) => (
  <View className="flex-1 px-4 pb-4">
    <View className="mt-8">
      <StepContent step={step} />
    </View>
  </View>
);

export function OnboardingFlow() {
  const router = useRouter();
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [footerHeight, setFooterHeight] = useState(DEFAULT_STICKY_FOOTER_HEIGHT);
  const step = useOnboardingStore(selectOnboardingStep);
  const draft = useOnboardingStore(selectOnboardingDraft);
  const isCurrentStepValid = useOnboardingStore(selectCurrentStepValid);
  const nextStep = useOnboardingStore((state) => state.nextStep);
  const resetOnboardingDraft = useOnboardingStore((state) => state.resetOnboardingDraft);
  const submitMutation = useSubmitOnboardingMutation();
  const insets = useSafeAreaInsets();
  const isLastStep = step === ONBOARDING_STEP_COUNT - 1;

  const handleContinue = () => {
    Keyboard.dismiss();
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

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [step]);

  const footerActions = isLastStep ? (
    <View className="gap-3">
      <Button
        fullWidth
        label="Finish setup"
        loading={submitMutation.isPending}
        onPress={() => {
          void handleSubmit();
        }}
      />
      <Button
        fullWidth
        label="Skip and finish"
        variant="secondary"
        onPress={() => {
          void handleSubmit();
        }}
      />
    </View>
  ) : step > 0 ? (
    <View className="gap-3">
      <Button fullWidth label="Continue" onPress={handleContinue} />
      <Button fullWidth label="Skip for now" variant="secondary" onPress={handleContinue} />
    </View>
  ) : (
    <Button
      fullWidth
      disabled={!isCurrentStepValid}
      label="Continue"
      onPress={handleContinue}
    />
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
      style={{ paddingTop: insets.top }}
    >
      <>
        <Pressable className="flex-1" onPress={Keyboard.dismiss}>
          <View className="px-4">
            <OnboardingProgress step={step} />
          </View>
          <KeyboardAwareScrollView
            ref={scrollViewRef}
            automaticallyAdjustContentInsets={false}
            automaticallyAdjustsScrollIndicatorInsets={false}
            contentInsetAdjustmentBehavior="never"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: footerHeight + 16 }}
            keyboardShouldPersistTaps="handled"
            extraKeyboardSpace={-(insets.bottom + 30)}
            showsVerticalScrollIndicator={false}
          >
            <OnboardingFlowContent step={step} />
          </KeyboardAwareScrollView>
        </Pressable>

        <StickyFooter
          bottomInset={insets.bottom}
          errorMessage={submitMessage}
          onLayoutHeight={(nextHeight) => {
            if (nextHeight !== footerHeight) {
              setFooterHeight(nextHeight);
            }
          }}
        >
          {footerActions}
        </StickyFooter>
      </>
    </KeyboardAvoidingView>
  );
}
