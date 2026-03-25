import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { selectOnboardingDraft } from '../../stores/onboarding/selectors';
import { useOnboardingStore } from '../../stores/onboarding/store';
import {
  ALLERGY_LABELS,
  MAIN_GOAL_LABELS,
  NUTRITION_PRIORITY_LABELS,
  RESTRICTION_LABELS,
} from '../options';

const SummaryCard = ({ title, value }: { title: string; value: string }) => (
  <View className="rounded-xl bg-gray-50 px-4 py-4">
    <Typography variant="fieldLabel">{title}</Typography>
    <Typography variant="body" className="mt-2 font-semibold text-gray-900">
      {value}
    </Typography>
  </View>
);

export function OnboardingReviewStep() {
  const draft = useOnboardingStore(selectOnboardingDraft);
  const restrictionsSummary = draft.restrictions.length
    ? draft.restrictions.map((restriction) => RESTRICTION_LABELS[restriction]).join(', ')
    : 'No hard restrictions selected';
  const allergySummary = draft.allergies.length
    ? draft.allergies.map((allergy) => ALLERGY_LABELS[allergy]).join(', ')
    : 'No allergies selected';
  const prioritySummary = draft.nutritionPriorities.length
    ? draft.nutritionPriorities.map((priority) => NUTRITION_PRIORITY_LABELS[priority]).join(', ')
    : 'No specific priorities';
  const macroSummary = [
    draft.calorieGoal ? `${draft.calorieGoal} cal` : null,
    draft.proteinGoal ? `${draft.proteinGoal}g protein` : null,
    draft.carbGoal ? `${draft.carbGoal}g carbs` : null,
    draft.fatGoal ? `${draft.fatGoal}g fat` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <View>
      <Typography variant="pageTitle">You're all set</Typography>
      <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
        Take one last look. We’ll save everything together when you finish.
      </Typography>

      <View className="mt-6 gap-3">
        <SummaryCard
          title="Main goal"
          value={draft.mainGoal ? MAIN_GOAL_LABELS[draft.mainGoal] : 'Not selected'}
        />
        <SummaryCard title="Restrictions" value={restrictionsSummary} />
        <SummaryCard title="Allergies" value={allergySummary} />
        {draft.allergies.includes('OTHER') && draft.otherAllergiesText.trim() ? (
          <SummaryCard title="Other details" value={draft.otherAllergiesText.trim()} />
        ) : null}
        <SummaryCard title="Preferences" value={prioritySummary} />
        <SummaryCard title="Macro targets" value={macroSummary || 'No macro targets added'} />
      </View>
    </View>
  );
}
