import type { UpdateFamilyMemberRequest } from '@acme/shared';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../../../shared/components/Button';
import { ScreenHeader } from '../../../../shared/components/ScreenHeader';
import { ScreenSpinner } from '../../../../shared/components/ScreenSpinner';
import { Typography } from '../../../../shared/components/Typography';
import { useEditableFamilyMember } from '../../hooks/useEditableFamilyMember';
import { useUpdateFamilyMember } from '../../hooks/useFamilyMembers';
import { useFamilyMemberFormStore } from '../../stores/familyMemberFormStore';
import {
  DEFAULT_STICKY_FOOTER_HEIGHT,
  FamilyMemberStickyFooter,
} from '../FamilyMemberStickyFooter';

interface FamilyMemberHealthEditorScreenProps {
  buildPayload: () => UpdateFamilyMemberRequest;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function FamilyMemberHealthEditorScreen({
  buildPayload,
  title,
  description,
  children,
}: FamilyMemberHealthEditorScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { member, memberId, isLoading } = useEditableFamilyMember();
  const draft = useFamilyMemberFormStore((state) => state.draft);
  const setDraft = useFamilyMemberFormStore((state) => state.setDraft);
  const hydrateFromMember = useFamilyMemberFormStore((state) => state.hydrateFromMember);
  const updateMutation = useUpdateFamilyMember();
  const initialDraftRef = useRef(draft);
  const hasSubmittedRef = useRef(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [footerHeight, setFooterHeight] = useState(DEFAULT_STICKY_FOOTER_HEIGHT);

  useEffect(() => {
    initialDraftRef.current = draft;
  }, []);

  useEffect(() => {
    return () => {
      if (!hasSubmittedRef.current) {
        setDraft(initialDraftRef.current);
      }
    };
  }, [setDraft]);

  const handleSubmit = async () => {
    if (!memberId) {
      return;
    }

    setSubmitMessage(null);

    try {
      const updatedMember = await updateMutation.mutateAsync({
        id: memberId,
        data: buildPayload(),
      });
      hasSubmittedRef.current = true;
      hydrateFromMember(updatedMember);
      router.back();
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : 'Unable to update family member');
    }
  };

  if (isLoading) {
    return <ScreenSpinner />;
  }

  if (!member || !memberId) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Typography variant="sectionTitle" className="text-gray-900">
          Member not found
        </Typography>
        <Typography variant="bodySecondary" className="mt-2 text-center text-gray-500">
          This family member may have been removed.
        </Typography>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-white"
    >
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => <ScreenHeader />,
        }}
      />

      <View className="flex-1">
        <KeyboardAwareScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: footerHeight + 16,
            flexGrow: 1,
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

            <View className="mt-6 rounded-2xl border-gray-100 bg-white py-2">
              {children}
            </View>
          </Pressable>
        </KeyboardAwareScrollView>

        <FamilyMemberStickyFooter
          bottomInset={insets.bottom}
          errorMessage={submitMessage}
          onLayoutHeight={(nextHeight) => {
            if (nextHeight !== footerHeight) {
              setFooterHeight(nextHeight);
            }
          }}
        >
          <Button
            fullWidth
            label="Submit"
            loading={updateMutation.isPending}
            onPress={() => {
              void handleSubmit();
            }}
          />
        </FamilyMemberStickyFooter>
      </View>
    </View>
  );
}
