import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Keyboard, Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { AvatarField } from '../../../../shared/components/AvatarField';
import { Button } from '../../../../shared/components/Button';
import { Input } from '../../../../shared/components/Input';
import { ScreenSpinner } from '../../../../shared/components/ScreenSpinner';
import { Typography } from '../../../../shared/components/Typography';
import { selectAndUploadAvatarImage } from '../../../../shared/lib/avatar/selectAndUploadAvatarImage';
import { useAuthStore } from '../../../../shared/stores/authStore';
import { useCurrentUserQuery } from '../../api/profileQueries';
import { useUpdateProfile } from '../../hooks/useUpdateProfile';

export function EditAccountScreen() {
  const router = useRouter();
  const { setUser, user: authUser } = useAuthStore();
  const currentUserQuery = useCurrentUserQuery(authUser?.id);
  const mutation = useUpdateProfile(authUser?.id);
  const user = currentUserQuery.data ?? authUser;
  const [name, setName] = useState(user?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    setName(user?.name ?? '');
    setAvatarUrl(user?.avatarUrl ?? null);
  }, [user?.avatarUrl, user?.name]);

  const handleChangeAvatar = async () => {
    setErrorMessage(null);
    setIsUploadingAvatar(true);

    try {
      const nextAvatarUrl = await selectAndUploadAvatarImage();

      if (nextAvatarUrl) {
        setAvatarUrl(nextAvatarUrl);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Name is required');
      return;
    }

    setNameError(null);
    setErrorMessage(null);

    try {
      const updatedUser = await mutation.mutateAsync({
        name: trimmedName,
        avatarUrl,
      });
      setUser(updatedUser);
      router.back();
    } catch (saveError) {
      setErrorMessage(saveError instanceof Error ? saveError.message : 'Unable to update profile');
    }
  };

  if (!user) {
    return <ScreenSpinner />;
  }

  return (
    <View className="flex-1 bg-background">
      <KeyboardAwareScrollView
        bottomOffset={60}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={Keyboard.dismiss}>
          <View className="mt-6">
            <Typography variant="pageTitle">Edit profile</Typography>
            <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
              Update the photo and name shown across your account.
            </Typography>
          </View>

          <View className="mt-8 gap-5">
            <AvatarField
              name={name || user.name}
              imageUrl={avatarUrl}
              fallbackImageUrl={user.image}
              isUploading={isUploadingAvatar}
              canRemove={Boolean(avatarUrl)}
              helperText="Used in your profile header and profile comparison chips."
              onChangePress={() => {
                void handleChangeAvatar();
              }}
              onRemovePress={() => {
                setErrorMessage(null);
                setAvatarUrl(null);
              }}
            />

            <Input
              label="Display name"
              value={name}
              onChangeText={(value) => {
                setName(value);
                if (nameError) {
                  setNameError(null);
                }
              }}
              placeholder="Your name"
              error={nameError ?? undefined}
            />

            <Input label="Email" value={user?.email ?? ''} editable={false} />

            {errorMessage ? (
              <Typography variant="bodySecondary" className="text-center text-red-500">
                {errorMessage}
              </Typography>
            ) : null}
          </View>
        </Pressable>

        <View className="mt-auto pt-6 pb-12">
          <Button
            fullWidth
            label="Save changes"
            loading={mutation.isPending}
            onPress={() => {
              void handleSave();
            }}
          />
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
