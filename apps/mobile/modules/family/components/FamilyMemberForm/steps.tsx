import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Pen } from 'lucide-react-native';

import { Input } from '../../../../shared/components/Input';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { selectAndUploadAvatarImage } from '../../../../shared/lib/avatar/selectAndUploadAvatarImage';
import { resolveStorageUri } from '../../../../shared/lib/storage/resolveStorageUri';
import {
  ALLERGY_OPTIONS,
  MAIN_GOAL_OPTIONS,
  NUTRITION_PRIORITY_OPTIONS,
  RESTRICTION_OPTIONS,
} from '../../../onboarding/components/options';
import { SelectableChip } from '../../../onboarding/components/SelectableChip';
import { useFamilyMemberFormStore } from '../../stores/familyMemberFormStore';

function NameStep() {
  const draft = useFamilyMemberFormStore((s) => s.draft);
  const setName = useFamilyMemberFormStore((s) => s.setName);

  return (
    <View>
      <Typography variant="pageTitle">What's their name?</Typography>
      <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
        Enter the name of the family member you'd like to track.
      </Typography>
      <View className="mt-6">
        <Input
          label="Name"
          placeholder="e.g. Alex"
          value={draft.name}
          onChangeText={setName}
          maxLength={50}
          autoFocus
        />
      </View>
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
      <Typography variant="pageTitle">Add a photo for {displayName}</Typography>
      <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
        Upload a photo that will appear as {possessiveName} profile picture in the app.
      </Typography>

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
              className="h-28 w-28 items-center justify-center overflow-hidden rounded-full"
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

        {draft.avatarUrl ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Remove family member photo"
            activeOpacity={0.7}
            className="mt-4"
            disabled={isUploadingAvatar}
            onPress={() => {
              setAvatarError(null);
              setAvatarUrl(null);
            }}
          >
            <Typography variant="buttonSmall" className="text-red-600">
              Remove photo
            </Typography>
          </TouchableOpacity>
        ) : null}

        {isUploadingAvatar ? (
          <Typography variant="bodySecondary" className="mt-4 text-center text-gray-500">
            Uploading photo...
          </Typography>
        ) : null}

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
  const draft = useFamilyMemberFormStore((s) => s.draft);
  const setMainGoal = useFamilyMemberFormStore((s) => s.setMainGoal);

  return (
    <View>
      <Typography variant="pageTitle">What is their main goal?</Typography>
      <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
        Pick the primary outcome to optimize for.
      </Typography>
      <View className="mt-6 gap-3">
        {MAIN_GOAL_OPTIONS.map((option) => (
          <SelectableChip
            key={option.value}
            label={option.label}
            description={option.description}
            selected={draft.mainGoal === option.value}
            onPress={() => setMainGoal(draft.mainGoal === option.value ? null : option.value)}
          />
        ))}
      </View>
    </View>
  );
}

function RestrictionsStep() {
  const draft = useFamilyMemberFormStore((s) => s.draft);
  const toggleRestriction = useFamilyMemberFormStore((s) => s.toggleRestriction);

  return (
    <View>
      <Typography variant="pageTitle">Any dealbreakers?</Typography>
      <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
        Hard constraints — we'll exclude anything that violates them.
      </Typography>
      <View className="mt-6 gap-3">
        {RESTRICTION_OPTIONS.map((option) => (
          <SelectableChip
            key={option.value}
            label={option.label}
            description={option.description}
            selected={draft.restrictions.includes(option.value)}
            onPress={() => toggleRestriction(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

function AllergiesStep() {
  const draft = useFamilyMemberFormStore((s) => s.draft);
  const toggleAllergy = useFamilyMemberFormStore((s) => s.toggleAllergy);
  const setOtherAllergiesText = useFamilyMemberFormStore((s) => s.setOtherAllergiesText);

  return (
    <View>
      <Typography variant="pageTitle">Any allergies or intolerances?</Typography>
      <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
        Add any ingredients to avoid. Skip if none.
      </Typography>
      <View className="mt-6 gap-3">
        {ALLERGY_OPTIONS.map((option) => (
          <SelectableChip
            key={option.value}
            label={option.label}
            selected={draft.allergies.includes(option.value)}
            onPress={() => toggleAllergy(option.value)}
          />
        ))}
      </View>
      {draft.allergies.includes('OTHER') ? (
        <View className="mt-5">
          <Input
            label="Other allergy details"
            maxLength={120}
            onChangeText={setOtherAllergiesText}
            placeholder="Tell us what to watch for"
            value={draft.otherAllergiesText}
          />
        </View>
      ) : null}
    </View>
  );
}

function NutritionPrioritiesStep() {
  const draft = useFamilyMemberFormStore((s) => s.draft);
  const toggleNutritionPriority = useFamilyMemberFormStore((s) => s.toggleNutritionPriority);

  return (
    <View>
      <Typography variant="pageTitle">What do they prefer?</Typography>
      <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
        Soft preferences that influence ranking but don't hard-exclude items.
      </Typography>
      <View className="mt-6 gap-3">
        {NUTRITION_PRIORITY_OPTIONS.map((option) => (
          <SelectableChip
            key={option.value}
            label={option.label}
            description={option.description}
            selected={draft.nutritionPriorities.includes(option.value)}
            onPress={() => toggleNutritionPriority(option.value)}
          />
        ))}
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
