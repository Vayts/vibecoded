import { MAX_USER_NAME_LENGTH, USER_NAME_MAX_LENGTH_MESSAGE } from '@acme/shared';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { useAuthStore } from '../../../../shared/stores/authStore';
import { useCurrentUserQuery } from '../../api/profileQueries';
import { type UpdateProfilePayload } from '../../api/profileMutations';
import { useUpdateProfile } from '../../hooks/useUpdateProfile';
import { EditAccountAvatarSection } from './EditAccountAvatarSection';
import { EditAccountField } from './EditAccountField';
import { useEditAccountAvatar } from './useEditAccountAvatar';

const UPDATE_PROFILE_ERROR_MESSAGE = 'Unable to update profile';

export function EditAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const authUser = useAuthStore((state) => state.user);
  const currentUserQuery = useCurrentUserQuery(authUser?.id);
  const updateProfileMutation = useUpdateProfile(authUser?.id);
  const user = currentUserQuery.data ?? authUser;
  const [name, setName] = useState(user?.name ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [footerHeight, setFooterHeight] = useState(DEFAULT_STICKY_FOOTER_HEIGHT);

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  const currentName = user?.name ?? '';

  const persistProfileUpdate = async (
    payload: UpdateProfilePayload,
  ): Promise<boolean> => {
    setErrorMessage(null);

    try {
      await updateProfileMutation.mutateAsync(payload);
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : UPDATE_PROFILE_ERROR_MESSAGE,
      );
      return false;
    }
  };

  const {
    closeAvatarMenu,
    currentAvatarUrl,
    fallbackImageUrl,
    handleAvatarDelete,
    handleAvatarSelection,
    isAvatarActionPending,
    isAvatarMenuOpen,
    toggleAvatarMenu,
  } = useEditAccountAvatar({ user, persistProfileUpdate, setErrorMessage });
  const isBusy = updateProfileMutation.isPending || isAvatarActionPending;
  const isNameChanged = name.trim() !== currentName.trim();

  const handleSave = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setNameError('Name is required');
      return;
    }

    if (trimmedName.length > MAX_USER_NAME_LENGTH) {
      setNameError(USER_NAME_MAX_LENGTH_MESSAGE);
      return;
    }

    setNameError(null);

    if (!isNameChanged) {
      router.back();
      return;
    }

    const didUpdate = await persistProfileUpdate({ name: trimmedName });

    if (didUpdate) {
      router.back();
    }
  };

  if (!user) {
    return <ScreenSpinner />;
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => <ScreenHeader title="Edit profile" centerTitle />,
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
          <Pressable
            className="flex-1"
            style={{ flex: 1 }}
            onPress={() => {
              Keyboard.dismiss();

              if (isAvatarMenuOpen) {
                closeAvatarMenu();
              }
            }}
          >
            <EditAccountAvatarSection
              currentAvatarUrl={currentAvatarUrl}
              fallbackImageUrl={fallbackImageUrl}
              isBusy={isBusy}
              isMenuOpen={isAvatarMenuOpen}
              name={name}
              user={user}
              onDelete={handleAvatarDelete}
              onSelect={handleAvatarSelection}
              onToggleMenu={toggleAvatarMenu}
            />

            <View className="mt-4">
              <EditAccountField
                label="Name"
                value={name}
                error={nameError}
                maxLength={MAX_USER_NAME_LENGTH}
                onChangeText={(value) => {
                  setName(value);

                  if (nameError) {
                    setNameError(null);
                  }
                }}
              />

              <EditAccountField label="Email" value={user.email ?? ''} editable={false} />
            </View>
          </Pressable>
        </KeyboardAwareScrollView>

        <StickyFooter
          bottomInset={insets.bottom}
          errorMessage={errorMessage}
          onLayoutHeight={(nextHeight) => {
            if (nextHeight !== footerHeight) {
              setFooterHeight(nextHeight);
            }
          }}
        >
          <Button
            fullWidth
            label="Save changes"
            disabled={!isNameChanged}
            loading={isBusy}
            onPress={() => {
              void handleSave();
            }}
          />
        </StickyFooter>
      </View>
    </View>
  );
}
