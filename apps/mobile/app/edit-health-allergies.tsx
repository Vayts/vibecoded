import { AllergiesField } from '../modules/onboarding/components/OnboardingFields';
import { HealthPreferenceEditorScreen } from '../modules/profile/components/HealthPreferenceEditorScreen';

export default function EditHealthAllergiesRoute() {
  return (
    <HealthPreferenceEditorScreen
      title="Allergies"
      description="List allergens and ingredients the app should avoid during analysis."
    >
      <AllergiesField />
    </HealthPreferenceEditorScreen>
  );
}
