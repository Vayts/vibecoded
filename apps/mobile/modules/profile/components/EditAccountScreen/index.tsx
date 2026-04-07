import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Keyboard, Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Button } from '../../../../shared/components/Button';
import { Input } from '../../../../shared/components/Input';
import { Typography } from '../../../../shared/components/Typography';
import { useAuthStore } from '../../../../shared/stores/authStore';
import { useUpdateProfileName } from '../../hooks/useUpdateProfileName';

export function EditAccountScreen() {
  const router = useRouter();
  const mutation = useUpdateProfileName();
  const { setUser, user } = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required');
      return;
    }

    setError(null);

    try {
      const updatedUser = await mutation.mutateAsync(trimmedName);
      setUser(updatedUser);
      router.back();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update profile');
    }
  };

  return (
    <View className="flex-1 bg-white">
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
              Update the name shown across your account.
            </Typography>
          </View>

          <View className="mt-8 gap-5">
            <Input
              label="Display name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              error={error ?? undefined}
            />

            <Input label="Email" value={user?.email ?? ''} editable={false} />
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
