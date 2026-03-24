import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { useOnboardingStore } from '../../stores/onboarding/store';
import { selectOnboardingDraft } from '../../stores/onboarding/selectors';
import { RESTRICTION_OPTIONS } from '../options';
import { SelectableChip } from '../SelectableChip';

export function RestrictionsStep() {
  const draft = useOnboardingStore(selectOnboardingDraft);
  const toggleRestriction = useOnboardingStore((state) => state.toggleRestriction);

  return (
    <View>
      <Typography variant="pageTitle">Any dealbreakers?</Typography>
      <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
        These are hard constraints. We will exclude anything that violates them.
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
