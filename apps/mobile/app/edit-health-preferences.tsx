import { PreferencesField } from '../modules/onboarding/components/OnboardingFields';
import { HealthPreferenceEditorScreen } from '../modules/profile/components/HealthPreferenceEditorScreen';

export default function EditHealthPreferencesRoute() {
  return (
    <HealthPreferenceEditorScreen
      title="Preferences"
      description="Set the softer ranking preferences used to personalize recommendations."
    >
      <PreferencesField />
    </HealthPreferenceEditorScreen>
  );
}
