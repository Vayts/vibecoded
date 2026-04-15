import { RestrictionsField } from '../modules/onboarding/components/OnboardingFields';
import { HealthPreferenceEditorScreen } from '../modules/profile/components/HealthPreferenceEditorScreen';

export default function EditHealthRestrictionsRoute() {
  return (
    <HealthPreferenceEditorScreen
      title="Restrictions"
      description="Set the hard constraints that product analysis should always respect."
    >
      <RestrictionsField />
    </HealthPreferenceEditorScreen>
  );
}
