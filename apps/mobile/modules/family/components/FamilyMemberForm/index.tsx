import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
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

const STEP_TITLES = ['Name', 'Main goal', 'Restrictions', 'Allergies', 'Nutrition priorities'];

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
  const canContinue = step === 0 ? isNameStepValid(draft) : true;

  const handleContinue = () => {
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

  const progress = `${((step + 1) / FAMILY_MEMBER_STEP_COUNT) * 100}%` as const;

  return (
    <View className="flex-1 bg-white">
      <Pressable className="flex-1" onPress={Keyboard.dismiss}>
        <KeyboardAwareScrollView
          bottomOffset={200}
          automaticallyAdjustContentInsets={false}
          automaticallyAdjustsScrollIndicatorInsets={false}
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 0 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
            <View className="flex-1 px-5 pb-8 pt-4">
              <View>
                <View className="mb-3 flex-row items-center justify-between">
                  <Typography variant="fieldLabel">
                    Step {step + 1} of {FAMILY_MEMBER_STEP_COUNT}
                  </Typography>
                  <Typography variant="caption" className="text-gray-500">
                    {STEP_TITLES[step]}
                  </Typography>
                </View>
                <View className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <View
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: progress }}
                  />
                </View>
              </View>

              <Animated.View
                key={step}
                entering={FadeInDown.duration(240)}
                className="mt-6 flex-1 rounded-xl border border-gray-100 bg-white px-5 py-6"
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
                ) : (
                  <Button
                    fullWidth
                    disabled={!canContinue}
                    label="Continue"
                    onPress={handleContinue}
                  />
                )}

                {step > 0 ? (
                  <Button fullWidth label="Back" onPress={prevStep} variant="ghost" />
                ) : null}
              </View>
            </View>
          </KeyboardAwareScrollView>
        </Pressable>
    </View>
  );
}
