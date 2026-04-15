import { useEffect, useState } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Info, Pen } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';

import { TextField } from '../../../../shared/components/TextField';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { selectAndUploadAvatarImage } from '../../../../shared/lib/avatar/selectAndUploadAvatarImage';
import { resolveStorageUri } from '../../../../shared/lib/storage/resolveStorageUri';
import { useFamilyMemberFormStore } from '../../stores/familyMemberFormStore';
import {
  FamilyMemberAllergiesField,
  FamilyMemberMainGoalField,
  FamilyMemberPreferencesField,
  FamilyMemberRestrictionsField,
} from '../FamilyMemberHealthFields';

interface NameStepFormValues {
  name: string;
}

function NameStep() {
  const draft = useFamilyMemberFormStore((s) => s.draft);
  const setName = useFamilyMemberFormStore((s) => s.setName);
  const {
    control,
    setValue,
  } = useForm<NameStepFormValues>({
    defaultValues: {
      name: draft.name,
    },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    setValue('name', draft.name);
  }, [draft.name, setValue]);

  return (
    <View>
      <Text className="text-[26px] font-bold text-neutral-900">What's their name?</Text>
      <Text className="mt-3 text-[16px] text-gray-500">
        Enter the name of the family member you'd like to track.
      </Text>

      <Controller
        control={control}
        name="name"
        rules={{
          required: 'Name is required.',
          validate: (value) =>
            value.trim().length > 0 || 'Name is required.',
          maxLength: {
            value: 30,
            message: 'Name cannot be longer than 30 characters.',
          },
        }}
        render={({ field: { onBlur, onChange, value }, fieldState: { error, isTouched } }) => (
          <TextField
            containerClassName="mt-6"
            label="Name"
            placeholder="E.g. Alex"
            value={value}
            error={isTouched ? error?.message : undefined}
            maxLength={30}
            autoFocus
            onBlur={onBlur}
            onChangeText={(nextValue) => {
              onChange(nextValue);
              setName(nextValue);
            }}
          />
        )}
      />
    </View>
  );
}

function AvatarStep() {
  const draft = useFamilyMemberFormStore((s) => s.draft);
  const setAvatarUrl = useFamilyMemberFormStore((s) => s.setAvatarUrl);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const displayName = draft.name.trim() || 'them';
  const avatarUri = resolveStorageUri(draft.avatarUrl);
  const avatarInitial = displayName.charAt(0).toUpperCase() || '?';
  const possessiveName = displayName.endsWith('s') ? `${displayName}'` : `${displayName}'s`;

  const handleChangeAvatar = async () => {
    setAvatarError(null);
    setIsUploadingAvatar(true);

    try {
      const nextAvatarUrl = await selectAndUploadAvatarImage();

      if (nextAvatarUrl) {
        setAvatarUrl(nextAvatarUrl);
      }
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Unable to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <View className="flex-1">
      <Text className="text-[26px] font-bold text-neutral-900">Add a photo for {displayName}</Text>
      <Text className="mt-3 text-[16px] text-gray-500">
        Upload a photo that will appear as {possessiveName} profile picture in the app.
      </Text>

      <View className="flex-1 items-center justify-center pt-16 pb-6">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Choose family member photo"
          activeOpacity={0.85}
          disabled={isUploadingAvatar}
          onPress={() => {
            void handleChangeAvatar();
          }}
        >
          <View className="relative">
            <View
              className="h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-full"
              style={{ backgroundColor: COLORS.neutrals300 }}
            >
              {avatarUri ? (
                <ExpoImage
                  source={{ uri: avatarUri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              ) : (
                <Typography variant="hero" className="text-white">
                  {avatarInitial}
                </Typography>
              )}
            </View>

            <View
              className="absolute bottom-0 right-0 h-11 w-11 items-center justify-center rounded-full border-4 border-white"
              style={{ backgroundColor: COLORS.primary }}
            >
              <Pen color={COLORS.white} size={18} strokeWidth={2} />
            </View>
          </View>
        </TouchableOpacity>

        {avatarError ? (
          <Typography variant="bodySecondary" className="mt-4 text-center text-red-500">
            {avatarError}
          </Typography>
        ) : null}
      </View>
    </View>
  );
}

function MainGoalStep() {
  return (
    <View>
      <Text className="text-[26px] font-bold text-neutral-900">What is their main goal?</Text>
      <Text className="mt-3 text-[16px] text-gray-500">
         Pick the primary outcome to optimize for.
      </Text>
      <View className="mt-6">
        <FamilyMemberMainGoalField />
      </View>
    </View>
  );
}

function RestrictionsStep() {
  return (
    <View>
      <Text className="text-[26px] font-bold text-neutral-900">Any dealbreakers?</Text>
      <Text className="mt-3 text-[16px] text-gray-500">
        Hard constraints — we'll exclude anything that violates them.
      </Text>
      <View className="flex-row items-center gap-1 mt-4 text-primary-700">
        <Info size={16} color={COLORS.primary700}/>
        <Text className="text-primary-700 font-semibold">Select all that apply, or skip this step</Text>
      </View>
      <View className="mt-6">
        <FamilyMemberRestrictionsField />
      </View>
    </View>
  );
}

function AllergiesStep() {
  return (
    <View>
      <Text className="text-[26px] font-bold text-neutral-900">Any allergies or intolerances?</Text>
      <Text className="mt-3 text-[16px] text-gray-500">
        Add any ingredients to avoid. Skip if none.
      </Text>
      <View className="flex-row items-center gap-1 mt-4 text-primary-700">
        <Info size={16} color={COLORS.primary700}/>
        <Text className="text-primary-700 font-semibold">Select all that apply, or skip this step</Text>
      </View>
      <View className="mt-6">
        <FamilyMemberAllergiesField />
      </View>
    </View>
  );
}

function NutritionPrioritiesStep() {
  return (
    <View>
      <Text className="text-[26px] font-bold text-neutral-900">What do they prefer?</Text>
      <Text className="mt-3 text-[16px] text-gray-500">
        Soft preferences that influence ranking but don't hard-exclude items.
      </Text>
      <View className="flex-row items-center gap-1 mt-4 text-primary-700">
        <Info size={16} color={COLORS.primary700}/>
        <Text className="text-primary-700 font-semibold">Select all that apply, or skip this step</Text>
      </View>
      <View className="mt-6">
        <FamilyMemberPreferencesField />
      </View>
    </View>
  );
}

export const FamilyMemberStepContent = ({ step }: { step: number }) => {
  switch (step) {
    case 0:
      return <NameStep />;
    case 1:
      return <AvatarStep />;
    case 2:
      return <MainGoalStep />;
    case 3:
      return <RestrictionsStep />;
    case 4:
      return <AllergiesStep />;
    case 5:
      return <NutritionPrioritiesStep />;
    default:
      return <NutritionPrioritiesStep />;
  }
};
