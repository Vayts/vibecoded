import { useState } from 'react';
import { View } from 'react-native';

import { AvatarField } from '../../../../shared/components/AvatarField';
import { Input } from '../../../../shared/components/Input';
import { Typography } from '../../../../shared/components/Typography';
import { selectAndUploadAvatarImage } from '../../../../shared/lib/avatar/selectAndUploadAvatarImage';
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
  const setAvatarUrl = useFamilyMemberFormStore((s) => s.setAvatarUrl);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

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
    <View>
      <Typography variant="pageTitle">What's their name?</Typography>
      <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
        Enter the name of the family member you'd like to track.
      </Typography>
      <View className="mt-6">
        <AvatarField
          name={draft.name}
          imageUrl={draft.avatarUrl}
          isUploading={isUploadingAvatar}
          canRemove={Boolean(draft.avatarUrl)}
          helperText="Optional. Helps you spot their profile faster in family lists and analysis."
          onChangePress={() => {
            void handleChangeAvatar();
          }}
          onRemovePress={() => {
            setAvatarError(null);
            setAvatarUrl(null);
          }}
        />

        {avatarError ? (
          <Typography variant="bodySecondary" className="mt-3 text-center text-red-500">
            {avatarError}
          </Typography>
        ) : null}
      </View>
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
      return <MainGoalStep />;
    case 2:
      return <RestrictionsStep />;
    case 3:
      return <AllergiesStep />;
    case 4:
      return <NutritionPrioritiesStep />;
    default:
      return <NutritionPrioritiesStep />;
  }
};
