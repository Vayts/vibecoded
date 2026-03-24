import { View } from 'react-native';
import { Input } from '../../../../shared/components/Input';
import { Typography } from '../../../../shared/components/Typography';
import { useOnboardingStore } from '../../stores/onboarding/store';
import { selectOnboardingDraft } from '../../stores/onboarding/selectors';
import { ALLERGY_OPTIONS } from '../options';
import { SelectableChip } from '../SelectableChip';

export function AllergiesStep() {
  const draft = useOnboardingStore(selectOnboardingDraft);
  const toggleAllergy = useOnboardingStore((state) => state.toggleAllergy);
  const setOtherAllergiesText = useOnboardingStore((state) => state.setOtherAllergiesText);
  const hasOther = draft.allergies.includes('OTHER');

  return (
    <View>
      <Typography variant="pageTitle">Any allergies or intolerances?</Typography>
      <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
        Add any ingredients you want us to avoid. Leave this blank if there are no restrictions.
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

      {hasOther ? (
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
