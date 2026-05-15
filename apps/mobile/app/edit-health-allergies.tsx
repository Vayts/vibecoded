import { AllergiesField } from '../modules/onboarding/components/OnboardingFields';
import { useOnboardingStore } from '../modules/onboarding/stores/onboarding/store';
import { HealthPreferenceEditorScreen } from '../modules/profile/components/HealthPreferenceEditorScreen';
import { hasValidOtherAllergySelection } from '../shared/lib/validation/otherAllergy';

export default function EditHealthAllergiesRoute() {
  const draft = useOnboardingStore((state) => state.draft);

  return (
    <HealthPreferenceEditorScreen
      title="Allergies"
      description="List allergens and ingredients the app should avoid during analysis."
      isSaveDisabled={!hasValidOtherAllergySelection(draft)}
    >
      <AllergiesField />
    </HealthPreferenceEditorScreen>
  );
}
