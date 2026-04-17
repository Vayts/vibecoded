import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Pressable, View } from 'react-native';
import type { CreateFamilyMemberRequest, FamilyMember } from '@acme/shared';

import { Button } from '../../../../shared/components/Button';
import {
  useFamilyMemberFormStore,
  isNameStepValid,
  FAMILY_MEMBER_STEP_COUNT,
} from '../../stores/familyMemberFormStore';
import { FamilyMemberStepContent } from './steps';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DEFAULT_STICKY_FOOTER_HEIGHT,
  FamilyMemberStickyFooter,
} from '../FamilyMemberStickyFooter';
import { ScrollView } from 'react-native-gesture-handler';
import { FamilyMemberFormHeader } from './FamilyMemberFormHeader';

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
  const hydrateFromMember = useFamilyMemberFormStore((s) => s.hydrateFromMember);
  const reset = useFamilyMemberFormStore((s) => s.reset);
  const toPayload = useFamilyMemberFormStore((s) => s.toPayload);
  const scrollViewRef = useRef<ScrollView>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [footerHeight, setFooterHeight] = useState(DEFAULT_STICKY_FOOTER_HEIGHT);
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
  const canContinue =
    step === 0 ? isNameStepValid(draft) : isAvatarStep ? Boolean(draft.avatarUrl) : true;

  const handleContinue = () => {
    if (step === 0) {
      Keyboard.dismiss();

      setTimeout(() => {
        setErrorMessage(null);
        nextStep();
      }, 220);
    } else {
      setErrorMessage(null);
      nextStep();
    }
  };

  const handleSkipAvatarStep = () => {
    setErrorMessage(null);
    nextStep();
  };

  const handleSubmit = async () => {
    if (!isNameStepValid(draft)) {
      setErrorMessage('Please enter a name up to 30 characters.');
      return;
    }
    setErrorMessage(null);
    try {
      await onSubmit(toPayload());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
    }
  };

  const footerActions = isLastStep ? (
    <View className="gap-3">
      <Button
        fullWidth
        label={submitLabel}
        loading={isSubmitting}
        onPress={() => {
          void handleSubmit();
        }}
      />

      {step > 0 ? (
        <Button
          fullWidth
          label="Skip and finish"
          onPress={() => {
            void handleSubmit();
          }}
          variant="secondary"
        />
      ) : null}
    </View>
  ) : isAvatarStep ? (
    <View className="gap-3">
      <Button fullWidth disabled={!canContinue} label="Continue" onPress={handleContinue} />

      <Button
        fullWidth
        label="Skip for now"
        onPress={handleSkipAvatarStep}
        variant="secondary"
        disabled={draft.avatarUrl !== null}
      />
    </View>
  ) : (
    <View className="gap-3">
      <Button fullWidth disabled={!canContinue} label="Continue" onPress={handleContinue} />

      {step > 0 ? (
        <Button
          fullWidth
          label="Skip for now"
          onPress={canContinue ? handleContinue : undefined}
          variant="secondary"
        />
      ) : null}
    </View>
  );

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <FamilyMemberFormHeader step={step} />

      <View className="flex-1">
        <Pressable className="flex-1" onPress={Keyboard.dismiss}>
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
            <View className="flex-1 px-4">
              <FamilyMemberStepContent step={step} />
            </View>
          </KeyboardAwareScrollView>
        </Pressable>

        <FamilyMemberStickyFooter
          bottomInset={insets.bottom}
          errorMessage={errorMessage}
          onLayoutHeight={(nextHeight) => {
            if (nextHeight !== footerHeight) {
              setFooterHeight(nextHeight);
            }
          }}
        >
          {footerActions}
        </FamilyMemberStickyFooter>
      </View>
    </KeyboardAvoidingView>
  );
}
