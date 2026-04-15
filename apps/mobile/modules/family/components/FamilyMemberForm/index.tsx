import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { CreateFamilyMemberRequest, FamilyMember } from '@acme/shared';

import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import {
  useFamilyMemberFormStore,
  isNameStepValid,
  FAMILY_MEMBER_STEP_COUNT,
} from '../../stores/familyMemberFormStore';
import { FamilyMemberStepContent } from './steps';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FamilyMemberFormProps {
  initialData?: FamilyMember;
  onSubmit: (data: CreateFamilyMemberRequest) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
}

export function FamilyMemberForm({
  initialData,
  onSubmit,
  isSubmitting,
  submitLabel,
}: FamilyMemberFormProps) {
  const step = useFamilyMemberFormStore((s) => s.step);
  const draft = useFamilyMemberFormStore((s) => s.draft);
  const nextStep = useFamilyMemberFormStore((s) => s.nextStep);
  const prevStep = useFamilyMemberFormStore((s) => s.prevStep);
  const hydrateFromMember = useFamilyMemberFormStore((s) => s.hydrateFromMember);
  const reset = useFamilyMemberFormStore((s) => s.reset);
  const toPayload = useFamilyMemberFormStore((s) => s.toPayload);
  const scrollViewRef = useRef<ScrollView>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (initialData) {
      hydrateFromMember(initialData);
    } else {
      reset();
    }
    return () => {
      reset();
    };
  }, [initialData, hydrateFromMember, reset]);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    });
    return () => cancelAnimationFrame(frameId);
  }, [step]);

  const isLastStep = step === FAMILY_MEMBER_STEP_COUNT - 1;
  const isAvatarStep = step === 1;
  const canContinue = step === 0 ? isNameStepValid(draft) : isAvatarStep ? Boolean(draft.avatarUrl) : true;

  const handleContinue = () => {
    setErrorMessage(null);
    nextStep();
  };

  const handleSkipAvatarStep = () => {
    setErrorMessage(null);
    nextStep();
  };

  const handleSubmit = async () => {
    if (!isNameStepValid(draft)) {
      setErrorMessage('Please enter a name.');
      return;
    }
    setErrorMessage(null);
    try {
      await onSubmit(toPayload());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
    }
  };

  return (
    <View className="flex-1 bg-white" style={{paddingTop: insets.top}}>
      <Pressable className="flex-1" onPress={Keyboard.dismiss}>
        <KeyboardAwareScrollView
          bottomOffset={120}
          automaticallyAdjustContentInsets={false}
          automaticallyAdjustsScrollIndicatorInsets={false}
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 160 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
            <View className="flex-1 px-4">
              <Animated.View
                key={step}
                entering={FadeInDown.duration(240)}
                className="flex-1 rounded-xl border border-gray-100 bg-white px-5 py-6"
              >
                <FamilyMemberStepContent step={step} />
              </Animated.View>

              {errorMessage ? (
                <Typography variant="bodySecondary" className="mt-4 text-center text-red-500">
                  {errorMessage}
                </Typography>
              ) : null}

              <View className="mt-6 gap-1">
                {isLastStep ? (
                  <Button
                    fullWidth
                    label={submitLabel}
                    loading={isSubmitting}
                    onPress={() => {
                      void handleSubmit();
                    }}
                  />
                ) : isAvatarStep ? (
                  <>
                    <Button
                      fullWidth
                      disabled={!canContinue}
                      label="Continue"
                      onPress={handleContinue}
                    />

                    {!draft.avatarUrl ? (
                      <Button
                        fullWidth
                        label="Skip for now"
                        onPress={handleSkipAvatarStep}
                        variant="secondary"
                      />
                    ) : null}
                  </>
                ) : (
                  <Button
                    fullWidth
                    disabled={!canContinue}
                    label="Continue"
                    onPress={handleContinue}
                  />
                )}

                {step > 0 && !isAvatarStep ? (
                  <Button fullWidth label="Back" onPress={prevStep} variant="ghost" />
                ) : null}
              </View>
            </View>
          </KeyboardAwareScrollView>
        </Pressable>
    </View>
  );
}
