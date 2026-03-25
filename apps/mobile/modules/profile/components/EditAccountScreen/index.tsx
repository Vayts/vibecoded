import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../../../shared/components/Button';
import { Input } from '../../../../shared/components/Input';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { useAuthStore } from '../../../../shared/stores/authStore';
import { useUpdateProfileName } from '../../hooks/useUpdateProfileName';

export function EditAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <View
      className="flex-1 bg-white px-5"
      style={{ paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 8) }}
    >
      <TouchableOpacity
        accessibilityLabel="Go back"
        accessibilityRole="button"
        className="h-11 w-11 items-center justify-center rounded-full bg-gray-100"
        onPress={() => {
          router.back();
        }}
      >
        <ArrowLeft color={COLORS.gray900} size={20} />
      </TouchableOpacity>

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

      <View className="mt-auto pt-4" style={{ paddingBottom: insets.bottom }}>
        <Button
          fullWidth
          label="Save changes"
          loading={mutation.isPending}
          onPress={() => {
            void handleSave();
          }}
        />
      </View>
    </View>
  );
}
