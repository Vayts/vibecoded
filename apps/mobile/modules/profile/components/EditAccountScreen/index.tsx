import { Stack, useRouter } from 'expo-router';
import { Pen } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  Pressable,
  TouchableOpacity,
  View,
} from 'react-native';
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
import { UserAvatar } from '../../../../shared/components/UserAvatar';
import { COLORS } from '../../../../shared/constants/colors';
import {
  getUserFallbackAvatarImage,
  pickAndUploadAvatarImage,
  type AvatarImageSource,
} from '../../../../shared/lib/avatar/selectAndUploadAvatarImage';
import { useAuthStore } from '../../../../shared/stores/authStore';
import { useCurrentUserQuery } from '../../api/profileQueries';
import {
  type UpdateProfilePayload,
} from '../../api/profileMutations';
import { useUpdateProfile } from '../../hooks/useUpdateProfile';
import { EditAvatarOptionsMenu } from './EditAvatarOptionsMenu';
import { EditAccountField } from './EditAccountField';

const UPDATE_PROFILE_ERROR_MESSAGE = 'Unable to update profile';
const UPLOAD_AVATAR_ERROR_MESSAGE = 'Unable to upload avatar';

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
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isAvatarActionPending, setIsAvatarActionPending] = useState(false);
  const [footerHeight, setFooterHeight] = useState(DEFAULT_STICKY_FOOTER_HEIGHT);

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  const currentName = user?.name ?? '';
  const currentAvatarUrl = user?.avatarUrl ?? null;
  const fallbackImageUrl = getUserFallbackAvatarImage(user);
  const isBusy = updateProfileMutation.isPending || isAvatarActionPending;
  const isNameChanged = name.trim() !== currentName.trim();

  const closeAvatarMenu = () => {
    setIsAvatarMenuOpen(false);
  };

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

  const handleAvatarSelection = async (source: AvatarImageSource) => {
    closeAvatarMenu();
    setErrorMessage(null);
    setIsAvatarActionPending(true);

    try {
      const nextAvatarUrl = await pickAndUploadAvatarImage(source);

      if (!nextAvatarUrl) {
        return;
      }

      await persistProfileUpdate({ avatarUrl: nextAvatarUrl });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : UPLOAD_AVATAR_ERROR_MESSAGE,
      );
    } finally {
      setIsAvatarActionPending(false);
    }
  };

  const handleAvatarDelete = async () => {
    closeAvatarMenu();
    setIsAvatarActionPending(true);

    try {
      await persistProfileUpdate({ avatarUrl: null });
    } finally {
      setIsAvatarActionPending(false);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setNameError('Name is required');
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
            <View className="items-center pt-0" style={{ zIndex: isAvatarMenuOpen ? 20 : 1 }}>
              <View className="relative items-center">
                <TouchableOpacity
                  activeOpacity={0.9}
                  accessibilityRole="button"
                  accessibilityLabel="Edit profile photo"
                  disabled={isBusy}
                  onPress={() => {
                    setIsAvatarMenuOpen((current) => !current);
                  }}
                >
                  <UserAvatar
                    imageUrl={currentAvatarUrl}
                    fallbackImageUrl={fallbackImageUrl}
                    name={name || user.name}
                    size="xl"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Open profile photo options"
                  className="absolute -bottom-0.5 right-0 h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: COLORS.primary }}
                  disabled={isBusy}
                  onPress={() => {
                    setIsAvatarMenuOpen((current) => !current);
                  }}
                >
                  <Pen color={COLORS.white} size={16} strokeWidth={2.2} />
                </TouchableOpacity>

                {isAvatarMenuOpen ? (
                  <EditAvatarOptionsMenu
                    canDelete={Boolean(currentAvatarUrl || fallbackImageUrl)}
                    onDelete={() => {
                      void handleAvatarDelete();
                    }}
                    onSelectCamera={() => {
                      void handleAvatarSelection('camera');
                    }}
                    onSelectGallery={() => {
                      void handleAvatarSelection('gallery');
                    }}
                  />
                ) : null}
              </View>
            </View>

            <View className="mt-4">
              <EditAccountField
                label="Name"
                value={name}
                error={nameError}
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
